/* Copyright 2019 Edouard Maleix, read LICENSE */

/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable global-require */
import aedes from 'aedes';
import axios from 'axios';
import dotenv from 'dotenv';
import http from 'http';
// import http from 'http2';
import throttle from 'lodash.throttle';
import net from 'net';
import nodeCleanup from 'node-cleanup';
// import os from 'os';
import ws from 'websocket-stream';
import logger from './logger';
import rateLimiter from './rate-limiter';
import envVariablesKeys from '../initial-data/variables-keys.json';
// import { version } from '../package.json';

// process.env.PUBSUB_API_VERSION = `v${version.substr(0,3)}`;

/**
 * @module Broker
 */
const broker = { config: {} };

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
 * @method module:Broker~getClientProps
 * @param {object} client - MQTT client
 * @returns {object} client
 */
const getClientProps = client => {
  /* eslint-disable security/detect-object-injection */
  const clientProperties = [
    'id',
    'user',
    'devEui',
    'appId',
    'appEui',
    'aloesId',
    'ownerId',
    'model',
    'ip',
    'type',
    // 'connDetails',
    // 'ipFamily'
  ];

  const clientObject = {};
  clientProperties.forEach(key => {
    if (client[key] !== undefined) {
      if (key === 'connDetails') {
        clientObject.type = client.connDetails.isWebsocket ? 'WS' : 'MQTT';
        clientObject.ip = client.connDetails.ipAddress;
      } else {
        clientObject[key] = client[key];
      }
    }
  });
  logger.publish(3, 'broker', 'getClientProps:res', { client: clientObject });
  return clientObject;
  /* eslint-enable security/detect-object-injection */
};

/**
 * Find clients connected to the broker
 * @method module:Broker~getClients
 * @param {string} [id] - Client id
 * @returns {array|object}
 */
const getClients = id => {
  if (!broker.instance) return null;
  // eslint-disable-next-line security/detect-object-injection
  if (id && typeof id === 'string') return broker.instance.clients[id];
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
      return reject(new Error('Invalid broker instance'));
    }
    const stream = broker.instance.persistence.getClientList(topic);
    const clients = [];
    return stream
      .on('data', clientId => {
        if (clientId !== null) clients.push(clientId);
      })
      .on('end', () => {
        logger.publish(3, 'broker', 'getClientsByTopic:res', { clients });
        resolve(clients);
      })
      .on('error', reject);
  });

/**
 * Give an array of clientIds, find a connected client
 * @method module:Broker~pickRandomClient
 * @param {string[]} clientIds - MQTT client Ids
 * @returns {object} client
 */
const pickRandomClient = clientIds => {
  try {
    if (!clientIds || clientIds === null) return null;
    const connectedClients = clientIds
      .map(clientId => {
        const client = getClients(clientId);
        if (client) return clientId;
        return null;
      })
      .filter(val => val !== null);
    logger.publish(4, 'broker', 'pickRandomClient:req', { clientIds: connectedClients });
    const clientId = connectedClients[Math.floor(Math.random() * connectedClients.length)];
    const client = getClients(clientId);
    logger.publish(3, 'broker', 'pickRandomClient:res', { clientId });
    return client;
  } catch (error) {
    logger.publish(3, 'broker', 'pickRandomClient:err', error);
    return null;
  }
};

const updateClientStatus = async (client, status) => {
  try {
    if (client && client.user) {
      const aloesClientsIds = await getClientsByTopic(`aloes-${process.env.ALOES_ID}/sync`);
      if (!aloesClientsIds || aloesClientsIds === null) {
        throw new Error('No Aloes app client subscribed');
      }
      const foundClient = getClientProps(client);
      logger.publish(4, 'broker', 'updateClientStatus:req', { status, client: foundClient });
      if (!client.aloesId) {
        const aloesClient = pickRandomClient(aloesClientsIds);
        if (aloesClient === null) throw new Error('No Aloes app client connected');
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
    logger.publish(2, 'broker', 'updateClientStatus:err', error);
    return client;
  }
};

const delayedUpdateClientStatus = throttle(updateClientStatus, 100);

/**
 * HTTP request to Aloes to validate credentials
 * @method module:Broker~authentificationRequest
 * @param {object} data - Client instance and credentials
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
 * - 5 - Not authorized
 */
const authenticate = async (client, username, password) => {
  try {
    logger.publish(3, 'broker', 'Authenticate:req', {
      client: client.id || null,
      username,
    });
    if (!client || !client.id) return 1;
    if (!password || !username) return 4;

    let status, foundClient;
    foundClient = getClientProps(client);
    // if (!foundClient || !foundClient.id) return 5;
    if (!foundClient || !foundClient.id || !foundClient.ip) return 2;

    // const trustProxy = broker.instance.trustProxy();
    const trustProxy = broker.instance.trustProxy;
    const { limiter, limiterType, retrySecs } = await rateLimiter.getAuthLimiter(
      foundClient.ip,
      username,
    );
    if (retrySecs > 0) {
      if (limiter && limiterType) {
        // client.connDetails['Retry-After'] = String(retrySecs);
        // client.connDetails['X-RateLimit-Limit'] = rateLimiter.limits[limiterType];
        // client.connDetails['X-RateLimit-Remaining'] = limiter.remainingPoints;
        // client.connDetails['X-RateLimit-Reset'] = new Date(Date.now() + limiter.msBeforeNext);
      }
      return 4;
    }

    if (
      client.id.startsWith(`aloes-${process.env.ALOES_ID}`) &&
      username === process.env.ALOES_ID &&
      password.toString() === process.env.ALOES_KEY
    ) {
      status = 0;
      foundClient.user = username;
      foundClient.aloesId = process.env.ALOES_ID;
    } else {
      // todo : identify client model ( user || device || application ), using client.id, username ?
      const result = await authentificationRequest({
        client: foundClient,
        username,
        password: password.toString(),
      });
      if (result && result.status !== undefined) {
        status = result.status;
        foundClient = { ...foundClient, ...result.client };
      }
    }

    // if (!foundClient || !foundClient.id) return 5;
    if (!foundClient || !foundClient.id || !foundClient.ip) return 2;
    if (status === undefined) status = 2;
    if (status === 0) {
      Object.keys(foundClient).forEach(key => {
        // eslint-disable-next-line security/detect-object-injection
        client[key] = foundClient[key];
      });
      if (trustProxy) {
        await rateLimiter.cleanAuthLimiter(foundClient.ip, foundClient.user);
        // remove client.connDetails rateLimit
      }
    }

    if (status !== 0 && trustProxy) {
      try {
        await rateLimiter.setAuthLimiter(foundClient.ip, foundClient.user);
      } catch (rlRejected) {
        if (rlRejected instanceof Error) {
          status = 3;
        } else {
          //   client.connDetails['Retry-After'] = String(Math.round(rlRejected.msBeforeNext / 1000)) || 1;
          //   client.connDetails['X-RateLimit-Limit'] = rlRejected.consumedPoints - 1;
          //   client.connDetails['X-RateLimit-Remaining'] = rlRejected.remainingPoints;
          //   client.connDetails['X-RateLimit-Reset'] = new Date(Date.now() + rlRejected.msBeforeNext);
        }
      }
    }

    return status;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') return 3;
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
  if (!client.user) return auth;
  if (topicParts[0].startsWith(client.user)) {
    logger.publish(5, 'broker', 'authorizePublish:req', {
      user: client.user,
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
    // todo : limit access to device out prefix if any - / endsWith(device.outPrefix)
    logger.publish(5, 'broker', 'authorizePublish:req', {
      device: client.devEui,
    });
    auth = true;
  } else if (client.appId && topicParts[0].startsWith(client.appId)) {
    logger.publish(5, 'broker', 'authorizePublish:req', {
      application: client.appId,
    });
    auth = true;
  } else if (client.appEui && topicParts[0].startsWith(client.appEui)) {
    logger.publish(5, 'broker', 'authorizePublish:req', {
      application: client.appEui,
    });
    auth = true;
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
  if (!client.user) return auth;
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
    logger.publish(5, 'broker', 'authorizeSubscribe:req', {
      user: client.user,
      aloesApp: client.id,
    });
    //  packet.qos = packet.qos + 2
    auth = true;
  } else if (client.devEui && topicParts[0].startsWith(client.devEui)) {
    // todo : limit access to device in prefix if any
    logger.publish(5, 'broker', 'authorizeSubscribe:req', {
      device: client.devEui,
    });
    auth = true;
  } else if (client.appId && topicParts[0].startsWith(client.appId)) {
    logger.publish(5, 'broker', 'authorizeSubscribe:req', {
      application: client.appId,
    });
    auth = true;
  } else if (client.appEui && topicParts[0].startsWith(client.appEui)) {
    logger.publish(5, 'broker', 'authorizeSubscribe:req', {
      application: client.appEui,
    });
    auth = true;
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

const onInternalPublished = packet => {
  const topicParts = packet.topic.split('/');
  if (topicParts[1] === 'tx') {
    packet.topic = topicParts.slice(2, topicParts.length).join('/');
    packet.qos = 1;
    // packet.retain = false;
    // console.log('broker, reformatted packet to instance', packet);
    broker.publish(packet);
  } else if (topicParts[1] === 'sync') {
    console.log('ONSYNC', packet.payload);
  }
};

const onExternalPublished = async (packet, client) => {
  try {
    const aloesClientsIds = await getClientsByTopic(`aloes-${process.env.ALOES_ID}/sync`);
    if (!aloesClientsIds || aloesClientsIds === null) {
      throw new Error('No Aloes client connected');
    }
    const aloesClient = pickRandomClient(aloesClientsIds);
    if (aloesClient === null) throw new Error('No Aloes client connected');
    const foundClient = getClientProps(client);
    packet.topic = `${aloesClient.id}/rx/${packet.topic}`;
    // check packet payload type to preformat before stringify
    if (client.devEui) {
      // packet.payload = packet.payload.toString('binary');
    } else if (client.ownerId) {
      packet.payload = JSON.parse(packet.payload.toString());
    } else if (client.appId) {
      // console.log('EXTERNAL APPLICATION PACKET ', packet.payload.toString());
      // packet.payload = JSON.parse(packet.payload.toString());
    }
    packet.payload = Buffer.from(JSON.stringify({ payload: packet.payload, client: foundClient }));
    broker.publish(packet);
  } catch (error) {
    logger.publish(2, 'broker', 'onExternalPublished:err', error);
  }
};

const delayedOnExternalPublished = throttle(onExternalPublished, 5);

/**
 * On message published to Aedes broker
 * @method module:Broker~onPublished
 * @param {object} packet - MQTT packet
 * @param {object} client - MQTT client
 */
const onPublished = async (packet, client) => {
  try {
    if (!client || !client.id) return null;
    logger.publish(4, 'broker', 'onPublished:req', { topic: packet.topic });
    if (client.aloesId) return onInternalPublished(packet, client);
    if (client.user && !client.aloesId) {
      return delayedOnExternalPublished(packet, client);
    }
    throw new Error('Invalid MQTT client');
  } catch (error) {
    logger.publish(2, 'broker', 'onPublished:err', error);
    throw error;
  }
};

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
    logger.publish(3, 'broker', 'publish:res', { topic: packet.topic });
    return broker.instance.publish(packet);
  } catch (error) {
    logger.publish(2, 'broker', 'publish:err', error);
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
    if (process.env.MQTTS_BROKER_URL) {
      logger.publish(2, 'broker', 'start', `${process.env.MQTTS_BROKER_URL}`);
    } else {
      logger.publish(2, 'broker', 'start', `${process.env.MQTT_BROKER_URL}`);
    }

    broker.instance.preConnect = (client, cb) => {
      logger.publish(3, 'broker', 'preConnect:res', {
        connDetails: client.connDetails,
      });
      if (client.connDetails && client.connDetails.ipAddress) {
        client.ip = client.connDetails.ipAddress;
        client.type = client.connDetails.isWebsocket ? 'WS' : 'MQTT';
        return cb(null, true);
        // return rateLimiter.ipLimiter
        //   .get(client.ip)
        //   .then(res => cb(null, !res || res.consumedPoints < 100))
        //   .err(e => cb(e, null));
      }
      return cb(null, false);
    };

    broker.instance.authenticate = (client, username, password, cb) => {
      authenticate(client, username, password)
        .then(status => {
          logger.publish(2, 'broker', 'Authenticate:res', { status });
          if (status !== 0) {
            // const err = new Error('Auth error');
            // err.returnCode = status || 3;
            return cb({ returnCode: status || 3 }, null);
          }
          return cb(null, true);
        })
        .catch(e => {
          logger.publish(2, 'broker', 'Authenticate:err', e);
          return cb(e, null);
        });
    };

    broker.instance.authorizePublish = (client, packet, cb) => {
      if (authorizePublish(client, packet)) return cb(null);
      return cb(new Error('authorizePublish error'));
    };

    broker.instance.authorizeSubscribe = (client, packet, cb) => {
      if (authorizeSubscribe(client, packet)) return cb(null, packet);
      return cb(new Error('authorizeSubscribe error'));
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
     * @returns {function} Broker~delayedUpdateClientStatus
     */
    broker.instance.on('client', async client => {
      try {
        logger.publish(3, 'broker', 'onClientConnect', client.id);
        await delayedUpdateClientStatus(client, true);
      } catch (error) {
        logger.publish(2, 'broker', 'onClientConnect:err', error);
      }
    });

    /**
     * On client disconnected from Aedes broker
     * @event clientDisconnect
     * @param {object} client - MQTT client
     * @returns {function} Broker~delayedUpdateClientStatus
     */
    broker.instance.on('clientDisconnect', async client => {
      try {
        logger.publish(3, 'broker', 'onClientDisconnect', client.id);
        await delayedUpdateClientStatus(client, false);
        // await updateClientStatus(client, false);
      } catch (error) {
        logger.publish(2, 'broker', 'onClientDisconnect:err', error);
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

    /**
     * When client contains no Id
     * @event clientError
     * @param {object} client - MQTT client
     * @param {object} err - MQTT Error
     */
    broker.instance.on('connectionError', (client, err) => {
      logger.publish(2, 'broker', 'onConnectionError', { clientId: client.id, error: err.message });
      // client.close();
    });

    /**
     * When a packet with qos=1|2 is delivered successfully
     * @event ack
     * @param {object} packet - MQTT original packet
     * @param {object} client - MQTT client
     */
    // broker.instance.on("ack", (packet, client) => {
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
      brokers: broker.instance && broker.instance.brokers,
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
        // eslint-disable-next-line security/detect-object-injection
        config[key] = process.env[key];
      });
    }

    broker.config = {
      ...config,
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
      heartbeatInterval: 30000, // default : 60000
      connectTimeout: 2000, // prod : 2000;
      trustProxy: true,
      // trustProxy: () => {
      //   if (config.MQTT_TRUST_PROXY && config.MQTT_TRUST_PROXY === 'true') {
      //     return true;
      //   }
      //   return false;
      // },
      trustedProxies: [],
    };

    broker.instance = new aedes.Server(aedesConf);

    const tcpServer = net
      .createServer(broker.instance.handle)
      .listen(broker.config.interfaces[0].port, () => {
        logger.publish(
          2,
          'broker',
          'Setup',
          `MQTT broker ready, up and running @: ${broker.config.interfaces[0].port}`,
        );
      });

    tcpServer.on('close', () => {
      logger.publish(3, 'broker', 'mqtt broker closed', '');
    });

    tcpServer.on('error', err => {
      logger.publish(3, 'broker', 'mqtt-broker:err', err);
    });

    const httpServer = http.createServer().listen(broker.config.interfaces[1].port, () => {
      logger.publish(
        2,
        'broker',
        'Setup',
        `WS broker ready, up and running @: ${broker.config.interfaces[1].port}`,
      );
    });

    const wsServer = ws.createServer(
      { perMessageDeflate: false, server: httpServer },
      broker.instance.handle,
    );

    wsServer.on('close', () => {
      logger.publish(3, 'broker', 'ws broker closed', '');
    });

    wsServer.on('error', err => {
      // if (err.code === 'EADDRINUSE')
      logger.publish(3, 'broker', 'ws broker:err', err);
    });

    broker.instance.once('closed', () => {
      // wsServer.close();
      httpServer.close();
      tcpServer.close();
      if (
        broker.instance.brokers &&
        Object.keys(broker.instance.brokers).length === 0 &&
        broker.redis
      ) {
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
  setTimeout(() => broker.init(), 1500);
} else {
  logger.publish(1, 'broker', 'init:cluster', { pid: process.pid });
  process.on('message', packet => {
    console.log('PROCESS PACKET ', packet);
    if (typeof packet.id === 'number' && packet.data && packet.data.ready) {
      // broker.init();
      setTimeout(() => broker.init(true), 1000);
      process.send({
        type: 'process:msg',
        data: {
          isStarted: true,
        },
      });
    }
    if (packet.data.stopped) {
      process.emit('SIGINT');
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
