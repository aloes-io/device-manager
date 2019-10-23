/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable global-require */
import aedes from 'aedes';
import axios from 'axios';
import http from 'http';
import net from 'net';
import ws from 'websocket-stream';
import dotenv from 'dotenv';
import nodeCleanup from 'node-cleanup';
import throttle from 'lodash.throttle';
import logger from './logger';
import envVariablesKeys from '../initial-data/variables-keys.json';
// import { version } from '../package.json';

// process.env.PUBSUB_API_VERSION = `v${version.substr(0,3)}`;

/**
 * @module Broker
 */
const broker = {};

/**
 * Aedes persistence layer
 * @method module:Broker~persistence
 * @param {object} config - Environment variables
 * @returns {function} aedesPersistenceRedis
 */
const persistence = config => {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    const aedesPersistence = require('aedes-persistence');
    return aedesPersistence();
  }
  const aedesPersistence = require('aedes-persistence-redis');
  return aedesPersistence({
    port: Number(config.REDIS_PORT),
    host: config.REDIS_HOST,
    // family: 4, // 4 (IPv4) or 6 (IPv6)
    db: config.REDIS_MQTT_PERSISTENCE,
    lazyConnect: true,
    password: config.REDIS_PASS,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxSessionDelivery: 100, //   maximum offline messages deliverable on client CONNECT, default is 1000
    packetTTL(packet) {
      //  offline message TTL ( in seconds )
      const ttl = 1 * 60 * 60;
      if (packet && packet.topic.search(/device/i) !== -1) {
        return ttl;
      }
      return ttl / 2;
    },
  });
};

/**
 * Aedes event emitter
 * @method module:Broker~emitter
 * @param {object} config - Environment variables
 * @returns {function} MQEmitterRedis
 */
const emitter = config => {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    const MQEmitter = require('mqemitter');
    return MQEmitter({
      concurrency: 100,
    });
  }
  const MQEmitter = require('mqemitter-redis');
  return MQEmitter({
    host: config.REDIS_HOST,
    port: Number(config.REDIS_PORT),
    db: config.REDIS_MQTT_EVENTS,
    password: config.REDIS_PASS,
    lazyConnect: true,
    concurrency: 100,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });
};

/**
 * Transform circular MQTT client in JSON
 * @method module:Broker~getClient
 * @param {object} client - MQTT client
 * @returns {object} client
 */
const getClient = client => {
  const clientProperties = [
    'id',
    'user',
    'devEui',
    'appId',
    'appEui',
    'aloesId',
    'ownerId',
    'model',
    'type',
  ];
  const clientObject = {};
  clientProperties.forEach(key => {
    if (client[key]) {
      clientObject[key] = client[key];
    }
    return key;
  });
  return clientObject;
};

/**
 * Find clients connected to the broker
 * @method module:Broker~getClients
 * @param {string} [id] - Client id
 * @returns {array|object}
 */
const getClients = id => {
  if (!broker.instance) return null;
  if (typeof id === 'string') {
    return broker.instance.clients[id];
  }
  return broker.instance.clients;
};

/**
 * Find in cache client ids subscribed to a specific topic pattern
 * @method module:Broker~getClientsByTopic
 * @param {string} topic - Topic pattern
 * @returns {promise}
 */
const getClientsByTopic = topic =>
  new Promise((resolve, reject) => {
    if (!broker.instance || !broker.instance.persistence) {
      reject(new Error('Invalid broker instance'));
    }
    const stream = broker.instance.persistence.getClientList(topic);
    const clients = [];
    stream
      .on('data', clientId => {
        try {
          logger.publish(5, 'broker', 'getClientsByTopic:res', { clientId });
          clients.push(clientId);
        } catch (error) {
          // reject(error);
        }
      })
      .on('end', () => {
        logger.publish(3, 'broker', 'getClientsByTopic:res', { clients });
        resolve(clients);
      })
      .on('error', e => {
        reject(e);
      });
  });

/**
 * Give an array of clientIds, find a connected client
 * @method module:Broker~pickRandomClient
 * @param {string[]} clientIds - MQTT client Ids
 * @returns {object} client
 */
const pickRandomClient = clientIds => {
  if (!clientIds || clientIds === null) return null;
  const connectedClients = clientIds
    .map(clientId => {
      const client = getClients(clientId);
      if (client) {
        // if (client && client.connected) {
        return clientId;
      }
      return null;
    })
    .filter(val => val !== null);
  logger.publish(4, 'broker', 'pickRandomClient:req', { clientIds: connectedClients });
  const clientId = connectedClients[Math.floor(Math.random() * connectedClients.length)];
  const client = getClients(clientId);
  logger.publish(3, 'broker', 'pickRandomClient:res', { clientId });
  return client;
};

const updateClientStatus = async (client, status) => {
  try {
    if (client && client.user) {
      const foundClient = getClient(client);
      logger.publish(4, 'broker', 'updateClientStatus:req', { client: foundClient, status });
      const aloesClientsIds = await getClientsByTopic(`aloes-${process.env.ALOES_ID}/sync`);
      if (!aloesClientsIds || aloesClientsIds === null) {
        throw new Error('No Aloes app client subscribed');
      }
      // if (client.aloesId) {
      //   if (!status) {
      //     await cleanSubscriptions(client);
      //   }
      // }
      if (!client.aloesId) {
        const aloesClient = pickRandomClient(aloesClientsIds);
        if (!aloesClient || aloesClient === null || !aloesClient.id) {
          throw new Error('No Aloes app client connected');
        }
        const packet = {
          topic: `${aloesClient.id}/status`,
          payload: Buffer.from(JSON.stringify({ status, client: foundClient })),
          retain: false,
          qos: 1,
        };
        broker.publish(packet);
      }
    }
    return client;
  } catch (error) {
    logger.publish(2, 'broker', 'updateClientStatus:er', error);
    return null;
  }
};

const delayedUpdateClientStatus = throttle(updateClientStatus, 100);

/**
 * HTTP request to Aloes to validate credentials
 * @method module:Broker~authentificationRequest
 * @param {object} data - Client instance
 * @returns {promise}
 */
const authentificationRequest = async data => {
  try {
    const baseUrl = `${process.env.HTTP_SERVER_URL}${process.env.REST_API_ROOT}`;
    // const baseUrl = `${process.env.HTTP_SERVER_URL}${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}`;
    const res = await axios.post(`${baseUrl}/auth/mqtt`, data, {
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
    });
    if (res && res.data) {
      logger.publish(4, 'broker', 'authentificationRequest:res', res.data);
      return res.data;
    }
    return null;
  } catch (error) {
    logger.publish(2, 'broker', 'authentificationRequest:err', error);
    throw error;
  }
};

/**
 * Aedes authentification callback
 *
 * Check client credentials and update client properties
 *
 * @method module:Broker~authenticate
 * @param {object} client - MQTT client
 * @param {string} [username] - MQTT username
 * @param {object} [password] - MQTT password
 * @returns {number} status - CONNACK code
 * - 0 - Accepted
 * - 1 - Unacceptable protocol version
 * - 2 - Identifier rejected
 * - 3 - Server unavailable
 * - 4 - Bad user name or password
 */
const authenticate = async (client, username, password) => {
  let status;
  try {
    logger.publish(3, 'broker', 'Authenticate:req', {
      client: client.id || null,
      username,
    });
    if (!client || !client.id) return 1;
    let foundClient;
    if (!password || password === null || !username || username === null) {
      status = 4;
      return status;
    }
    if (
      client.id.startsWith(`aloes-${process.env.ALOES_ID}`) &&
      username === process.env.ALOES_ID &&
      password.toString() === process.env.ALOES_KEY
    ) {
      status = 0;
      foundClient = getClient(client);
      foundClient.user = username;
      foundClient.aloesId = process.env.ALOES_ID;
    } else {
      foundClient = getClient(client);
      const result = await authentificationRequest({
        client: foundClient,
        username,
        password: password.toString(),
      });

      if (result.status !== undefined) {
        status = result.status;
        foundClient = result.client;
      }
    }

    if (foundClient && foundClient.id && status === 0) {
      Object.keys(foundClient).forEach(key => {
        client[key] = foundClient[key];
        return key;
      });
      // await updateClientStatus(client, true);
    } else if (status === undefined) {
      status = 2;
    }

    logger.publish(2, 'broker', 'Authenticate:res', { client: foundClient, status });
    return status;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      status = 3;
      return status;
    }
    throw error;
  }
};

/**
 * Aedes publish authorization callback
 * @method module:Broker~authorizePublish
 * @param {object} client - MQTT client
 * @param {object} packet - MQTT packet
 * @returns {boolean}
 */
const authorizePublish = (client, packet) => {
  const topic = packet.topic;
  if (!topic) return false;
  const topicParts = topic.split('/');
  // const topicIdentifier = topicParts[0].toUpperCase()
  let auth = false;
  if (client.user) {
    if (topicParts[0].startsWith(client.user)) {
      logger.publish(5, 'broker', 'authorizePublish:req', {
        user: client.user,
        topic: topicParts,
      });
      auth = true;
    } else if (
      client.aloesId &&
      topicParts[0].startsWith(`aloes-${client.aloesId}`) &&
      (topicParts[1] === `tx` || topicParts[1] === `sync`)
    ) {
      logger.publish(5, 'broker', 'authorizePublish:req', {
        user: client.user,
        aloesApp: client.id,
      });
      auth = true;
    } else if (client.devEui && topicParts[0].startsWith(client.devEui)) {
      // todo limit access to device out prefix if any - / endsWith(device.outPrefix)
      logger.publish(5, 'broker', 'authorizePublish:req', {
        device: client.devEui,
        topic: topicParts,
      });
      auth = true;
    } else if (client.appId && topicParts[0].startsWith(client.appId)) {
      logger.publish(5, 'broker', 'authorizePublish:req', {
        application: client.appId,
        topic: topicParts,
      });
      auth = true;
    } else if (client.appEui && topicParts[0].startsWith(client.appEui)) {
      logger.publish(5, 'broker', 'authorizePublish:req', {
        application: client.appEui,
        topic: topicParts,
      });
      auth = true;
    }
  }

  logger.publish(3, 'broker', 'authorizePublish:res', { topic, auth });
  return auth;
};

/**
 * Aedes subscribe authorization callback
 * @method module:Broker.instance.authorizeSubscribe
 * @param {object} client - MQTT client
 * @param {object} packet - MQTT packet
 * @returns {boolean}
 */
const authorizeSubscribe = (client, packet) => {
  const topic = packet.topic;
  if (!topic) return false;
  const topicParts = topic.split('/');
  let auth = false;
  // todo leave minimum access with apikey
  if (client.user) {
    // const topicIdentifier = topicParts[0].toUpperCase()
    if (topicParts[0].startsWith(client.user)) {
      logger.publish(5, 'broker', 'authorizeSubscribe:req', {
        user: client.user,
      });
      auth = true;
    } else if (
      client.aloesId &&
      topicParts[0].startsWith(`aloes-${client.aloesId}`) &&
      (topicParts[1] === `rx` ||
        topicParts[1] === `status` ||
        topicParts[1] === `stop` ||
        topicParts[1] === `sync`)
    ) {
      logger.publish(4, 'broker', 'authorizeSubscribe:req', {
        user: client.user,
        aloesApp: client.id,
      });
      //  packet.qos = packet.qos + 2
      auth = true;
    } else if (client.devEui && topicParts[0].startsWith(client.devEui)) {
      // todo limit access to device in prefix if any
      logger.publish(5, 'broker', 'authorizeSubscribe:req', {
        device: client.devEui,
      });
      auth = true;
    } else if (client.appId && topicParts[0].startsWith(client.appId)) {
      logger.publish(5, 'broker', 'authorizeSubscribe:req', {
        application: client.appId,
        topic: topicParts,
      });
      auth = true;
    } else if (client.appEui && topicParts[0].startsWith(client.appEui)) {
      logger.publish(5, 'broker', 'authorizeSubscribe:req', {
        application: client.appEui,
      });
      auth = true;
    }
  }
  logger.publish(3, 'broker', 'authorizeSubscribe:res', { topic, auth });
  return auth;
};

// const authorizeForward = (client, packet) => {
//   // use this to avoid user sender to see its own message on other clients
//   try {
//     const topic = packet.topic;
//     const topicParts = topic.split('/');
//     let auth = false;
//     console.log('authorize forward :', client);
//     logger.publish(3, 'broker', 'authorizeForward:req', { topic, auth });
//     // if (!client) return packet;
//     if (client.id.startsWith(`aloes-${process.env.ALOES_ID}`)) {
//       // switch topic parts 2 ( command ) auth response, rx, ?
//       // if (
//       //   topicParts[0].startsWith(process.env.ALOES_ID) &&
//       //   client.id === 'I should not see this'
//       // ) {
//       //   // remove topic client prefix
//       //   // send to device , user or external app
//       //   packet.payload = new Buff();er('overwrite packet payload');
//       //   return packet;
//       // }
//       return null;
//     }
//     return packet;
//   } catch (error) {
//     return null;
//   }
// };

/**
 * On message published to Aedes broker
 * @method module:Broker~onPublished
 * @param {object} packet - MQTT packet
 * @param {object} client - MQTT client
 */
const onPublished = async (packet, client) => {
  try {
    logger.publish(4, 'broker', 'onPublished:req', { topic: packet.topic });
    if (!client) return;
    if (client.aloesId) {
      const topicParts = packet.topic.split('/');
      if (topicParts[1] === 'tx') {
        packet.topic = topicParts.slice(2, topicParts.length).join('/');
        // packet.retain = false;
        packet.qos = 1;
        // console.log('broker, reformatted packet to instance', packet);
        broker.publish(packet);
      } else if (topicParts[1] === 'sync') {
        console.log('ONSYNC', packet.payload);
      }
      return;
    }

    if (client.user && !client.aloesId) {
      const foundClient = getClient(client);
      const aloesClientsIds = await getClientsByTopic(`aloes-${process.env.ALOES_ID}/sync`);
      if (!aloesClientsIds || aloesClientsIds === null) {
        throw new Error('No Aloes client connected');
      }
      const aloesClient = pickRandomClient(aloesClientsIds);
      if (!aloesClient || aloesClient === null || !aloesClient.id) {
        throw new Error('No Aloes client connected');
      }
      packet.topic = `${aloesClient.id}/rx/${packet.topic}`;
      // check packet payload type to preformat before stringify
      if (client.devEui) {
        // packet.payload = packet.payload.toString('binary');
      } else if (client.ownerId || client.appId) {
        packet.payload = JSON.parse(packet.payload.toString());
      }
      packet.payload = Buffer.from(
        JSON.stringify({ payload: packet.payload, client: foundClient }),
      );
      broker.publish(packet);
      return;
    }
    throw new Error('Invalid MQTT client');
  } catch (error) {
    logger.publish(2, 'broker', 'onPublished:err', error);
    throw error;
  }
};

/**
 * Remove subscriptions for a specific client
 * @method module:Broker~cleanSubscriptions
 * @param {object} client - MQTT client
 * @returns {promise}
 */
// const cleanSubscriptions = client =>
//   new Promise((resolve, reject) => {
//     broker.instance.persistence.cleanSubscriptions(client, (err, res) => (err ? reject(err) : resolve(res)));
//   });

/**
 * Convert payload before publish
 * @method module:Broker.publish
 * @param {object} packet - MQTT Packet
 * @returns {function} broker.instance.publish
 */
broker.publish = packet => {
  try {
    if (typeof packet.payload === 'boolean') {
      packet.payload = packet.payload.toString();
    } else if (typeof packet.payload === 'number') {
      packet.payload = packet.payload.toString();
    } else if (typeof packet.payload === 'string') {
      packet.payload = Buffer.from(packet.payload);
    } else if (typeof packet.payload === 'object') {
      // console.log('publish buffer ?', !Buffer.isBuffer(packet.payload));
      if (!Buffer.isBuffer(packet.payload)) {
        //  packet.payload = JSON.stringify(packet.payload);
        packet.payload = Buffer.from(packet.payload);
      }
    }

    // logger.publish(2, 'broker', 'publish:res', { topic: `${pubsubVersion}/${packet.topic}` });
    logger.publish(2, 'broker', 'publish:res', { topic: packet.topic });
    return broker.instance.publish(packet);
  } catch (error) {
    throw error;
  }
};

/**
 * Setup broker connection
 * @method module:Broker.start
 * @returns {boolean} status
 */
broker.start = () => {
  try {
    logger.publish(2, 'broker', 'start', `${process.env.MQTT_BROKER_URL}`);
    if (process.env.MQTTS_BROKER_URL) {
      logger.publish(2, 'broker', 'start', `${process.env.MQTTS_BROKER_URL}`);
    }

    broker.instance.authenticate = (client, username, password, cb) => {
      authenticate(client, username, password)
        .then(status => {
          if (status !== 0) {
            const err = new Error('Auth error');
            err.returnCode = status || 3;
            cb(err, null);
          } else cb(null, true);
        })
        .catch(e => {
          cb(e, null);
        });
    };

    broker.instance.authorizePublish = (client, packet, cb) => {
      if (authorizePublish(client, packet)) return cb(null);
      const error = new Error('authorizePublish error');
      // error.returnCode = 3;
      return cb(error);
    };

    broker.instance.authorizeSubscribe = (client, packet, cb) => {
      if (authorizeSubscribe(client, packet)) return cb(null, packet);
      const error = new Error('authorizeSubscribe error');
      //  error.returnCode = 3;
      return cb(error);
    };

    // broker.instance.authorizeForward = authorizeForward;

    broker.instance.published = (packet, client, cb) => {
      onPublished(packet, client)
        .then(() => cb())
        .catch(() => cb());
    };

    /**
     * On client connected to Aedes broker
     * @event client
     * @param {object} client - MQTT client
     */
    broker.instance.on('client', async client => {
      try {
        logger.publish(3, 'broker', 'onClientConnect', client.id);
        await delayedUpdateClientStatus(client, true);
        // await updateClientStatus(client, true);
      } catch (error) {
        logger.publish(3, 'broker', 'onClientConnect:err', error);
      }
    });

    /**
     * On client disconnected from Aedes broker
     * @event clientDisconnect
     * @param {object} client - MQTT client
     * @returns {function} Broker~updateModelsStatus
     */
    broker.instance.on('clientDisconnect', async client => {
      try {
        logger.publish(3, 'broker', 'onClientDisconnect', client.id);
        await updateClientStatus(client, false);
      } catch (error) {
        logger.publish(3, 'broker', 'onClientDisconnect:err', error);
      }
    });

    /**
     * When client keep alive timeout
     * @event keepaliveTimeout
     * @param {object} client - MQTT client
     */
    broker.instance.on('keepaliveTimeout', client => {
      logger.publish(3, 'broker', 'onKeepaliveTimeout', client.id);
    });

    /**
     * When client action creates an error
     * @event clientError
     * @param {object} client - MQTT client
     * @param {object} err - MQTT Error
     */
    broker.instance.on('clientError', (client, err) => {
      logger.publish(2, 'broker', 'onClientError', { clientId: client.id, error: err.message });
    });

    broker.instance.on('connectionError', (client, err) => {
      logger.publish(2, 'broker', 'onConnectionError', { clientId: client.id, error: err.message });
      // client.close();
    });

    // broker.instance.on("delivered", (packet, client) => {
    //   console.log("Delivered", packet, client.id);
    // });

    return true;
  } catch (error) {
    logger.publish(2, 'broker', 'start:err', error);
    return false;
  }
};

/**
 * Stop broker and update models status
 * @method module:Broker.stop
 * @returns {boolean}
 */
broker.stop = () => {
  try {
    // const aloesTopicPrefix = `aloes-${process.env.ALOES_ID}`;
    // const packet = {
    //   topic: `${aloesTopicPrefix}/stop`,
    //   payload: Buffer.from(JSON.stringify({ status: false })),
    //   retain: false,
    //   qos: 0,
    // };
    // broker.publish(packet);
    logger.publish(2, 'broker', 'stopping', {
      url: `${process.env.MQTT_BROKER_URL}`,
      brokers: broker.instance.brokers,
    });
    if (broker.instance) broker.instance.close();
    return true;
  } catch (error) {
    logger.publish(2, 'broker', 'stop:err', error);
    return false;
  }
};

/**
 * Init MQTT and WS Broker with new Aedes instance
 * @method module:Broker.init
 * @returns {function} broker.start
 */
broker.init = () => {
  try {
    let config = {};
    if (!process.env.CI) {
      const result = dotenv.config();
      if (result.error) throw result.error;
      config = result.parsed;
    } else {
      envVariablesKeys.forEach(key => {
        config[key] = process.env[key];
      });
    }

    const brokerConfig = {
      interfaces: [
        { type: 'mqtt', port: Number(config.MQTT_BROKER_PORT) },
        { type: 'http', port: Number(config.WS_BROKER_PORT) },
      ],
    };
    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
      const Redis = require('ioredis');
      broker.redis = new Redis({
        host: config.REDIS_HOST,
        port: Number(config.REDIS_PORT),
        db: config.REDIS_MQTT_PERSISTENCE,
        password: config.REDIS_PASS,
        lazyConnect: true,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });
    }

    const aedesConf = {
      mq: emitter(config),
      persistence: persistence(config),
      concurrency: 100,
      heartbeatInterval: 60000,
      connectTimeout: 30000,
    };

    broker.instance = new aedes.Server(aedesConf);

    const mqttBroker = net
      .createServer(broker.instance.handle)
      .listen(brokerConfig.interfaces[0].port, () => {
        logger.publish(
          2,
          'broker',
          'Setup',
          `MQTT broker ready, up and running @: ${brokerConfig.interfaces[0].port}`,
        );
      });

    const httpServer = http.createServer().listen(brokerConfig.interfaces[1].port, () => {
      logger.publish(
        2,
        'broker',
        'Setup',
        `WS broker ready, up and running @: ${brokerConfig.interfaces[1].port}`,
      );
    });

    const wsBroker = ws.createServer(
      {
        server: httpServer,
      },
      broker.instance.handle,
    );

    broker.instance.on('closed', () => {
      wsBroker.close();
      httpServer.close();
      mqttBroker.close();
      if (Object.keys(broker.instance.brokers).length === 0 && broker.redis) {
        broker.redis.flushdb();
      }
      logger.publish(2, 'broker', 'stopped', `${process.env.MQTT_BROKER_URL}`);
    });

    return broker.start();
  } catch (error) {
    logger.publish(2, 'broker', 'init:err', error);
    return false;
  }
};

if (!process.env.CLUSTER_MODE || process.env.CLUSTER_MODE === 'false') {
  logger.publish(1, 'broker', 'init:single', { pid: process.pid });
  setTimeout(() => broker.init(), 500);
} else {
  logger.publish(1, 'broker', 'init:cluster', { pid: process.pid });

  process.on('message', packet => {
    console.log('PROCESS PACKET ', packet);
    if (typeof packet.id === 'number' && packet.data.ready) {
      broker.init();
      process.send({
        type: 'process:msg',
        data: {
          isStarted: true,
        },
      });
    }
  });

  process.send({
    type: 'process:msg',
    data: {
      isStarted: false,
    },
  });
}

nodeCleanup((exitCode, signal) => {
  try {
    if (signal && signal !== null) {
      logger.publish(1, 'broker', 'exit:req', { exitCode, signal, pid: process.pid });
      broker.stop();
      setTimeout(() => process.kill(process.pid, signal), 5000);
      nodeCleanup.uninstall();
      return false;
    }
    return true;
  } catch (error) {
    logger.publish(1, 'broker', 'exit:err', error);
    process.kill(process.pid, signal);
    throw error;
  }
});

export default broker;
