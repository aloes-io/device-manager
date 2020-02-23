/* Copyright 2019 Edouard Maleix, read LICENSE */

/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable global-require */
import { protocolDecoder } from 'aedes-protocol-decoder';
import axios from 'axios';
// import throttle from 'lodash.throttle';
import ws from 'websocket-stream';
import logger from '../services/logger';
import rateLimiter from '../services/rate-limiter';

/**
 * Aedes persistence layer
 * @method module:Broker~persistence
 * @param {object} config - Environment variables
 * @returns {function} aedesPersistence | aedesPersistenceRedis
 */
export const persistence = config => {
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
    maxSessionDelivery: 100, //   maximum offline messages deliverable on
    //   client CONNECT, default is 1000
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
 * @returns {function} MQEmitter | MQEmitterRedis
 */
export const emitter = config => {
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

export const initServers = (brokerInterfaces, brokerInstance) => {
  const tcpServer = require('net')
    .createServer(brokerInstance.handle)
    .listen(brokerInterfaces.mqtt.port, () => {
      logger.publish(
        2,
        'broker',
        'Setup',
        `MQTT broker ready, up and running @: ${brokerInterfaces.mqtt.port}`,
      );
    });

  tcpServer.on('close', () => {
    logger.publish(3, 'broker', 'MQTT broker closed', '');
  });

  tcpServer.on('error', err => {
    logger.publish(3, 'broker', 'MQTT broker:err', err);
  });

  const wsServer = require('http')
    .createServer()
    .listen(brokerInterfaces.ws.port, () => {
      logger.publish(
        2,
        'broker',
        'Setup',
        `WS broker ready, up and running @: ${brokerInterfaces.ws.port}`,
      );
    });

  ws.createServer({ perMessageDeflate: false, server: wsServer }, brokerInstance.handle);

  wsServer.on('close', () => {
    logger.publish(3, 'broker', 'WS broker closed', '');
  });

  wsServer.on('error', err => {
    logger.publish(3, 'broker', 'WS broker:err', err);
  });

  return { tcpServer, wsServer };
};

export const decodeProtocol = (client, buff) => {
  const proto = protocolDecoder(client, buff);
  logger.publish(4, 'broker', 'decodeProtocol:res', {
    proto,
  });
  return proto;
};

/**
 * Aedes preConnect hook
 *
 * Check client credentials and update client properties
 *
 * @method module:Broker~preConnect
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
export const preConnect = (client, cb) => {
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

/**
 * Transform circular MQTT client in JSON
 * @method module:Broker~getClientProps
 * @param {object} client - MQTT client
 * @returns {object} client
 */
export const getClientProps = client => {
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
  // logger.publish(5, 'broker', 'getClientProps:res', { client: clientObject
  // });
  return clientObject;
  /* eslint-enable security/detect-object-injection */
};

/**
 * Find clients connected to the broker
 * @method module:Broker~getClients
 * @param {object} broker - MQTT broker
 * @param {string} [id] - Client id
 * @returns {array|object}
 */
export const getClients = (broker, id) => {
  if (!broker.instance) return null;
  // eslint-disable-next-line security/detect-object-injection
  if (id && typeof id === 'string') return broker.instance.clients[id];
  return broker.instance.clients;
};

/**
 * Find in cache client ids subscribed to a specific topic pattern
 * @method module:Broker~getClientsByTopic
 * @param {object} broker - MQTT broker
 * @param {string} topic - Topic pattern
 * @returns {promise}
 */
export const getClientsByTopic = (broker, topic) =>
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
        logger.publish(5, 'broker', 'getClientsByTopic:res', { clients });
        resolve(clients);
      })
      .on('error', reject);
  });

export const getAloesClientTopic = clientId => {
  const aloesPrefix = `aloes-${process.env.ALOES_ID}`;
  const processId = clientId.substring(aloesPrefix.length + 1);
  return `${aloesPrefix}/${processId}`;
};

/**
 * Give an array of clientIds, return a connected client
 * @method module:Broker~pickRandomClient
 * @param {object} broker - MQTT broker
 * @param {string[]} clientIds - MQTT client Ids
 * @returns {object} client
 */
export const pickRandomClient = (broker, clientIds) => {
  try {
    if (!clientIds || clientIds === null) return null;
    const connectedClients = clientIds
      .map(clientId => {
        const client = getClients(broker, clientId);
        if (client) return clientId;
        return null;
      })
      .filter(val => val !== null);
    logger.publish(5, 'broker', 'pickRandomClient:req', { clientIds: connectedClients });
    const clientId = connectedClients[Math.floor(Math.random() * connectedClients.length)];
    const client = getClients(broker, clientId);
    logger.publish(5, 'broker', 'pickRandomClient:res', { clientId });
    return client;
  } catch (error) {
    logger.publish(3, 'broker', 'pickRandomClient:err', error);
    return null;
  }
};

/**
 * HTTP request to Aloes to validate credentials
 * @method module:Broker~authentificationRequest
 * @param {object} data - Client instance and credentials
 * @returns {promise}
 */
const authentificationRequest = async data => {
  const baseUrl = `${process.env.HTTP_SERVER_URL}${process.env.REST_API_ROOT}`;
  // const baseUrl =
  // `${process.env.HTTP_SERVER_URL}${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}`;
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
};

/**
 * Check client credentials and update client properties
 *
 * @method module:Broker~onAuthenticate
 * @param {object} broker - MQTT broker
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
export const onAuthenticate = async (broker, client, username, password) => {
  try {
    logger.publish(3, 'broker', 'onAuthenticate:req', {
      client: client.id || null,
      username,
    });
    if (!client || !client.id) return 1;
    if (!password || !username) return 4;

    let status, foundClient;
    foundClient = getClientProps(client);
    // if (!foundClient || !foundClient.id) return 5;
    if (!foundClient || !foundClient.id || !foundClient.ip) return 2;

    const trustProxy = broker.instance.trustProxy;
    const { limiter, limiterType, retrySecs } = await rateLimiter.getAuthLimiter(
      foundClient.ip,
      username,
    );
    if (retrySecs > 0) {
      if (limiter && limiterType) {
        // client.connDetails['Retry-After'] = String(retrySecs);
        // client.connDetails['X-RateLimit-Limit'] =
        // rateLimiter.limits[limiterType];
        // client.connDetails['X-RateLimit-Remaining'] =
        // limiter.remainingPoints; client.connDetails['X-RateLimit-Reset'] =
        // new Date(Date.now() + limiter.msBeforeNext);
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
      // todo : identify client model ( user || device || application ), using
      // client.id, username ?
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
          //   client.connDetails['Retry-After'] =
          //   String(Math.round(rlRejected.msBeforeNext / 1000)) || 1;
          //   client.connDetails['X-RateLimit-Limit'] =
          //   rlRejected.consumedPoints - 1;
          //   client.connDetails['X-RateLimit-Remaining'] =
          //   rlRejected.remainingPoints;
          //   client.connDetails['X-RateLimit-Reset'] = new Date(Date.now() +
          //   rlRejected.msBeforeNext);
        }
      }
    }

    return status;
  } catch (error) {
    logger.publish(2, 'broker', 'onAuthenticate:err', error);
    if (error.code === 'ECONNREFUSED') return 3;
    throw error;
  }
};

/**
 * Check client properties for publish access
 * @method module:Broker~onAuthorizePublish
 * @param {object} client - MQTT client
 * @param {object} packet - MQTT packet
 * @returns {boolean}
 */
export const onAuthorizePublish = (client, packet) => {
  const topic = packet.topic;
  if (!topic) return false;
  const topicParts = topic.split('/');
  const topicIdentifier = topicParts[0];
  logger.publish(5, 'broker', 'onAuthorizePublish:req', {
    topic: topicParts,
  });
  let auth = false;
  if (!client.user) return auth;
  if (topicIdentifier.startsWith(client.user)) {
    auth = true;
  } else if (
    client.aloesId &&
    topicIdentifier.startsWith(`aloes-${client.aloesId}`) &&
    (topicParts[2] === `tx` || topicParts[1] === `sync`)
  ) {
    auth = true;
  } else if (client.devEui && topicIdentifier.startsWith(client.devEui)) {
    // todo : limit access to device out prefix if any - /
    // endsWith(device.outPrefix)
    auth = true;
  } else if (client.appId && topicIdentifier.startsWith(client.appId)) {
    auth = true;
  } else if (client.appEui && topicIdentifier.startsWith(client.appEui)) {
    auth = true;
  }

  logger.publish(4, 'broker', 'onAuthorizePublish:res', { topic, auth });
  return auth;
};

/**
 * Check client properties for subscribe access
 * @method module:Broker~onAuthorizeSubscribe
 * @param {object} client - MQTT client
 * @param {object} packet - MQTT packet
 * @returns {boolean}
 */
export const onAuthorizeSubscribe = (client, packet) => {
  const topic = packet.topic;
  if (!topic) return false;
  let auth = false;
  if (!client.user) return auth;
  const topicParts = topic.split('/');
  const topicIdentifier = topicParts[0];
  logger.publish(5, 'broker', 'onAuthorizeSubscribe:req', {
    topic: topicParts,
  });
  if (topicIdentifier.startsWith(client.user)) {
    auth = true;
  } else if (
    client.aloesId &&
    topicIdentifier.startsWith(`aloes-${client.aloesId}`) &&
    (topicParts[2] === `rx` ||
      topicParts[2] === `tx` ||
      topicParts[2] === `status` ||
      topicParts[2] === `stop` ||
      topicParts[1] === `sync`)
  ) {
    //  packet.qos = packet.qos + 2
    auth = true;
  } else if (client.devEui && topicIdentifier.startsWith(client.devEui)) {
    // todo : limit access to device in prefix if any
    auth = true;
  } else if (client.appId && topicIdentifier.startsWith(client.appId)) {
    auth = true;
  } else if (client.appEui && topicIdentifier.startsWith(client.appEui)) {
    auth = true;
  }
  logger.publish(4, 'broker', 'onAuthorizeSubscribe:res', { topic, auth });
  return auth;
};

/**
 * Update client's status
 *
 * Triggered after clientConnect and clientDisconnect events
 *
 * @method module:Broker~updateClientStatus
 * @param {object} broker - MQTT broker
 * @param {object} client - MQTT client
 * @param {boolean} status - Client status
 * @returns {object} client
 */
export const updateClientStatus = async (broker, client, status) => {
  try {
    if (client && client.user) {
      const aloesClientsIds = await getClientsByTopic(broker, `aloes-${process.env.ALOES_ID}/sync`);
      if (!aloesClientsIds || aloesClientsIds === null) {
        throw new Error('No Aloes app client subscribed');
      }
      const foundClient = getClientProps(client);
      logger.publish(4, 'broker', 'updateClientStatus:req', { status, client: foundClient });
      if (!client.aloesId) {
        const aloesClient = pickRandomClient(broker, aloesClientsIds);
        if (!aloesClient || !aloesClient.id) throw new Error('No Aloes app client connected');
        const packet = {
          topic: `${getAloesClientTopic(aloesClient.id)}/status`,
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

// const delayedUpdateClientStatus = throttle(updateClientStatus, 50);

/**
 * Parse message coming from aloes MQTT clients
 * @method module:Broker~onPublished
 * @param {object} broker - MQTT broker
 * @param {object} packet - MQTT packet
 */
const onInternalPublished = (broker, packet) => {
  const topicParts = packet.topic.split('/');
  if (topicParts[2] === 'tx') {
    packet.topic = topicParts.slice(3, topicParts.length).join('/');
    packet.qos = 1;
    // packet.retain = false;
    // console.log('broker, reformatted packet to instance', packet);
    broker.publish(packet);
  } else if (topicParts[1] === 'sync') {
    console.log('ONSYNC', packet.payload);
  }
};

/**
 * Parse message coming from external MQTT clients
 * @method module:Broker~onPublished
 * @param {object} broker - MQTT broker
 * @param {object} packet - MQTT packet
 * @param {object} client - MQTT client
 */
const onExternalPublished = async (broker, packet, client) => {
  try {
    const aloesId = process.env.ALOES_ID;
    const aloesClientsIds = await getClientsByTopic(broker, `aloes-${aloesId}/sync`);
    if (!aloesClientsIds || aloesClientsIds === null) {
      throw new Error('No Aloes client connected');
    }
    const aloesClient = pickRandomClient(broker, aloesClientsIds);
    if (!aloesClient || !aloesClient.id) throw new Error('No Aloes client connected');
    const foundClient = getClientProps(client);
    packet.topic = `${getAloesClientTopic(aloesClient.id)}/rx/${packet.topic}`;

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

// const delayedOnExternalPublished = throttle(onExternalPublished, 5);

/**
 * Parse message sent to Aedes broker
 * @method module:Broker~onPublished
 * @param {object} broker - MQTT broker
 * @param {object} packet - MQTT packet
 * @param {object} client - MQTT client
 */
export const onPublished = async (broker, packet, client) => {
  if (!client || !client.id) return null;
  logger.publish(4, 'broker', 'onPublished:req', { topic: packet.topic });
  if (client.aloesId) return onInternalPublished(broker, packet, client);
  if (client.user && !client.aloesId) {
    return onExternalPublished(broker, packet, client);
    // return delayedOnExternalPublished(packet, client);
  }
  throw new Error('Invalid MQTT client');
};
