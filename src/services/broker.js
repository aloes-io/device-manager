/* Copyright 2020 Edouard Maleix, read LICENSE */

import aedes from 'aedes';
import nodeCleanup from 'node-cleanup';
import {
  decodeProtocol,
  emitter,
  initServers,
  onAuthenticate,
  onAuthorizePublish,
  onAuthorizeSubscribe,
  onPublished,
  persistence,
  updateClientStatus,
} from '../lib/services/broker';
import envVariablesKeys from '../initial-data/variables-keys.json';
import logger from './logger';
import { version } from '../../package.json';

require('dotenv').config();

// process.env.PUBSUB_API_VERSION = `v${version.substr(0,3)}`;

/**
 * @module Broker
 */
const broker = {
  config: {},
  version,
};

/**
 * Error callback
 * @callback module:Broker~aedesCallback
 * @param {error} ErrorObject
 * @param {result}
 */

/**
 * Aedes preConnect hook
 *
 * Check client connection details
 *
 * @method module:Broker~preConnect
 * @param {object} client - MQTT client
 * @param {aedesCallback} cb
 * @returns {cb}
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
 * Aedes authentification hook
 *
 * @method module:Broker~authenticate
 * @param {object} client - MQTT client
 * @param {string} [username] - MQTT username
 * @param {object} [password] - MQTT password
 * @param {aedesCallback} cb
 * @returns {aedesCallback}
 */
const authenticate = (client, username, password, cb) =>
  onAuthenticate(client, username, password)
    .then((status) => {
      logger.publish(3, 'broker', 'authenticate:res', { status });
      if (status !== 0) {
        return cb({ returnCode: status || 3 }, null);
      }
      return cb(null, true);
    })
    .catch((e) => {
      logger.publish(2, 'broker', 'authenticate:err', e);
      return cb(e, null);
    });

/**
 * Aedes publish authorization callback
 *
 * @method module:Broker~authorizePublish
 * @param {object} client - MQTT client
 * @param {object} packet - MQTT packet
 * @param {aedesCallback} cb
 * @returns {aedesCallback}
 */
const authorizePublish = (client, packet, cb) =>
  onAuthorizePublish(client, packet) ? cb(null) : cb(new Error('authorizePublish error'));

/**
 * Aedes subscribe authorization callback
 *
 * @method module:Broker~authorizeSubscribe
 * @param {object} client - MQTT client
 * @param {object} packet - MQTT packet
 * @param {aedesCallback} cb
 * @returns {aedesCallback}
 */
const authorizeSubscribe = (client, packet, cb) =>
  onAuthorizeSubscribe(client, packet)
    ? cb(null, packet)
    : cb(new Error('authorizeSubscribe error'));

// const authorizeForward = (client, packet) => {
//   // use this to avoid user sender to see its own message on other clients
//   const topic = packet.topic;
//   const topicParts = topic.split('/');
//   logger.publish(3, 'broker', 'authorizeForward:req', {
//     user: client && client.user,
//     topic: topicParts,
//   });
//   if (!client) return packet;
//   // if (topicParts[0].startsWith(client.user)) {
//   //   // if (topicParts[0].startsWith(`aloes-${process.env.ALOES_ID}`)) {
//   //   return null;
//   // }
//   return packet;
// };

/**
 * Aedes publised hook
 *
 * @method module:Broker~published
 * @param {object} packet - MQTT packet
 * @param {object} client - MQTT client
 * @param {aedesCallback} cb
 * @returns {aedesCallback}
 */
const published = (packet, client, cb) =>
  onPublished(broker, packet, client)
    .then(() => cb())
    .catch(() => cb());
/**
 * Convert payload before publish
 * @method module:Broker.publish
 * @param {object} packet - MQTT Packet
 * @returns {function} broker.instance.publish
 */
broker.publish = (packet) => {
  // if (typeof packet.payload === 'boolean') {
  //   packet.payload = packet.payload.toString();
  // } else if (typeof packet.payload === 'number') {
  //   packet.payload = packet.payload.toString();
  // } else if (typeof packet.payload === 'string') {
  //   packet.payload = Buffer.from(packet.payload);
  // } else
  if (typeof packet.payload === 'object' && !Buffer.isBuffer(packet.payload)) {
    // console.log('publish buffer ?', !Buffer.isBuffer(packet.payload));
    //  packet.payload = JSON.stringify(packet.payload);
    packet.payload = Buffer.from(packet.payload);
  }
  // logger.publish(2, 'broker', 'publish:res', { topic:
  // `${pubsubVersion}/${packet.topic}` });
  logger.publish(3, 'broker', 'publish:res', { topic: packet.topic });
  return broker.instance.publish(packet);
};

/**
 * Setup broker connection
 * @method module:Broker.start
 * @returns {boolean} status
 */
broker.start = () => {
  logger.publish(
    2,
    'broker',
    'start',
    `${process.env.MQTTS_BROKER_URL || process.env.MQTT_BROKER_URL}`,
  );

  /**
   * On client connected to Aedes broker
   * @event client
   * @param {object} client - MQTT client
   * @returns {Promise<function>} Broker~updateClientStatus
   */
  broker.instance.on('client', async (client) => {
    logger.publish(3, 'broker', 'onClientConnect', client.id);
    return updateClientStatus(broker, client, true);
  });

  /**
   * On client disconnected from Aedes broker
   * @event clientDisconnect
   * @param {object} client - MQTT client
   * @returns {Promise<function>} Broker~updateClientStatus
   */
  broker.instance.on('clientDisconnect', async (client) => {
    logger.publish(3, 'broker', 'onClientDisconnect', client.id);
    return updateClientStatus(broker, client, false);
  });

  /**
   * When client keep alive timeout
   * @event keepaliveTimeout
   * @param {object} client - MQTT client
   */
  broker.instance.on('keepaliveTimeout', (client) => {
    logger.publish(3, 'broker', 'onKeepaliveTimeout', client.id);
  });

  /**
   * When client action creates an error
   * @event clientError
   * @param {object} client - MQTT client
   * @param {object} err - MQTT Error
   */
  broker.instance.on('clientError', (client, err) => {
    logger.publish(3, 'broker', 'onClientError', { clientId: client.id, error: err.message });
  });

  /**
   * When client contains no Id
   * @event clientError
   * @param {object} client - MQTT client
   * @param {object} err - MQTT Error
   */
  broker.instance.on('connectionError', (client, err) => {
    logger.publish(3, 'broker', 'onConnectionError', { clientId: client.id, error: err.message });
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
};

/**
 * Stop broker and update models status
 * @method module:Broker.stop
 * @returns {Promise<boolean>}
 */
broker.stop = async () => {
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
  if (broker.instance) {
    await broker.instance.close();
  }
  return true;
};

/**
 * Init MQTT and WS Broker with new Aedes instance
 * @method module:Broker.init
 * @returns {function} broker.start
 */
broker.init = () => {
  const config = {};

  envVariablesKeys.forEach((key) => {
    // eslint-disable-next-line security/detect-object-injection
    config[key] = process.env[key];
  });

  broker.config = {
    ...config,
    interfaces: {
      mqtt: { port: Number(config.MQTT_BROKER_PORT) },
      ws: { port: Number(config.WS_BROKER_PORT) },
    },
  };

  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line global-require
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
    connectTimeout: 2000,
    decodeProtocol,
    preConnect,
    authenticate,
    published,
    authorizePublish,
    authorizeSubscribe,
    // authorizeForward,
    trustProxy: true,
    trustedProxies: [],
  };

  broker.instance = new aedes.Server(aedesConf);

  const { tcpServer, wsServer } = initServers(broker.config.interfaces, broker.instance);

  broker.instance.once('closed', () => {
    tcpServer.close();
    wsServer.close();
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
};

// todo create init emitter and more process communication in a lib
if (!process.env.CLUSTER_MODE || process.env.CLUSTER_MODE === 'false') {
  logger.publish(1, 'broker', 'init:single', { pid: process.pid });
  setTimeout(() => broker.init(), 1500);
} else {
  logger.publish(1, 'broker', 'init:cluster', { pid: process.pid });
  process.on('message', (packet) => {
    // console.log('PROCESS PACKET ', packet);
    if (typeof packet.id === 'number' && packet.data && packet.data.ready) {
      // broker.init();
      setTimeout(() => broker.init(), 1000);
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
  if (signal && signal !== null) {
    logger.publish(1, 'broker', 'exit:req', { exitCode, signal, pid: process.pid });
    broker.stop();
    setTimeout(() => process.kill(process.pid, signal), 5000);
    nodeCleanup.uninstall();
    return false;
  }
  return true;
});

export default broker;
