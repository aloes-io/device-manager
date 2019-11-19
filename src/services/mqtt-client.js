/* Copyright 2019 Edouard Maleix, read LICENSE */

/* eslint-disable no-underscore-dangle */
import mqtt from 'async-mqtt';
import EventEmitter from 'events';
import throttle from 'lodash.throttle';
import logger from './logger';

/**
 * @module MQTTClient
 */

const MQTTClient = new EventEmitter();
// const pubsubVersion = process.env.PUBSUSB_API_VERSION;

let mqttClient;

const serviceNames = ['Device', 'Application', 'Sensor'];

const onDeviceStatus = (app, client, status) => {
  app.models.Device.emit('client', { client, status });
};

const deviceStatusUpdate = throttle(onDeviceStatus, 50);

const onApplicationStatus = (app, client, status) => {
  app.models.Application.emit('client', { client, status });
};

const appStatusUpdate = throttle(onApplicationStatus, 50);

/**
 * Update models status from MQTT connection status and client properties
 * @method module:MQTTClient~updateModelsStatus
 * @param {object} app - Loopback app
 * @param {object} client - MQTT client
 * @param {boolean} status - MQTT conection status
 */
const updateModelsStatus = (app, client, status) => {
  try {
    logger.publish(3, 'mqtt-client', 'updateModelsStatus:req', { status });
    if (client && client.user) {
      if (client.devEui) {
        deviceStatusUpdate(app, client, status);
      } else if (client.appId) {
        appStatusUpdate(app, client, status);
      }
    }
    return null;
  } catch (error) {
    return null;
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
    logger.publish(3, 'mqtt-client', 'findPattern:res', { topic: packet.topic, pattern });
    if (
      !pattern ||
      pattern === null ||
      !pattern.name ||
      pattern.name === 'empty' ||
      !pattern.params
    ) {
      return null;
    }
    return pattern;
  } catch (error) {
    logger.publish(3, 'mqtt-client', 'findPattern:err', error);
    return null;
  }
};

/**
 * Redirect parsed message to corresponding Loopback model || device
 * @method module:MQTTClient~redirectMessage
 * @param {object} packet - MQTT packet
 * @param {object} pattern - IoTAgent retireved pattern
 * @returns {string} serviceName
 */
const redirectMessage = (packet, client, pattern) => {
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
    return null;
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
    }
    logger.publish(4, 'mqtt-client', 'setInstancePayload:res', typeof payload);
    return payload;
  } catch (error) {
    logger.publish(3, 'mqtt-client', 'setInstancePayload:err', typeof payload);
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
 * @returns {function} module:MQTTClient~updateModelsStatus
 */
const onStatus = async (app, topic, payload) => {
  try {
    logger.publish(3, 'mqtt-client', 'onStatus:req', { topic });
    payload = setBrokerPayload(payload);
    const client = payload.client;
    const status = payload.status;
    return updateModelsStatus(app, client, status);
  } catch (error) {
    logger.publish(2, 'mqtt-client', 'onStatus:err', error);
    return null;
  }
};

const onModelPublish = (app, serviceName, pattern, packet, client) => {
  logger.publish(3, 'mqtt-client', 'onModelPublish:req', { serviceName });
  if (!serviceNames.some(name => name.toLowerCase() === serviceName.toLowerCase())) return;
  // eslint-disable-next-line security/detect-object-injection
  const Model = app.models[serviceName];
  if (Model) Model.emit('publish', { pattern, packet, client });
};

// const debounceModelPublish = throttle(onModelPublish, 10);

/**
 * Called when message arrived from the broker to be redirected to the right Model
 * @method module:MQTTClient~onReceive
 * @param {object} app - Loopback app
 * @param {object} topic - MQTT topic
 * @param {object} payload - MQTT payload
 * @fires Application.publish
 * @fires Device.publish
 */
const onReceive = async (app, topic, payload) => {
  try {
    logger.publish(3, 'mqtt-client', 'onReceive:req', { topic });
    payload = setBrokerPayload(payload);
    const client = payload.client;
    const packet = { topic, payload: setInstancePayload(payload.payload) };
    const pattern = await findPattern(app, packet, client);
    if (!pattern || !pattern.name) {
      return null;
      //  throw new Error('no pattern found');
    }
    // set payload based on pattern found ?
    const serviceName = redirectMessage(packet, client, pattern);
    if (!serviceName || serviceName === null) {
      throw new Error('no service redirection');
    }
    logger.publish(4, 'mqtt-client', 'onReceive:res', serviceName);
    // debounceModelPublish
    onModelPublish(app, serviceName, pattern, packet, client);
    return packet;
  } catch (error) {
    logger.publish(2, 'mqtt-client', 'onReceive:err', error);
    return null;
  }
};

/**
 * Parse the message arriving from the broker
 * @method module:MQTTClient~onMessage
 * @param {object} app - Loopback app
 * @param {object} topic - MQTT topic
 * @param {object} payload - MQTT payload
 * @returns {functions} MQTTClient~onStatus
 * @returns {functions} MQTTClient~onReceive
 */
const onMessage = async (app, topic, payload) => {
  try {
    const topicParts = topic.split('/');
    logger.publish(4, 'mqtt-client', 'onMessage:req', { topic: topicParts });
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
    logger.publish(2, 'mqtt-client', 'onMessage:err', error);
    return null;
  }
};

/**
 * Event reporting that MQTTClient is connected.
 * @event module:MQTTClient.message
 * @param {object} app - Loopback app
 * @param {object} topic - MQTT topic
 * @param {object} payload - MQTT payload
 * @returns {function} MQTTClient~onMessage
 */
MQTTClient.on('message', onMessage);

/**
 * Event reporting that MQTTClient is connected.
 * @event module:MQTTClient.connect
 * @param {object} packet - Connection packet
 */
MQTTClient.on('connect', packet => {
  logger.publish(4, 'mqtt-client', 'connect:req', packet);
});

/**
 * Event reporting that MQTTClient is disconnected.
 * @event module:MQTTClient.offline
 * @param {object} packet - Will packet
 */
MQTTClient.on('offline', packet => {
  logger.publish(4, 'mqtt-client', 'offline:req', packet);
});

/**
 * Setup MQTT client listeners
 * @method module:MQTTClient~startClient
 * @param {string} clientId - MQTT clientId
 */
const startClient = async clientId => {
  try {
    // topic = `${pubsubVersion}/${clientId}/status``
    await mqttClient.subscribe(`${clientId}/rx/#`, { qos: 1 });
    await mqttClient.subscribe(`${clientId}/status`, { qos: 1 });
    await mqttClient.subscribe(`aloes-${process.env.ALOES_ID}/sync`, { qos: 2 });
  } catch (error) {
    logger.publish(4, 'mqtt-client', 'startClient:err', error);
  }
};

/**
 * Event reporting that MQTTClient has to start.
 * @event module:MQTTClient.start
 * @returns {function} MQTTClient~startClient
 */
MQTTClient.on('start', startClient);

/**
 * Setup MQTT client connection
 * @method module:MQTTClient~initClient
 * @param {object} app - Loopback app
 * @param {object} config - Environment variables
 * @returns {boolean} status
 */
const initClient = async (app, config) => {
  try {
    let mqttBrokerUrl, clientId;
    if (typeof config.processId === 'number') {
      clientId = process.env.INSTANCES_PREFIX
        ? `aloes-${config.ALOES_ID}-${process.env.INSTANCES_PREFIX}-${config.processId}`
        : `aloes-${config.ALOES_ID}-${config.processId}`;
    } else {
      clientId = `aloes-${config.ALOES_ID}`;
    }
    MQTTClient.id = clientId;
    logger.publish(4, 'mqtt-client', 'init:req', {
      clientId,
      processId: config.processId,
    });

    const mqttClientOptions = {
      keepalive: 60,
      reschedulePings: true,
      protocolId: 'MQTT',
      protocolVersion: 4,
      reconnectPeriod: 1000,
      connectTimeout: 2 * 1000,
      clean: false,
      clientId,
      username: config.ALOES_ID,
      password: config.ALOES_KEY,
      // will: { topic: `${clientId}/status`, payload: 'KO?', retain: false, qos: 0 },
    };

    if (config.MQTT_BROKER_URL) {
      if (config.MQTTS_BROKER_URL) {
        mqttClientOptions.port = Number(config.MQTTS_BROKER_PORT);
        if (config.MQTTS_SELF_SIGNED_CERT) {
          mqttClientOptions.rejectUnauthorized = false;
        }
        mqttBrokerUrl = config.MQTTS_BROKER_URL;
      } else {
        mqttClientOptions.port = Number(config.MQTT_BROKER_PORT);
        mqttBrokerUrl = config.MQTT_BROKER_URL;
      }
    }

    mqttClient = await mqtt.connectAsync(mqttBrokerUrl, mqttClientOptions);

    mqttClient.on('error', err => {
      logger.publish(4, 'mqtt-client', 'error', err);
    });

    mqttClient.on('connect', packet => {
      MQTTClient.emit('connect', packet);
    });

    mqttClient.on('offline', packet => {
      MQTTClient.emit('offline', packet);
    });

    // mqttClient.on('message', (topic, payload) => {
    //   MQTTClient.emit('message', app, topic, payload);
    // });

    const handleMessage = (packet, cb) => {
      onMessage(app, packet.topic, packet.payload)
        .then(() => cb())
        .catch(() => cb());
    };

    mqttClient.handleMessage = handleMessage;

    await startClient(clientId);
    logger.publish(3, 'mqtt-client', 'init:res', mqttClientOptions);
    return true;
  } catch (error) {
    logger.publish(2, 'mqtt-client', 'init:err', error);
    // await mqttClient.end()
    return false;
  }
};

/**
 * Event reporting that MQTTClient has to init.
 * @event module:MQTTClient.init
 * @param {object} app - Loopback app
 * @param {object} config - Formatted config.
 * @returns {function} MQTTClient~initClient
 */
MQTTClient.on('init', initClient);

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
    // topic = `${pubsubVersion}/${MQTTClient.id}/tx/${topic}`;
    topic = `${MQTTClient.id}/tx/${topic}`;
    if (!mqttClient) throw new Error('MQTT Client unavailable');
    await mqttClient.publish(topic, payload, { qos, retain });
    logger.publish(3, 'mqtt-client', 'publish:topic', topic);
    return true;
  } catch (error) {
    logger.publish(2, 'mqtt-client', 'publish:err', error);
    return false;
    // throw error;
  }
};

/**
 * Stop MQTT client and unsubscribe
 * @method module:MQTTClient~stopClient
 * @returns {boolean} status
 */
const stopClient = async () => {
  try {
    if (mqttClient && mqttClient.connected) {
      logger.publish(2, 'mqtt-client', 'stopping client ', MQTTClient.id);
      mqttClient.unsubscribe([
        `aloes-${process.env.ALOES_ID}/sync`,
        `${MQTTClient.id}/status`,
        `${MQTTClient.id}/rx/#`,
      ]);
      //  mqttClient.unsubscribe(`${MQTTClient.id}/status`);
      // await mqttClient.unsubscribe(`${MQTTClient.id}/rx/#`);
      mqttClient.end();
      // await mqttClient.end();
    }
    logger.publish(2, 'mqtt-client', 'stopped', MQTTClient.id);
    return true;
  } catch (error) {
    logger.publish(2, 'mqtt-client', 'stopped:err', error);
    return false;
  }
};

/**
 * Event reporting that MQTTClient has to stop.
 * @event module:MQTTClient.stop
 * @returns {function} MQTTClient~stopClient
 */
MQTTClient.on('stop', stopClient);

export default MQTTClient;
