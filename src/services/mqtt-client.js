/* eslint-disable no-underscore-dangle */
import mqtt from 'async-mqtt';
import logger from './logger';

/**
 * @module MQTTClient
 */
const MQTTClient = { id: `aloes-${process.env.ALOES_ID}` };
let mqttClient;

/**
 * Update models status from MQTT conection status and client properties
 * @method module:MQTTClient~updateModelsStatus
 * @param {object} app - Loopback app
 * @param {object} client - MQTT client
 * @param {boolean} status - MQTT conection status
 */
const updateModelsStatus = async (app, client, status) => {
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
 * Retrieve pattern from packet.topic
 * @method module:MQTTClient~findPattern
 * @param {object} app - Loopback app
 * @param {object} packet - MQTT packet
 * @param {object} client - MQTT client
 * @returns {object} pattern
 */
const findPattern = async (app, packet, client) => {
  try {
    let pattern = null;
    logger.publish(4, 'mqtt-client', 'findPattern:req', client);
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
    }
    // else {
    //   pattern = await app.models.Device.detector(packet);
    //   //  pattern = await aloesClientPatternDetector(packet);
    // }
    logger.publish(4, 'mqtt-client', 'findPattern:res', { topic: packet.topic, pattern });
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
 * @method module:MQTTClient~redirectMessage
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

const setBrokerPayload = payload => {
  logger.publish(4, 'mqtt-client', 'setBrokerPayload:req', typeof payload);
  try {
    if (typeof payload === 'string') {
      payload = JSON.parse(payload);
    } else if (typeof payload === 'object') {
      if (Buffer.isBuffer(payload)) {
        payload = JSON.parse(payload.toString());
      }
    }
    logger.publish(4, 'mqtt-client', 'setBrokerPayload:res', typeof payload);
    return payload;
  } catch (error) {
    logger.publish(4, 'mqtt-client', 'setBrokerPayload:err', typeof payload);
    return payload;
  }
};

const setInstancePayload = payload => {
  logger.publish(4, 'mqtt-client', 'setInstancePayload:req', typeof payload);
  try {
    // console.log('incoming payload', payload);
    if (typeof payload === 'string') {
      payload = JSON.parse(payload);
    }
    if (typeof payload === 'object') {
      if (payload.type && payload.data) {
        payload = Buffer.from(payload);
        // payload = Buffer.from(payload).toString();
        // payload = JSON.parse(Buffer.from(payload.data).toString());
      }
      // else {
      //   payload = payload.toString();
      //   // payload = JSON.parse(payload.toString());
      // }
    }
    logger.publish(4, 'mqtt-client', 'setInstancePayload:res', typeof payload);
    return payload;
  } catch (error) {
    logger.publish(4, 'mqtt-client', 'setInstancePayload:err', typeof payload);
    if (typeof payload === 'string') {
      payload = Buffer.from(payload, 'binary');
      // console.log('outgoing payload', payload);
    }
    return payload;
  }
};

/**
 * Called when status message has been detected
 * @method module:MQTTClient~onStatus
 * @param {object} app - Loopback app
 * @param {object} topic - MQTT topic
 * @param {object} payload - MQTT payload
 * @returns {functions} module:MQTTClient~updateModelsStatus
 */
const onStatus = async (app, topic, payload) => {
  try {
    logger.publish(4, 'mqtt-client', 'onStatus:req', { topic });
    payload = setBrokerPayload(payload);
    const client = payload.client;
    const status = payload.status;
    return updateModelsStatus(app, client, status);
  } catch (error) {
    return error;
  }
};

/**
 * Called when message arrived from the broker to be redirected to the right Model
 * @method module:MQTTClient~onReceive
 * @param {object} app - Loopback app
 * @param {object} topic - MQTT topic
 * @param {object} payload - MQTT payload
 * @fires {functions} publish
 */
const onReceive = async (app, topic, payload) => {
  try {
    logger.publish(4, 'mqtt-client', 'onReceive:req', { topic });
    payload = setBrokerPayload(payload);
    const client = payload.client;
    const packet = { topic, payload: setInstancePayload(payload.payload) };
    const pattern = await findPattern(app, packet, client);
    if (!pattern || !pattern.name || pattern instanceof Error) {
      return null;
      //  throw new Error('no pattern found');
    }
    // set payload based on pattern found ?
    const serviceName = await redirectMessage(packet, client, pattern);
    if (!serviceName || serviceName === null || serviceName instanceof Error) {
      throw new Error('no service redirection');
    }
    logger.publish(4, 'mqtt-client', 'onPublished:service', serviceName);
    return app.models[serviceName].emit('publish', { pattern, packet, client });
  } catch (error) {
    return error;
  }
};

/**
 * Parse the message arriving from the broker
 * @method module:MQTTClient~onMessage
 * @param {object} app - Loopback app
 * @param {object} topic - MQTT topic
 * @param {object} payload - MQTT payload
 * @returns {functions} module:MQTTClient~onStatus
 * @returns {functions} module:MQTTClient~onReceive
 */
const onMessage = async (app, topic, payload) => {
  try {
    const topicParts = topic.split('/');
    logger.publish(5, 'mqtt-client', 'onMessage:req', { topic: topicParts });
    if (topicParts[1] === 'status') {
      return onStatus(app, topic, payload);
    } else if (topicParts[1] === 'rx') {
      topic = topicParts.slice(2, topicParts.length).join('/');
      return onReceive(app, topic, payload);
    } else if (topicParts[1] === 'sync') {
      console.log('ONSYNC', payload);
    }
    return null;
  } catch (error) {
    logger.publish(4, 'mqtt-client', 'onMessage:err', error);
    return error;
  }
};

/**
 * Setup MQTT client connection
 * @method module:MQTTClient.init
 * @param {object} app - Loopback app
 * @param {object} config - Environment variables
 * @returns {boolean} status
 */
MQTTClient.init = async (app, config) => {
  try {
    if (typeof config.processId === 'number') {
      MQTTClient.id = `aloes-${process.env.ALOES_ID}-${config.processId}`;
    } else {
      MQTTClient.id = `aloes-${process.env.ALOES_ID}`;
    }

    logger.publish(4, 'mqtt-client', 'init:req', { clientId: MQTTClient.id });

    let mqttBrokerUrl;
    const mqttClientOptions = {
      //  keepalive: 60,
      // reschedulePings: true,
      port: Number(config.MQTT_BROKER_PORT),
      host: config.MQTT_BROKER_HOST,
      protocolId: 'MQTT',
      protocolVersion: 4,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
      clean: false,
      clientId: MQTTClient.id,
      username: process.env.ALOES_ID,
      password: process.env.ALOES_KEY,
    };

    if (config.MQTT_BROKER_URL) {
      if (config.MQTTS_BROKER_URL) {
        mqttClientOptions.port = Number(config.MQTTS_BROKER_PORT);
        if (process.env.MQTTS_SELF_SIGNED_CERT) {
          mqttClientOptions.rejectUnauthorized = false;
        }
        mqttBrokerUrl = config.MQTTS_BROKER_URL;
      } else {
        mqttClientOptions.port = Number(config.MQTT_BROKER_PORT);
        mqttBrokerUrl = config.MQTT_BROKER_URL;
      }
    }

    mqttClient = mqtt.connect(mqttBrokerUrl, mqttClientOptions);

    mqttClient.on('error', err => {
      logger.publish(4, 'mqtt-client', 'error', err);
    });

    await mqttClient.subscribe(`aloes-${process.env.ALOES_ID}/sync`, {
      qos: 2,
      retain: false,
    });
    await mqttClient.subscribe(`${MQTTClient.id}/status`, {
      qos: 0,
      retain: false,
    });
    await mqttClient.subscribe(`${MQTTClient.id}/rx/#`, {
      qos: 0,
      retain: false,
    });

    mqttClient.on('connect', async packet => {
      try {
        logger.publish(4, 'mqtt-client', 'connect:req', packet);
        // MQTTClient.id = clientId;
        return packet;
      } catch (error) {
        logger.publish(4, 'mqtt-client', 'connect:err', error);
        return error;
      }
    });

    mqttClient.on('offline', async packet => {
      try {
        logger.publish(4, 'mqtt-client', 'offline:req', packet);
        // delete MQTTClient.id;
        // await mqttClient.unsubscribe(`aloes-${process.env.ALOES_ID}/sync`);
        // await mqttClient.unsubscribe(`${clientId}/status`);
        // await mqttClient.unsubscribe(`${clientId}/rx/#`);
        return packet;
      } catch (error) {
        return error;
      }
    });

    mqttClient.on('message', async (topic, payload) => onMessage(app, topic, payload));

    // logger.publish(4, 'mqtt-client', 'init:res', mqttClientOptions);
    return true;
  } catch (error) {
    logger.publish(2, 'mqtt-client', 'init:err', error);
    return false;
  }
};

/**
 * Convert payload and topic before publish
 * @method module:MQTTClient.publish
 * @param {string} topic - Packet topic
 * @param {any} payload - Packet payload
 * @returns {boolean} status
 */
MQTTClient.publish = async (topic, payload, retain = false, qos = 0) => {
  try {
    if (typeof payload === 'boolean') {
      payload = payload.toString();
    } else if (typeof payload === 'number') {
      payload = payload.toString();
    } else if (typeof payload === 'object') {
      //  console.log('publish buffer ?', payload instanceof Buffer);
      try {
        payload = JSON.stringify(payload);
      } catch (error) {
        payload = Buffer.from(payload.toString());
      }
    }
    // topic = `aloes-${process.env.ALOES_ID}/tx/${topic}`;
    topic = `${MQTTClient.id}/tx/${topic}`;
    if (!mqttClient) throw new Error('MQTT Client unavailable');
    await mqttClient.publish(topic, payload, { qos, retain });
    logger.publish(4, 'mqtt-client', 'publish:topic', topic);
    return true;
  } catch (error) {
    logger.publish(2, 'mqtt-client', 'publish:err', error);
    throw error;
    // return false;
  }
};

/**
 * Stop MQTT client and unsubscribe
 * @method module:MQTTClient.stop
 * @returns {boolean} status
 */
MQTTClient.stop = async () => {
  try {
    if (mqttClient) {
      await mqttClient.unsubscribe(`aloes-${process.env.ALOES_ID}/sync`);
      await mqttClient.unsubscribe(`${MQTTClient.id}/status`);
      await mqttClient.unsubscribe(`${MQTTClient.id}/rx/#`);
      await mqttClient.end();
    }
    logger.publish(2, 'mqtt-client', 'stopped', MQTTClient.id);
    return true;
  } catch (error) {
    logger.publish(2, 'mqtt-client', 'stopped:err', error);
    return false;
  }
};

export default MQTTClient;
