import mosca from 'mosca';
import iotAgent from 'iot-agent';
//  import redis from 'redis';
import logger from './logger';

const broker = {};

broker.init = (app, httpServer) => {
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
    port: Number(process.env.MQTT_BROKER_PORT),
    //  backend: ascoltatore,
    // interfaces: [
    //   {type: "mqtt", port: Number(process.env.MQTT_BROKER_PORT)},
    //   //  { type: "mqtts", port: brokerPortSecure, credentials: { keyPath: privateKeyPath, certPath: certificatePath } },
    // ],
    // persistence: {
    //   factory: mosca.persistence.Redis,
    //   host: process.env.REDIS_HOST,
    //   port: Number(process.env.REDIS_PORT),
    //   password: process.env.REDIS_PASS,
    //   //  channel: "moscaSync",
    //   //  ttl: {subscriptions: 3600 * 1000, packets: 3600 * 1000},
    // },
  };

  app.broker = new mosca.Server(brokerConfig);
  app.broker.attachHttpServer(httpServer);
  broker.start(app);
};

broker.close = async app => {
  try {
    await app.models.Device.updateAll({ status: true }, { status: false });
    logger.publish(4, 'broker', 'close', process.env.MQTT_BROKER_URL);
    return app.broker.close();
  } catch (error) {
    return error;
  }
};

broker.start = app => {
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

  function setup() {
    app.broker.authenticate = authenticate;
    app.broker.authorizePublish = authorizePublish;
    app.broker.authorizeSubscribe = authorizeSubscribe;
    logger.publish(
      2,
      'broker',
      'Setup',
      `Mosca broker ready, up and running @: ${process.env.MQTT_BROKER_URL}`,
    );
  }

  app.broker.on('ready', setup);

  app.broker.on('error', err => {
    logger.publish(4, 'broker', 'error', err);
  });

  app.broker.on('clientConnected', async client => {
    try {
      //  if (!Object.prototype.hasOwnProperty.call(client, "id")) return null;
      logger.publish(4, 'broker', 'clientConnected:req', client.id);
      if (client.user) {
        if (client.devEui && client.devEui !== null && client.id.startsWith(client.devEui)) {
          const device = await app.models.Device.findById(client.user);
          if (device && device !== null) {
            return device.updateAttribute('status', true);
          }
        } else if (
          client.devAddr &&
          client.devAddr !== null &&
          client.id.startsWith(client.devAddr)
        ) {
          const device = await app.models.Device.findById(client.user);
          if (device && device !== null) {
            return device.updateAttribute('status', true);
          }
        } else if (client.appEui && client.appEui !== null) {
          // todo : check that client.id contains externalApp.appEui || client.appEui
          const externalApp = await app.models.Application.findById(client.user);
          if (externalApp && externalApp !== null) {
            return externalApp.updateAttribute('status', true);
          }
        }
      }
      return null;
    } catch (error) {
      return error;
    }
  });

  app.broker.on('clientDisconnected', async client => {
    try {
      logger.publish(4, 'broker', 'clientDisconnected:req', client.id);
      if (client.user) {
        if (client.devEui && client.devEui !== null && client.id.startsWith(client.devEui)) {
          const device = await app.models.Device.findById(client.user);
          if (device && device !== null) {
            return device.updateAttributes({ frameCounter: 0, status: false });
          }
        } else if (
          client.devAddr &&
          client.devAddr !== null &&
          client.id.startsWith(client.devAddr)
        ) {
          const device = await app.models.Device.findById(client.user);
          if (device && device !== null) {
            return device.updateAttributes({ frameCounter: 0, status: false });
          }
        } else if (client.appEui && client.appEui !== null) {
          const externalApp = await app.models.Application.findById(client.user);
          if (externalApp && externalApp !== null) {
            // todo : check that client.id contains externalApp.appEui || client.appEui
            // todo : update every device belonging to this app
            return externalApp.updateAttributes({ frameCounter: 0, status: false });
          }
        }
      }
      return null;
    } catch (error) {
      return error;
    }
  });

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
    //  topic = `$ALOES/${topic}`;
    //  logger.publish(4, 'broker', 'publish:topic', topic);
    //  logger.publish(4, 'broker', 'publish:payload', payload);
    app.broker.publish({
      topic,
      payload,
      retain,
      qos,
    });
  });

  app.broker.on('published', async (packet, client) => {
    try {
      let pattern = null;
      let serviceName = null;
      if (packet.topic.startsWith('$SYS')) {
        return null;
      }
      logger.publish(4, 'broker', 'on-published:topic', packet.topic);
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
        !pattern.params
      ) {
        throw new Error('invalid pattern');
      }
      //  logger.publish(2, 'broker', 'onPublish:pattern', pattern);
      logger.publish(4, 'broker', 'onPublished:pattern', pattern.name);
      switch (pattern.name.toLowerCase()) {
        case 'aloesclient':
          // next, use pattern.direction , tx || rx
          if (pattern.subType === 'iot') {
            //  const method = pattern.params.method;
            const newPacket = await iotAgent.decode(packet, pattern.params);
            logger.publish(2, 'broker', 'onPublished:decode', newPacket);
            if (newPacket && newPacket.topic) {
              return app.emit('publish', newPacket.topic, newPacket.payload, false, 0);
            }
            // if (method === 'POST' || method === 'PUT') {
            return null;
            // } else if (method === 'GET') {
            //   const sensorId = JSON.parse(packet.payload);
            //   const data = await app.models.Sensor.findById(sensorId);
            //   const newPacket = await iotAgent.publish({
            //     userId: data.ownerId,
            //     collectionName: 'Sensor',
            //     data,
            //     //  modelId: data.id,
            //     method: 'PUT',
            //     pattern: 'aloesClient',
            //   });
            //   if (newPacket && newPacket.topic && newPacket.payload) {
            //     return Sensor.app.publish(newPacket.topic, newPacket.payload);
            //   }
            // }
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
      return app.models[serviceName].onPublish(pattern, packet, client);
    } catch (error) {
      if (!error) {
        return new Error('invalid pattern');
      }
      logger.publish(2, 'broker', 'onPublish:err', error);
      return error;
    }
  });

  // app.broker.on("delivered", (packet, client) => {
  //   console.log("Delivered", packet, client.id);
  // });
};

export default broker;
