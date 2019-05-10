import mosca from 'mosca';
import iotAgent from 'iot-agent';
//  import redis from 'redis';
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
    logger.publish(2, 'broker', 'Start', `${process.env.MQTT_BROKER_URL}`);
    if (process.env.MQTTS_BROKER_URL) {
      logger.publish(2, 'broker', 'Start', `${process.env.MQTTS_BROKER_URL}`);
    }

    /**
     * Mosca authentification callback
     * @method module:Broker~authenticate
     * @param {object} client - MQTT client
     * @param {string} [username] - MQTT username
     * @param {object} [password] - MQTT password
     * @param {function} cb - callback
     * @returns {function}
     */
    const authenticate = (client, username, password, cb) => {
      try {
        logger.publish(4, 'broker', 'Authenticate:req', {
          client: client.id,
          username,
          password,
        });
        let auth = false;
        if (!password || password === null || !username || username === null) {
          //  client.user = 'guest';
          logger.publish(4, 'broker', 'Authenticate:res', 'missing credentials');
          auth = false;
          cb(null, auth);
          return auth;
        }
        return app.models.accessToken.findById(password.toString(), (err, token) => {
          if (err || !token) {
            auth = false;
            logger.publish(4, 'broker', 'Authenticate:res', 'invalid token');
            cb(null, auth);
            return auth;
          }
          if (token && token.userId && token.userId.toString() === username) {
            auth = true;
            client.user = username;
            if (token.devEui) {
              client.devEui = token.devEui;
            } else if (token.devAddr) {
              client.devAddr = token.devAddr;
            } else if (token.appEui) {
              client.appEui = token.appEui;
            }
          }
          logger.publish(4, 'broker', 'Authenticate:res', { username, auth });
          app.emit('publish', `${token.userId}/Auth/POST`, auth.toString(), false, 1);
          cb(null, auth);
          return auth;
        });
      } catch (error) {
        logger.publish(4, 'broker', 'Authenticate:err', error);
        cb(null, false);
        return false;
      }
    };

    /**
     * Mosca publish authorization callback
     * @method module:Broker~authorizePublish
     * @param {object} client - MQTT client
     * @param {string} topic - MQTT packet.topic
     * @param {object} payload - MQTT packet.payload
     * @param {function} cb - callback
     * @returns {function}
     */
    const authorizePublish = (client, topic, payload, cb) => {
      const topicParts = topic.split('/');
      let auth = false;
      if (client.user) {
        if (topicParts[0].startsWith(client.user)) {
          logger.publish(4, 'broker', 'authorizePublish:req', {
            user: client.user,
            topic: topicParts,
          });
          auth = true;
        } else if (client.devEui && topicParts[0].startsWith(client.devEui)) {
          logger.publish(4, 'broker', 'authorizePublish:req', {
            device: client.devEui,
            topic: topicParts,
          });
          auth = true;
        } else if (client.devAddr && topicParts[0].startsWith(client.devAddr)) {
          logger.publish(4, 'broker', 'authorizePublish:req', {
            device: client.devAddr,
            topic: topicParts,
          });
          auth = true;
        } else if (client.appEui && topicParts[0].startsWith(client.appEui)) {
          logger.publish(4, 'broker', 'authorizePublish:req', {
            application: client.appEui,
            topic: topicParts,
          });
          auth = true;
        }
        // if (client.admin) auth = true
      }
      logger.publish(3, 'broker', 'authorizePublish:res', { topic, auth });
      cb(null, auth);
    };

    /**
     * Mosca subscribe authorization callback
     * @method module:Broker~authorizeSubscribe
     * @param {object} client - MQTT client
     * @param {string} topic - MQTT packet.topic
     * @param {function} cb - callback
     * @returns {function}
     */
    const authorizeSubscribe = (client, topic, cb) => {
      const topicParts = topic.split('/');
      let auth = false;
      if (client.user) {
        if (topicParts[0].startsWith(client.user)) {
          logger.publish(5, 'broker', 'authorizeSubscribe:req', {
            user: client.user,
          });
          auth = true;
        } else if (client.devEui && topicParts[0].startsWith(client.devEui)) {
          logger.publish(5, 'broker', 'authorizeSubscribe:req', {
            device: client.devEui,
          });
          auth = true;
        } else if (client.devAddr && topicParts[0].startsWith(client.devAddr)) {
          logger.publish(5, 'broker', 'authorizeSubscribe:req', {
            device: client.devAddr,
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
      cb(null, auth);
    };
    /**
     * Mosca callbacks
     * @method module:Broker~setup
     */
    const setup = () => {
      app.broker.authenticate = authenticate;
      app.broker.authorizePublish = authorizePublish;
      app.broker.authorizeSubscribe = authorizeSubscribe;
      logger.publish(
        2,
        'broker',
        'Setup',
        `Mosca broker ready, up and running @: ${process.env.MQTT_BROKER_URL}`,
      );
    };

    app.broker.on('ready', setup);

    /**
     * Update device status from MQTT conection status
     * @method module:Broker~updateDeviceStatus
     * @param {object} client - MQTT client
     * @param {boolean} status - MQTT conection status
     * @returns {function}
     */
    const updateDeviceStatus = async (client, status) => {
      try {
        if (client.devEui && client.devEui !== null && client.id.startsWith(client.devEui)) {
          const device = await app.models.Device.findById(client.user);
          if (device && device !== null) {
            if (status) {
              return device.updateAttribute('status', true);
            }
            return device.updateAttributes({ frameCounter: 0, status: false });
          }
        } else if (
          client.devAddr &&
          client.devAddr !== null &&
          client.id.startsWith(client.devAddr)
        ) {
          const device = await app.models.Device.findById(client.user);
          if (device && device !== null) {
            if (status) {
              return device.updateAttribute('status', true);
            }
            return device.updateAttributes({ frameCounter: 0, status: false });
          }
        }
        return null;
      } catch (error) {
        return error;
      }
    };

    /**
     * Update application status from MQTT conection status
     * @method module:Broker~updateApplicationStatus
     * @param {object} client - MQTT client
     * @param {boolean} status - MQTT conection status
     * @returns {function}
     */
    const updateApplicationStatus = async (client, status) => {
      try {
        if (client.appEui && client.appEui !== null) {
          const externalApp = await app.models.Application.findById(client.user);
          if (externalApp && externalApp !== null) {
            if (status) {
              return externalApp.updateAttribute('status', true);
            }
            // todo : check that client.id contains externalApp.appEui || client.appEui
            // todo : update every device belonging to this app
            return externalApp.updateAttributes({ frameCounter: 0, status: false });
          }
        }
        return null;
      } catch (error) {
        return error;
      }
    };

    /**
     * Update models status from MQTT conection status and client properties
     * @method module:Broker~updateModelsStatus
     * @param {object} client - MQTT client
     * @param {boolean} status - MQTT conection status
     * @returns {function}
     */
    const updateModelsStatus = async (client, status) => {
      try {
        //  console.log('updateModelsStatus', status);
        if (client.user) {
          await updateDeviceStatus(client, status);
          await updateApplicationStatus(client, status);
        }
        return null;
      } catch (error) {
        return error;
      }
    };

    /**
     * On client connected to Mosca broker
     * @event clientConnected
     * @param {object} client - MQTT client
     * @returns {functions} updateModelsStatus
     */
    app.broker.on('clientConnected', async client => {
      try {
        //  if (!Object.prototype.hasOwnProperty.call(client, "id")) return null;
        logger.publish(4, 'broker', 'clientConnected:req', client.id);
        return updateModelsStatus(client, true);
      } catch (error) {
        return error;
      }
    });

    /**
     * On client disconnecting from Mosca broker
     * @event clientDisconnected
     * @param {object} client - MQTT client
     * @returns {functions} updateModelsStatus
     */
    app.broker.on('clientDisconnected', async client => {
      try {
        logger.publish(4, 'broker', 'clientDisconnected:req', client.id);
        return updateModelsStatus(client, false);
      } catch (error) {
        return error;
      }
    });

    /**
     * Detect application known pattern and load the application instance
     * @method module:Broker~externalAppDetector
     * @param {object} packet - MQTT packet
     * @param {object} client - MQTT client
     * @returns {object} pattern
     */
    const externalAppDetector = async (packet, client) => {
      try {
        // const pattern = {name: 'empty', params: null};
        if (packet.topic.split('/')[0] === '$SYS') return null;
        if (!client.appEui) return null;
        logger.publish(4, 'broker', 'externalAppDetector:req', packet.topic);
        const externalApplication = await app.models.Application.findOne({
          where: { appEui: client.appEui },
        });
        if (!externalApplication || externalApplication === null) {
          throw new Error('No application found');
        }
        //  console.log('externalAppDetector', externalApplication);
        const pattern = iotAgent.appPatternDetector(packet, externalApplication);
        logger.publish(4, 'broker', 'externalAppDetector:res', pattern);
        return pattern;
      } catch (error) {
        logger.publish(2, 'broker', 'externalAppDetector:err', error);
        return error;
      }
    };

    app.on('publish', (topic, payload, retain, qos) => {
      if (typeof payload === 'boolean') {
        payload = payload.toString();
      } else if (typeof payload === 'number') {
        payload = payload.toString();
      } else if (typeof payload === 'object') {
        //  console.log('publish buffer ?', payload instanceof Buffer);
        payload = JSON.stringify(payload);
        // if (!(payload instanceof Buffer)) {
        // }
      }
      logger.publish(5, 'broker', 'publish:topic', topic);
      logger.publish(5, 'broker', 'publish:payload', payload);
      if (!app.broker) return null;
      return app.broker.publish({
        topic,
        payload,
        retain,
        qos,
      });
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
        if (packet.topic.startsWith('$SYS')) {
          return null;
        }
        logger.publish(4, 'broker', 'findPattern:req', packet.topic);
        //  logger.publish(4, 'broker', 'on-published:payload', packet.payload.toString());
        //  if (!client || client.user) {
        // if (packet.topic.startsWith('$ALOES')) {
        //   let parts = packet.topic.split('/');
        //   parts = parts.slice(1, parts.length);
        //   packet.topic = parts.join('/');
        //   console.log('client topic', packet.topic);
        //   pattern = await iotAgent.patternDetector(packet);
        // }
        if (client && client.user) {
          pattern = await iotAgent.patternDetector(packet);
        } else if (client && client.appEui && client.appEui !== null) {
          pattern = await externalAppDetector(packet, client);
        } else if (!client) {
          pattern = await iotAgent.patternDetector(packet);
        }
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
     * Redirect parsed message to corresponding Loopback model
     * @method module:Broker~redirectMessage
     * @param {object} packet - MQTT packet
     * @param {object} pattern - IoTAgent retireved pattern
     * @returns {string} serviceName
     */
    const redirectMessage = async (packet, pattern) => {
      try {
        let serviceName = null;
        switch (pattern.name.toLowerCase()) {
          case 'aloesclient':
            // next, use pattern.direction , tx || rx
            if (pattern.subType === 'iot') {
              //  const method = pattern.params.method;
              const newPacket = await iotAgent.decode(packet, pattern.params);
              if (newPacket && newPacket.topic) {
                return app.emit('publish', newPacket.topic, newPacket.payload, false, 0);
              }
              return null;
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
        if (serviceName === null) throw new Error('protocol not supported');
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
    app.broker.on('published', async (packet, client) => {
      try {
        const pattern = await findPattern(packet, client);
        if (!pattern || !pattern.name || pattern instanceof Error) {
          throw new Error('no pattern found');
        }
        logger.publish(4, 'broker', 'onPublished:pattern', pattern.name);
        const serviceName = await redirectMessage(packet, pattern);
        logger.publish(4, 'broker', 'onPublished:service', serviceName);
        if (!serviceName || serviceName === null || serviceName instanceof Error) {
          throw new Error('no service redirection');
        }
        return app.models[serviceName].onPublish(pattern, packet, client);
      } catch (error) {
        logger.publish(2, 'broker', 'onPublish:err', error);
        return error;
      }
    });

    // app.broker.on("delivered", (packet, client) => {
    //   console.log("Delivered", packet, client.id);
    // });
    return app.broker;
  } catch (error) {
    logger.publish(2, 'broker', 'Start:err', error);
    return error;
  }
};

/**
 * Stop broker functions and update models status
 * @method module:Broker.stop
 * @param {object} app - Loopback app
 * @returns {boolean}
 */
broker.stop = async app => {
  try {
    logger.publish(2, 'broker', 'Stop', `${process.env.MQTT_BROKER_URL}`);
    app.broker.close();
    await app.models.Device.updateAll({ status: true }, { status: false });
    return true;
  } catch (error) {
    logger.publish(2, 'broker', 'Stop:err', error);
    return error;
  }
};

/**
 * Init MQTT Broker with new Mosca instance
 * @method module:Broker.init
 * @param {object} app - Loopback app
 * @param {object} httpServer - HTTP server to attach for websockets support
 * @param {object} conf - Env varirables
 * @returns {function} broker.start
 */
broker.init = (app, httpServer, config) => {
  try {
    // const ascoltatore = {
    //   type: 'redis',
    //   redis,
    //   db: Number(process.env.REDIS_MQTT_COLLECTION) || 2,
    //   host: process.env.REDIS_HOST,
    //   port: Number(process.env.REDIS_PORT),
    //   password: process.env.REDIS_PASS,
    //   //  return_buffers: true, // to handle binary payloads
    // };
    const brokerConfig = {
      port: Number(config.MQTT_BROKER_PORT),
      //  backend: ascoltatore,
      // persistence: {
      //   factory: mosca.persistence.Redis,
      //   host: process.env.REDIS_HOST,
      //   port: Number(process.env.REDIS_PORT),
      //   password: process.env.REDIS_PASS,
      //   //  channel: "moscaSync",
      //   //  ttl: {subscriptions: 3600 * 1000, packets: 3600 * 1000},
      // },
    };

    if (config.MQTTS_BROKER_URL) {
      // todo if fs.exists
      brokerConfig.secure = {
        port: Number(config.MQTTS_BROKER_PORT),
        keyPath: `${__dirname}/../../deploy/${config.MQTTS_BROKER_KEY}`,
        certPath: `${__dirname}/../../deploy/${config.MQTTS_BROKER_CERT}`,
      };
    }

    logger.publish(2, 'broker', 'Init', brokerConfig);

    app.broker = new mosca.Server(brokerConfig);
    app.broker.attachHttpServer(httpServer);

    app.broker.on('error', err => {
      logger.publish(4, 'broker', 'error', err);
    });

    app.broker.on('close', () => {
      logger.publish(4, 'broker', 'closed');
    });

    return broker.start(app);
  } catch (error) {
    logger.publish(2, 'broker', 'Init:err', error);
    return error;
  }
};

export default broker;
