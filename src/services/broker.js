import MQEmitterRedis from 'mqemitter-redis';
import aedesPersistenceRedis from 'aedes-persistence-redis';
import aedes from 'aedes';
import Redis from 'ioredis';
import net from 'net';
import tls from 'tls';
import ws from 'websocket-stream';
import fs from 'fs';
import logger from './logger';

/**
 * @module Broker
 */
const broker = {};

/**
 * Setup broker functions
 * @method module:Broker.start
 * @param {object} app - Loopback app
 * @returns {object} app.broker
 */
broker.start = app => {
  try {
    logger.publish(2, 'broker', 'start', `${process.env.MQTT_BROKER_URL}`);
    if (process.env.MQTTS_BROKER_URL) {
      logger.publish(2, 'broker', 'start', `${process.env.MQTTS_BROKER_URL}`);
    }

    const Client = app.models.Client;

    /**
     * Aedes authentification callback
     * @method module:Broker~authenticate
     * @param {object} client - MQTT client
     * @param {string} [username] - MQTT username
     * @param {object} [password] - MQTT password
     * @param {function} cb - callback
     * @returns {function}
     */
    app.broker.authenticate = async (client, username, password, cb) => {
      try {
        logger.publish(4, 'broker', 'Authenticate:req', {
          client: client.id,
          username,
        });

        let status = false;
        if (!password || password === null || !username || username === null) {
          //  client.user = 'guest';
          const error = new Error('Auth error');
          error.returnCode = 4;
          logger.publish(4, 'broker', 'Authenticate:res', 'missing credentials');
          status = false;
          return cb(error, status);
          //  return auth;
        }
        // todo : find a way to verify in auth request, against which model authenticate
        //  console.log("client parser", client.parser)
        let foundClient = JSON.parse(await Client.get(client.id));
        if (!foundClient || !foundClient.id) {
          foundClient = { id: client.id, type: 'MQTT' };
        }
        const token = await app.models.accessToken.findById(password.toString());
        if (token && token.userId && token.userId.toString() === username) {
          status = true;
          foundClient.model = 'User';
          client.ownerId = token.userId;
          foundClient.ownerId = token.userId;
        }
        let authentification;
        let successPayload = status.toString();
        if (!status) {
          authentification = await app.models.Device.authenticate(username, password.toString());
          if (authentification && authentification.device && authentification.keyType) {
            const instance = authentification.device;
            if (instance.devEui && instance.devEui !== null) {
              status = true;
              client.devEui = instance.devEui;
              successPayload = instance;
              foundClient.devEui = instance.devEui;
              foundClient.model = 'Device';
            } else if (instance.devAddr && instance.devAddr !== null) {
              status = true;
              client.devAddr = instance.devAddr;
              successPayload = instance;
              foundClient.devAddr = instance.devAddr;
              foundClient.model = 'Device';
            }
          }
        }

        if (!status) {
          authentification = await app.models.Application.authenticate(
            username,
            password.toString(),
          );
          if (authentification && authentification.application && authentification.keyType) {
            const instance = authentification.application;
            if (instance && instance.id) {
              client.appId = instance.id;
              foundClient.appId = instance.id;
              foundClient.model = 'Application';
              successPayload = instance;
              status = true;
              if (instance.appEui && instance.appEui !== null) {
                client.appEui = instance.appEui;
                foundClient.appEui = instance.appEui;
              }
            }
          }
        }

        if (status) {
          if (!successPayload) {
            successPayload = status.toString();
          }

          const ttl = 1 * 60 * 60 * 1000;
          client.user = username;
          foundClient.user = username;
          await Client.set(client.id, JSON.stringify(foundClient), ttl);
          logger.publish(4, 'broker', 'Authenticate:res', { client: foundClient });
          await app.publish(`${username}/${foundClient.model}/HEAD`, successPayload, true, 1);
          return cb(null, status);
        }

        const error = new Error('Auth error');
        error.returnCode = 2;
        status = false;
        logger.publish(4, 'broker', 'Authenticate:res', 'invalid token');
        cb(error, status);
        return status;
      } catch (error) {
        logger.publish(4, 'broker', 'Authenticate:err', error);
        return cb(null, false);
        //  return false;
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
    app.broker.authorizePublish = async (client, packet, cb) => {
      try {
        const topic = packet.topic;
        const topicParts = topic.split('/');
        // allow max access with valid tls cert config
        let auth = false;
        if (client.user) {
          if (topicParts[0].startsWith(client.user)) {
            logger.publish(5, 'broker', 'authorizePublish:req', {
              user: client.user,
              topic: topicParts,
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
          // if (client.admin) auth = true
        }
        if (auth === false) {
          const error = new Error('authorizePublish error');
          error.returnCode = 3;
          return cb(error);
        }
        logger.publish(3, 'broker', 'authorizePublish:res', { topic, auth });
        return cb(null);
      } catch (error) {
        cb(error, null);
        return error;
      }
    };

    /**
     * Aedes subscribe authorization callback
     * @method module:Broker~authorizeSubscribe
     * @param {object} client - MQTT client
     * @param {object} sub - MQTT packet
     * @param {function} cb - callback
     * @returns {function}
     */
    app.broker.authorizeSubscribe = async (client, sub, cb) => {
      try {
        const topic = sub.topic;
        const topicParts = topic.split('/');
        let auth = false;
        // todo leave minimum access with apikey
        // allow max access with valid tls cert config
        if (client.user) {
          if (topicParts[0].startsWith(client.user)) {
            logger.publish(5, 'broker', 'authorizeSubscribe:req', {
              user: client.user,
            });
            auth = true;
          } else if (client.devEui && topicParts[0].startsWith(client.devEui)) {
            // todo limit access to device in prefix if any
            logger.publish(5, 'broker', 'authorizeSubscribe:req', {
              device: client.devEui,
            });
            auth = true;
          } else if (client.devAddr && topicParts[0].startsWith(client.devAddr)) {
            // todo limit access to device in prefix if any - endsWith(device.inPrefix)
            logger.publish(5, 'broker', 'authorizeSubscribe:req', {
              device: client.devAddr,
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
            //  sub.qos = sub.qos + 2
          }
        }
        if (auth === false) {
          const error = new Error('authorizeSubscribe error');
          //  error.returnCode = 3;
          return cb(error, null);
        }
        logger.publish(3, 'broker', 'authorizeSubscribe:res', { topic, auth });
        return cb(null, sub);
      } catch (error) {
        cb(error, null);
        return error;
      }
    };

    // app.broker.published = async client => {

    // };

    /**
     * Update models status from MQTT conection status and client properties
     * @method module:Broker~updateModelsStatus
     * @param {object} client - MQTT client
     * @param {boolean} status - MQTT conection status
     */
    const updateModelsStatus = async (client, status) => {
      try {
        if (client.user) {
          await app.models.Device.emit('client', { client, status });
          await app.models.Application.emit('client', { client, status });
        }
        return null;
      } catch (error) {
        return error;
      }
    };

    /**
     * On client connected to Aedes broker
     * @event client
     * @param {object} client - MQTT client
     * @returns {functions} updateModelsStatus
     */
    app.broker.on('client', async client => {
      try {
        logger.publish(4, 'broker', 'clientConnected:req', client.id);
        return updateModelsStatus(client, true);
      } catch (error) {
        return error;
      }
    });

    /**
     * On client disconnecting from Aedes broker
     * @event clientDisconnect
     * @param {object} client - MQTT client
     * @returns {functions} updateModelsStatus
     */
    app.broker.on('clientDisconnect', async client => {
      try {
        logger.publish(4, 'broker', 'clientDisconnect:req', client.id);
        // if no client connected  startsWith(client.id.split("-")[0])
        return updateModelsStatus(client, false);
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
    app.broker.on('keepaliveTimeout', async client => {
      try {
        logger.publish(4, 'broker', 'keepaliveTimeout:req', client.id);
        return updateModelsStatus(client, false);
      } catch (error) {
        return error;
      }
    });

    /**
     * Retrieve pattern from packet.topic
     * @method module:Broker~findPattern
     * @param {object} packet - MQTT packet
     * @param {object} client - MQTT client
     * @returns {object} pattern
     */
    const findPattern = async (packet, client) => {
      try {
        let pattern = null;
        logger.publish(5, 'broker', 'findPattern:req', packet.topic);
        if (client && client.id) {
          if (client.appId && client.appId !== null) {
            pattern = await app.models.Application.detector(packet, client);
          } else if (client.appEui && client.appEui !== null) {
            pattern = await app.models.Application.detector(packet, client);
          } else if (client.devEui && client.devEui !== null) {
            pattern = await app.models.Device.detector(packet, client);
          } else {
            pattern = await app.models.Device.detector(packet, client);
          }
        } else {
          pattern = await app.models.Device.detector(packet);
          //  pattern = await aloesClientPatternDetector(packet);
        }
        logger.publish(5, 'broker', 'findPattern:res', { topic: packet.topic, pattern });
        if (
          !pattern ||
          pattern === null ||
          !pattern.name ||
          pattern.name === 'empty' ||
          !pattern.params ||
          pattern instanceof Error
        ) {
          throw new Error('invalid pattern');
        }
        return pattern;
      } catch (error) {
        return error;
      }
    };

    /**
     * Redirect parsed message to corresponding Loopback model || device
     * @method module:Broker~redirectMessage
     * @param {object} packet - MQTT packet
     * @param {object} pattern - IoTAgent retireved pattern
     * @returns {string} serviceName
     */
    const redirectMessage = async (packet, client, pattern) => {
      try {
        let serviceName = null;
        switch (pattern.name.toLowerCase()) {
          case 'aloesclient':
            if (!client || client === null) {
              serviceName = null;
            } else if (client.devEui && client.devEui !== null) {
              serviceName = 'Device';
            } else if (client.appEui && client.appEui !== null) {
              serviceName = 'Application';
            } else if (client.appId && client.appId !== null) {
              serviceName = 'Application';
            } else if (client.ownerId && client.ownerId !== null) {
              serviceName = 'Device';
            }
            break;
          case 'aloeslight':
            serviceName = 'Device';
            break;
          case 'mysensors':
            serviceName = 'Device';
            break;
          case 'lorawan':
            serviceName = 'Application';
            break;
          default:
            serviceName = 'Application';
        }
        return serviceName;
      } catch (error) {
        return error;
      }
    };

    /**
     * On message published to Mosca broker
     * @event published
     * @param {object} packet - MQTT packet
     * @param {object} client - MQTT client
     */
    app.broker.on('publish', async (packet, client) => {
      try {
        logger.publish(5, 'broker', 'onPublished:topic', packet.topic);
        const pattern = await findPattern(packet, client);
        if (!pattern || !pattern.name || pattern instanceof Error) {
          return null;
          //  throw new Error('no pattern found');
        }
        const serviceName = await redirectMessage(packet, client, pattern);
        if (!serviceName || serviceName === null || serviceName instanceof Error) {
          throw new Error('no service redirection');
        }
        logger.publish(5, 'broker', 'onPublished:service', serviceName);
        return app.models[serviceName].emit('publish', { pattern, packet, client });
      } catch (error) {
        // logger.publish(2, 'broker', 'onPublish:err', error);
        return error;
      }
    });

    app.broker.on('clientError', (client, err) => {
      console.log('broker : client error', client.id, err.message);
    });

    app.broker.on('connectionError', (client, err) => {
      console.log('broker : connection error', client.clean, err.message);
      // client.close();
      //  console.log('broker : connection error', client, err.message, err.stack);
    });

    // app.broker.on("delivered", (packet, client) => {
    //   console.log("Delivered", packet, client.id);
    // });

    return app.broker;
  } catch (error) {
    //  logger.publish(2, 'broker', 'start:err', error);
    return error;
  }
};

/**
 * Stop broker and update models status
 * @method module:Broker.stop
 * @param {object} app - Loopback app
 * @returns {boolean}
 */
broker.stop = async app => {
  try {
    //  logger.publish(2, 'broker', 'stop', `${process.env.MQTT_BROKER_URL}`);
    app.broker.close(err => {
      if (err) throw err;
    });
    logger.publish(4, 'broker', 'stopped', `${process.env.MQTT_BROKER_URL}`);
    //  broker.redis.del("clients");
    broker.redis.flushdb();
    await app.models.Device.updateAll({ status: true }, { status: false, clients: [] });
    await app.models.Application.updateAll({ status: true }, { status: false, clients: [] });
    await app.models.Client.deleteAll();
    return true;
  } catch (error) {
    logger.publish(2, 'broker', 'stop:err', error);
    return error;
  }
};

const persistence = config =>
  aedesPersistenceRedis({
    port: Number(config.REDIS_PORT),
    host: config.REDIS_HOST,
    family: 4, // 4 (IPv4) or 6 (IPv6)
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
 * @param {object} app - Loopback app
 * @param {object} httpServer - HTTP server to attach for websockets support
 * @param {object} conf - Env varirables
 * @returns {function} broker.start
 */
broker.init = (app, httpServer, config) => {
  try {
    const brokerConfig = {
      interfaces: [{ type: 'mqtt', port: Number(config.MQTT_BROKER_PORT) }],
    };
    broker.emitter = emitter(config);
    broker.persistence = persistence(config);

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

    const aedesConf = {
      //  mq: broker.emitter,
      //  persistence: broker.persistence,
      concurrency: 100,
      heartbeatInterval: 60000,
      connectTimeout: 30000,
    };

    if (config.MQTTS_BROKER_URL) {
      brokerConfig.interfaces[1] = {
        type: 'mqtts',
        port: Number(config.MQTTS_BROKER_PORT),
        credentials: {
          //  key: fs.readFileSync(`${__dirname}/../../deploy/${config.MQTTS_BROKER_KEY}`),
          key: fs.readFileSync(`${config.MQTTS_BROKER_KEY}`),
          cert: fs.readFileSync(`${config.MQTTS_BROKER_CERT}`),
        },
      };
    }

    app.broker = new aedes.Server(aedesConf);

    const mqttBroker = net.createServer(app.broker.handle);
    mqttBroker.listen(brokerConfig.interfaces[0].port, () => {
      logger.publish(
        2,
        'broker',
        'Setup',
        `MQTT broker ready, up and running @: ${config.MQTT_BROKER_URL}`,
      );
    });

    ws.createServer(
      {
        server: httpServer,
      },
      app.broker.handle,
    );

    if (config.MQTTS_BROKER_URL) {
      const mqttsBroker = tls.createServer(
        brokerConfig.interfaces[1].credentials,
        app.broker.handle,
      );

      mqttsBroker.listen(brokerConfig.interfaces[1].port, () => {
        logger.publish(
          2,
          'broker',
          'Setup',
          `MQTT broker ready, up and running @: ${config.MQTTS_BROKER_URL}`,
        );
      });
    }

    // app.broker.on('closed', () => {
    //   logger.publish(4, 'broker', 'closed');
    // });

    return broker.start(app);
  } catch (error) {
    logger.publish(2, 'broker', 'init:err', error);
    return error;
  }
};

export default broker;
