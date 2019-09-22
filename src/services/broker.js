import MQEmitterRedis from 'mqemitter-redis';
import aedesPersistenceRedis from 'aedes-persistence-redis';
import aedes from 'aedes';
import Redis from 'ioredis';
import http from 'http';
import net from 'net';
import tls from 'tls';
import ws from 'websocket-stream';
import fs from 'fs';
import dotenv from 'dotenv';
import nodeCleanup from 'node-cleanup';
import logger from './logger';

/**
 * @module Broker
 */
const broker = {};

/**
 * Find in cache clients subscribed to a specific topic pattern
 * @method module:Broker.getClients
 * @param {string} [id] - Client id
 * @returns {array|object}
 */
broker.getClients = id => {
  if (typeof id === 'string') {
    return broker.instance.clients[id];
  }
  return broker.instance.clients;
};

/**
 * Find in cache client ids subscribed to a specific topic pattern
 * @method module:Broker.getClientsByTopic
 * @param {string} topic - Topic pattern
 * @returns {Promise}
 */
broker.getClientsByTopic = topic =>
  new Promise((resolve, reject) => {
    const stream = broker.persistence.getClientList(topic);
    const clients = [];
    stream
      .on('data', client => {
        try {
          clients.push(client);
        } catch (error) {
          reject(error);
        }
      })
      .on('end', () => {
        resolve(clients);
      })
      .on('error', e => {
        reject(e);
      });
  });

/**
 * Remove subscriptions for a specific client
 * @method module:Broker.cleanSubscriptions
 * @param {object} client - MQTT client
 * @returns {Promise}
 */
broker.cleanSubscriptions = client =>
  new Promise((resolve, reject) => {
    broker.persistence.cleanSubscriptions(client, (err, res) => (err ? reject(err) : resolve(res)));
  });

/**
 * Convert payload before publish
 * @method module:broker.publish
 * @param {object} packet - MQTT Packet
 * @returns {functions} broker.instance.publish(packet)
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
    logger.publish(4, 'broker', 'publish:res', { topic: packet.topic });
    return broker.instance.publish(packet);
  } catch (error) {
    throw error;
  }
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
 * Give a range of clientIds, find a connected client
 * @method module:Broker~pickRandomClient
 * @param {string[]} clientIds - MQTT client Ids
 * @param {number} attempts - Number of tryouts before returning null
 * @returns {object} client
 */
const pickRandomClient = (clientIds, attempts) => {
  if (!clientIds || clientIds === null) {
    return null;
  }
  const clientId = clientIds[Math.floor(Math.random() * clientIds.length)];
  const client = broker.getClients(clientId);
  if (!client || client === null || !client.connected) {
    if (typeof attempts === 'number' && attempts - 1 > 0) {
      return pickRandomClient(clientIds, attempts);
    }
    return null;
  }
  logger.publish(4, 'broker', 'pickRandomClient:res', { clientId });
  return client;
};

const updateClientStatus = async (client, status) => {
  try {
    if (client && client.user) {
      const foundClient = getClient(client);
      logger.publish(4, 'broker', 'updateClientStatus:req', { client: foundClient, status });
      const aloesClientsIds = await broker.getClientsByTopic(`aloes-${process.env.ALOES_ID}/sync`);
      if (!aloesClientsIds || aloesClientsIds === null) {
        throw new Error('No Aloes app client subscribed');
      }
      if (client.aloesId) {
        if (!status) {
          // client.close()
          await broker.cleanSubscriptions(client);
        }
      }
      if (!client.aloesId) {
        const aloesClient = pickRandomClient(aloesClientsIds);
        if (!aloesClient || aloesClient === null || !aloesClient.id) {
          throw new Error('No Aloes app client connected');
        }
        const packet = {
          topic: `${aloesClient.id}/status`,
          payload: Buffer.from(JSON.stringify({ status, client: foundClient })),
          retain: false,
          qos: 0,
        };
        broker.publish(packet);
      }
    }
    return client;
  } catch (error) {
    logger.publish(4, 'broker', 'updateClientStatus:er', error);
    return error;
  }
};

/**
 * HTTP request to Aloes to validate credentials
 * @method module:Broker~authentificationRequest
 * @param {object} data - Client instance
 * @returns {Promise}
 */
const authentificationRequest = data => {
  const options = {
    hostname: process.env.HTTP_SERVER_HOST,
    port: process.env.HTTP_SERVER_PORT,
    path: `${process.env.REST_API_ROOT}/auth/mqtt`,
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
  };
  return new Promise((resolve, reject) => {
    const httpClient = http;
    // if (options.port === 443) {
    //   httpClient = https;
    // }
    // console.log('authenticate', data);
    if (typeof data === 'object') {
      if (!Buffer.isBuffer(data)) {
        data = JSON.stringify(data);
      }
    }
    const req = httpClient.request(options, res => {
      // console.log('REQUEST STATUS: ', res.statusCode);
      // console.log('HEADERS: ', JSON.stringify(res.headers));
      // res.setEncoding('utf8');
      const bodyChunks = [];
      res
        .on('data', chunk => {
          bodyChunks.push(chunk);
        })
        .on('end', () => {
          try {
            const body = Buffer.concat(bodyChunks);
            let result;
            try {
              result = JSON.parse(body);
            } catch (error) {
              result = body;
            }
            if (!result) {
              resolve(false);
            } else {
              resolve(result);
            }
          } catch (e) {
            reject(e);
          }
        });
    });

    req.on('error', e => {
      reject(e);
    });
    req.write(data);
    req.end();
  });
};

const authenticate = async (client, username, password) => {
  try {
    logger.publish(4, 'broker', 'Authenticate:req', {
      client: client.id,
      username,
    });
    let foundClient;
    let status = false;
    if (!password || password === null || !username || username === null) {
      //  client.user = 'guest';
      const error = new Error('Auth error');
      error.returnCode = 4;
      logger.publish(4, 'broker', 'Authenticate:res', 'missing credentials');
      status = false;
      throw error;
    }

    if (
      client.id.startsWith(`aloes-${process.env.ALOES_ID}`) &&
      username === process.env.ALOES_ID &&
      password.toString() === process.env.ALOES_KEY
    ) {
      client.user = username;
      client.aloesId = process.env.ALOES_ID;
      status = true;
      foundClient = getClient(client);
    } else {
      foundClient = getClient(client);
      const result = await authentificationRequest({
        client: foundClient,
        username,
        password: password.toString(),
      });

      if (result.client) {
        status = result.status;
        foundClient = result.client;
        foundClient.user = username;
        Object.keys(foundClient).forEach(key => {
          client[key] = foundClient[key];
          return key;
        });
      }
    }

    if (foundClient && foundClient.id) {
      logger.publish(4, 'broker', 'Authenticate:res', { client: foundClient, status });
      if (status === true) {
        await updateClientStatus(client, status);
        return status;
      }
    }

    const error = new Error('Auth error');
    error.returnCode = 2;
    status = false;
    logger.publish(4, 'broker', 'Authenticate:res', 'invalid token');
    throw error;
  } catch (error) {
    logger.publish(2, 'broker', 'Authenticate:err', error);
    throw error;
  }
};

const authorizePublish = (client, packet) => {
  try {
    const topic = packet.topic;
    const topicParts = topic.split('/');
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
        logger.publish(4, 'broker', 'authorizePublish:req', {
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
    if (!auth) {
      const error = new Error('authorizePublish error');
      error.returnCode = 3;
      throw error;
    }
    logger.publish(3, 'broker', 'authorizePublish:res', { topic, auth });
    return packet;
  } catch (error) {
    throw error;
  }
};

const authorizeSubscribe = (client, packet) => {
  try {
    const topic = packet.topic;
    const topicParts = topic.split('/');
    let auth = false;
    // todo leave minimum access with apikey
    // allow max access with valid tls cert config ?
    if (client.user) {
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
    if (!auth) {
      const error = new Error('authorizeSubscribe error');
      //  error.returnCode = 3;
      throw error;
    }
    logger.publish(3, 'broker', 'authorizeSubscribe:res', { topic, auth });
    return packet;
  } catch (error) {
    logger.publish(2, 'broker', 'authorizeSubscribe:err', error);
    throw error;
  }
};

const onPublished = async (packet, client) => {
  try {
    logger.publish(4, 'broker', 'onPublished:req', { topic: packet.topic });
    if (!client) return;
    if (client.aloesId) {
      const topicParts = packet.topic.split('/');
      if (topicParts[1] === 'tx') {
        packet.topic = topicParts.slice(2, topicParts.length).join('/');
        // packet.retain = false;
        // packet.qos = 0;
        // console.log('broker, reformatted packet to instance', packet);
        broker.publish(packet);
      } else if (topicParts[1] === 'sync') {
        console.log('ONSYNC', packet.payload);
      }
      return;
    }

    if (client.user && !client.aloesId) {
      const foundClient = getClient(client);
      const aloesClientIds = await broker.getClientsByTopic(`aloes-${process.env.ALOES_ID}/sync`);
      // console.log('mqtt client source: ', foundClient);
      console.log('mqtt client targets: ', aloesClientIds);
      if (!aloesClientIds || aloesClientIds === null) {
        throw new Error('No Aloes client connected');
      }
      const aloesClient = pickRandomClient(aloesClientIds);
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
      // packet.retain = false;
      // packet.qos = 0;
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
 * Setup broker connection
 * @method module:Broker.start
 * @param {object} app - Loopback app
 * @returns {boolean} status
 */
broker.start = () => {
  try {
    logger.publish(2, 'broker', 'start', `${process.env.MQTT_BROKER_URL}`);
    if (process.env.MQTTS_BROKER_URL) {
      logger.publish(2, 'broker', 'start', `${process.env.MQTTS_BROKER_URL}`);
    }

    /**
     * Aedes authentification callback
     * @method module:Broker~authenticate
     * @param {object} client - MQTT client
     * @param {string} [username] - MQTT username
     * @param {object} [password] - MQTT password
     * @param {function} cb - callback
     * @returns {function}
     */
    broker.instance.authenticate = async (client, username, password, cb) => {
      try {
        await authenticate(client, username, password);
        return cb(null, true);
      } catch (error) {
        return cb(error, false);
      }
    };

    /**
     * Aedes publish authorization callback
     * @method module:Broker~authorizePublish
     * @param {object} client - MQTT client
     * @param {object} packet - MQTT packet
     * @param {function} cb - callback
     * @returns {function}
     */
    broker.instance.authorizePublish = (client, packet, cb) => {
      try {
        authorizePublish(client, packet);
        cb(null, null);
      } catch (error) {
        cb(error, null);
      }
    };

    /**
     * Aedes subscribe authorization callback
     * @method module:Broker~authorizeSubscribe
     * @param {object} client - MQTT client
     * @param {object} packet - MQTT packet
     * @param {function} cb - callback
     * @returns {function}
     */
    broker.instance.authorizeSubscribe = (client, packet, cb) => {
      try {
        authorizeSubscribe(client, packet);
        cb(null, packet);
      } catch (error) {
        cb(error, null);
      }
    };

    // broker.instance.authorizeForward = (client, packet) => {
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
     * @event published
     * @param {object} packet - MQTT packet
     * @param {object} client - MQTT client
     */
    broker.instance.published = async (packet, client, cb) => {
      try {
        await onPublished(packet, client);
        return cb();
      } catch (error) {
        // logger.publish(2, 'broker', 'onPublish:err', error);
        return cb();
      }
    };

    /**
     * On client connected to Aedes broker
     * @event client
     * @param {object} client - MQTT client
     * @returns {functions} updateModelsStatus
     */
    broker.instance.on('client', client => {
      logger.publish(4, 'broker', 'clientConnect:req', client.id);
      // updateClientStatus(client, true);
    });

    /**
     * On client disconnected from Aedes broker
     * @event clientDisconnect
     * @param {object} client - MQTT client
     * @returns {functions} updateModelsStatus
     */
    broker.instance.on('clientDisconnect', client => {
      try {
        logger.publish(4, 'broker', 'clientDisconnect:req', client.id);
        return updateClientStatus(client, false);
      } catch (error) {
        return error;
      }
    });

    /**
     * When client keep alive timeout
     * @event keepaliveTimeout
     * @param {object} client - MQTT client
     * @returns {functions} updateModelsStatus
     */
    broker.instance.on('keepaliveTimeout', client => {
      try {
        logger.publish(4, 'broker', 'keepaliveTimeout:req', client.id);
        return updateClientStatus(client, false);
      } catch (error) {
        return error;
      }
    });

    broker.instance.on('clientError', (client, err) => {
      console.log('broker : client error', client.id, err.message);
      updateClientStatus(client, false);
    });

    broker.instance.on('connectionError', (client, err) => {
      console.log('broker : connection error', client.clean, err.message);
      updateClientStatus(client, false);
      // client.close();
      //  console.log('broker : connection error', client, err.message, err.stack);
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
    const aloesTopicPrefix = `aloes-${process.env.ALOES_ID}`;
    const packet = {
      topic: `${aloesTopicPrefix}/stop`,
      payload: Buffer.from(JSON.stringify({ status: false })),
      retain: false,
      qos: 0,
    };
    broker.publish(packet);
    logger.publish(4, 'broker', 'stopped', `${process.env.MQTT_BROKER_URL}`);
    broker.instance.close();
    broker.redis.flushdb();
    return true;
  } catch (error) {
    logger.publish(2, 'broker', 'stop:err', error);
    return false;
  }
};

const persistence = config =>
  aedesPersistenceRedis({
    port: Number(config.REDIS_PORT),
    host: config.REDIS_HOST,
    // family: 4, // 4 (IPv4) or 6 (IPv6)
    db: config.REDIS_MQTT_PERSISTENCE,
    lazyConnect: false,
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

const emitter = config =>
  MQEmitterRedis({
    host: config.REDIS_HOST,
    port: Number(config.REDIS_PORT),
    db: config.REDIS_MQTT_EVENTS,
    password: config.REDIS_PASS,
    lazyConnect: false,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

/**
 * Init MQTT Broker with new Aedes instance
 * @method module:Broker.init
 * @returns {function} broker.start
 */
broker.init = () => {
  try {
    const result = dotenv.config();
    if (result.error) {
      throw result.error;
    }
    const config = result.parsed;
    const brokerConfig = {
      interfaces: [
        { type: 'mqtt', port: Number(config.MQTT_BROKER_PORT) },
        { type: 'http', port: Number(config.WS_BROKER_PORT) },
      ],
    };
    broker.emitter = emitter(config);
    broker.persistence = persistence(config);
    broker.redis = new Redis({
      host: config.REDIS_HOST,
      port: Number(config.REDIS_PORT),
      db: config.REDIS_MQTT_PERSISTENCE,
      password: config.REDIS_PASS,
      // lazyConnect: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    const aedesConf = {
      mq: broker.emitter,
      persistence: broker.persistence,
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
          `MQTT broker ready, up and running @: ${config.MQTT_BROKER_URL}`,
        );
      });

    // const httpServer = http
    //   .createServer((req, res) => {
    //     res.write('Hello World!');
    //     res.end();
    //   })
    //   .listen(brokerConfig.interfaces[1].port);

    const httpServer = http.createServer().listen(brokerConfig.interfaces[1].port);

    const wsBroker = ws.createServer(
      {
        server: httpServer,
      },
      broker.instance.handle,
    );

    let mqttsBroker;
    if (config.MQTTS_BROKER_URL) {
      brokerConfig.interfaces[2] = {
        type: 'mqtts',
        port: Number(config.MQTTS_BROKER_PORT),
        credentials: {
          //  key: fs.readFileSync(`${__dirname}/../../deploy/${config.MQTTS_BROKER_KEY}`),
          key: fs.readFileSync(`${config.MQTTS_BROKER_KEY}`),
          cert: fs.readFileSync(`${config.MQTTS_BROKER_CERT}`),
        },
      };
      mqttsBroker = tls
        .createServer(brokerConfig.interfaces[2].credentials, broker.instance.handle)
        .listen(brokerConfig.interfaces[2].port, () => {
          logger.publish(
            2,
            'broker',
            'Setup',
            `MQTT broker ready, up and running @: ${config.MQTTS_BROKER_URL}`,
          );
        });
    }

    broker.instance.on('closed', () => {
      wsBroker.close();
      httpServer.close();
      httpServer.close();
      mqttBroker.close();
      if (config.MQTTS_BROKER_URL && mqttsBroker) {
        mqttsBroker.close();
      }
      logger.publish(4, 'broker', 'closed');
    });

    return broker.start();
  } catch (error) {
    logger.publish(2, 'broker', 'init:err', error);
    return false;
  }
};

setTimeout(() => broker.init(), 1000);

nodeCleanup((exitCode, signal) => {
  try {
    if (signal && signal !== null) {
      logger.publish(1, 'process', 'exit:req', { exitCode, signal, pid: process.pid });
      if (broker && broker.instance) {
        broker.stop();
      }
      setTimeout(() => process.kill(process.pid, signal), 2500);
      nodeCleanup.uninstall();
      return false;
    }
    return true;
  } catch (error) {
    logger.publish(1, 'process', 'exit:err', error);
    // setTimeout(() => process.kill(process.pid, signal), 2500);
    process.kill(process.pid, signal);
    throw error;
  }
});

export default broker;
