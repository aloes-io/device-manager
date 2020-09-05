/* Copyright 2020 Edouard Maleix, read LICENSE */

/* eslint-disable no-underscore-dangle */
import mqtt from 'async-mqtt';
import EventEmitter from 'events';
import logger from './logger';

/**
 * @module MQTTClient
 */

let mqttClient;
// const pubsubVersion = process.env.PUBSUSB_API_VERSION;

const MQTTClient = new EventEmitter();
MQTTClient.failureCount = 0;
MQTTClient.maxFailureCount = 10;

const baseOptions = {
  keepalive: 60,
  reschedulePings: true,
  reconnectPeriod: 2000,
  connectTimeout: 2 * 1000,
  clean: false,
  clientId: null,
  username: null,
  password: null,
};

const modelNames = { device: 'Device', application: 'Application', sensor: 'Sensor', user: 'user' };

const setClientId = (config) => {
  const prefix = `aloes-${config.ALOES_ID}`;
  const clientId = process.env.INSTANCES_PREFIX
    ? `${prefix}-${process.env.INSTANCES_PREFIX}-${config.processId}`
    : `${prefix}-${config.processId}`;

  MQTTClient.id = clientId;
  MQTTClient.processId = clientId.substring(prefix.length + 1) || 0;
};

const getBaseTopic = () => `aloes-${process.env.ALOES_ID}/${MQTTClient.processId}`;

const onDeviceStatus = (app, client, status) => {
  app.models.Device.emit('client', { client, status });
};

const onApplicationStatus = (app, client, status) => {
  app.models.Application.emit('client', { client, status });
};

const onUserStatus = (app, client, status) => {
  app.models.User.emit('client', { client, status });
};

/**
 * Update models status from MQTT connection status and client properties
 * @method module:MQTTClient~updateModelsStatus
 * @param {object} app - Loopback app
 * @param {object} client - MQTT client
 * @param {boolean} status - MQTT conection status
 */
const updateModelsStatus = (app, client, status) => {
  logger.publish(4, 'mqtt-client', 'updateModelsStatus:req', { status, client });
  if (client && client.user && client.model) {
    switch (client.model.toLowerCase()) {
      case 'application':
        onApplicationStatus(app, client, status);
        break;
      case 'device':
        onDeviceStatus(app, client, status);
        break;
      case 'user':
        onUserStatus(app, client, status);
        break;
      default:
        logger.publish(
          2,
          'mqtt-client',
          'updateModelsStatus:req',
          `Invalid client mode ${client.model}`,
        );
    }
  }
};

/**
 * Retrieve pattern from packet.topic
 * @method module:MQTTClient~findPattern
 * @param {object} app - Loopback app
 * @param {object} packet - MQTT packet
 * @param {object} client - MQTT client
 * @returns {Promise<object | null>} pattern
 */
const findPattern = async (app, packet, client) => {
  let pattern = null;
  logger.publish(3, 'mqtt-client', 'findPattern:req', client);
  if (client && client.model) {
    const modelName = modelNames[client.model.toLowerCase()];
    // eslint-disable-next-line security/detect-object-injection
    pattern = await app.models[modelName].detector(packet, client);
  }

  logger.publish(3, 'mqtt-client', 'findPattern:res', { topic: packet.topic, pattern });
  if (!pattern || !pattern.name || pattern.name === 'empty' || !pattern.params) {
    return null;
  }
  return pattern;
};

/**
 * Redirect parsed message to corresponding Loopback model
 * @method module:MQTTClient~redirectMessage
 * @param {object} packet - MQTT packet
 * @param {object} client - MQTT client
 * @param {object} pattern - IoTAgent extracted pattern
 * @returns {string} modelName
 */
const redirectMessage = (packet, client, pattern) => {
  let modelName = null;
  switch (pattern.name.toLowerCase()) {
    case 'aloesclient':
      if (client.devEui && client.devEui !== null) {
        modelName = 'Device';
      } else if (client.ownerId && client.ownerId !== null) {
        modelName = 'Device';
      } else if (client.appId && client.appId !== null) {
        modelName = 'Application';
      }
      // else if (client.appEui && client.appEui !== null) {
      //   modelName = 'Application';
      // }
      break;
    case 'aloeslight':
      modelName = 'Device';
      break;
    case 'mysensors':
      modelName = 'Device';
      break;
    case 'lorawan':
      modelName = 'Application';
      break;
    default:
      modelName = 'Application';
  }
  logger.publish(4, 'mqtt-client', 'redirectMessage:res', modelName);
  return modelName;
};

const setBrokerPayload = (payload) => {
  logger.publish(5, 'mqtt-client', 'setBrokerPayload:req', typeof payload);
  try {
    if (typeof payload === 'string') {
      payload = JSON.parse(payload);
    } else if (typeof payload === 'object' && Buffer.isBuffer(payload)) {
      payload = JSON.parse(payload.toString());
    }
    logger.publish(5, 'mqtt-client', 'setBrokerPayload:res', typeof payload);
    return payload;
  } catch (error) {
    logger.publish(3, 'mqtt-client', 'setBrokerPayload:err', typeof payload);
    return payload;
  }
};

const setInstancePayload = (payload) => {
  logger.publish(3, 'mqtt-client', 'setInstancePayload:req', typeof payload);
  try {
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
    logger.publish(3, 'mqtt-client', 'setInstancePayload:res', typeof payload);
    return payload;
  } catch (error) {
    logger.publish(3, 'mqtt-client', 'setInstancePayload:err', typeof payload);
    if (typeof payload === 'string') {
      payload = Buffer.from(payload, 'binary');
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
 * @returns {boolean} status
 */
const onStatus = (app, topic, payload) => {
  logger.publish(4, 'mqtt-client', 'onStatus:req', { topic });
  payload = setBrokerPayload(payload);
  const { client, status } = payload;
  if (client) {
    updateModelsStatus(app, client, status);
  }
  return status;
};

/**
 * Event called when message arrived from the broker
 *
 * Will be redirected to the right Model
 *
 * @method module:MQTTClient~onReceive
 * @param {object} app - Loopback app
 * @param {object} topic - MQTT topic
 * @param {object} payload - MQTT payload
 * @fires Application.publish
 * @fires Device.publish
 * @returns {Promise<object>} packet
 */
const onReceive = async (app, topic, payload) => {
  try {
    logger.publish(3, 'mqtt-client', 'onReceive:req', { topic });
    payload = setBrokerPayload(payload);
    const client = payload.client;
    const packet = { topic, payload: setInstancePayload(payload.payload) };
    const pattern = await findPattern(app, packet, client);
    if (!pattern || !pattern.name) {
      throw new Error('no pattern found');
    }
    // set payload based on pattern found ?
    const modelName = redirectMessage(packet, client, pattern);
    // eslint-disable-next-line security/detect-object-injection
    const Model = app.models[modelName];
    if (Model) {
      Model.emit('publish', { pattern, packet, client });
    }
    logger.publish(4, 'mqtt-client', 'onReceive:res', packet);
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
 * @returns {Promise<function | null>} MQTTClient~onStatus | MQTTClient~onReceive
 */
const onMessage = async (app, topic, payload) => {
  const topicParts = topic.split('/');
  const cmdTopic = topicParts[2];
  logger.publish(3, 'mqtt-client', 'onMessage:req', { topic: topicParts });
  if (cmdTopic === 'status') {
    return onStatus(app, topic, payload);
  } else if (cmdTopic === 'rx') {
    topic = topicParts.slice(3, topicParts.length).join('/');
    return onReceive(app, topic, payload);
  }
  // else if (cmdTopic === 'sync') {
  //   console.log('ONSYNC', payload);
  // }
  return null;
};

/**
 * Setup MQTT client listeners
 * @method module:MQTTClient~startClient
 * @returns {Promise<boolean>} status
 */
const startClient = async () => {
  // topic = `${pubsubVersion}/${clientId}/status`
  logger.publish(2, 'mqtt-client', 'startClient:req', { baseTopic: getBaseTopic() });
  await mqttClient.subscribe(`${getBaseTopic()}/rx/#`, { qos: 1 });
  await mqttClient.subscribe(`${getBaseTopic()}/status`, { qos: 1 });
  await mqttClient.subscribe(`aloes-${process.env.ALOES_ID}/sync`, { qos: 2 });
  return true;
};

/**
 * Event reporting that MQTTClient has to start.
 * @event module:MQTTClient.start
 * @returns {Promise<function>} MQTTClient~startClient
 */
MQTTClient.on('start', startClient);

/**
 * Setup MQTT client connection
 * @method module:MQTTClient~initClient
 * @param {object} app - Loopback app
 * @param {object} config - Environment variables
 * @returns {Promise<boolean>} status
 */
const initClient = async (app, config) => {
  try {
    setClientId(config);
    logger.publish(3, 'mqtt-client', 'initClient:req', {
      clientId: MQTTClient.id,
      clientProcessId: MQTTClient.processId,
    });

    const mqttClientOptions = {
      ...baseOptions,
      clientId: MQTTClient.id,
      username: config.ALOES_ID,
      password: config.ALOES_KEY,
      // will: { topic: `${clientId}/status`, payload: 'KO?', retain: false,
      // qos: 0 },
    };

    // if (config.MQTTS_BROKER_URL) {
    //   mqttClientOptions.rejectUnauthorized = config.MQTTS_SELF_SIGNED_CERT === undefined;
    //   mqttBrokerUrl = config.MQTTS_BROKER_URL;
    // } else if (config.MQTT_BROKER_URL) {
    //   mqttBrokerUrl = config.MQTTS_BROKER_URL ? config.MQTTS_BROKER_URL : config.MQTT_BROKER_URL;
    // }
    mqttClientOptions.rejectUnauthorized = config.MQTTS_SELF_SIGNED_CERT === undefined;
    const mqttBrokerUrl = config.MQTTS_BROKER_URL
      ? config.MQTTS_BROKER_URL
      : config.MQTT_BROKER_URL;

    mqttClient = await mqtt.connectAsync(mqttBrokerUrl, mqttClientOptions);
    MQTTClient.failureCount = 0;

    mqttClient.on('error', (err) => {
      logger.publish(2, 'mqtt-client', 'error', err);
    });

    // mqttClient.on('connect', packet => {
    //   logger.publish(4, 'mqtt-client', 'connect:req', packet);
    // });

    mqttClient.on('offline', (packet) => {
      logger.publish(3, 'mqtt-client', 'offline:req', packet);
    });

    const handleMessage = (packet, cb) => {
      onMessage(app, packet.topic, packet.payload)
        .then(() => cb())
        .catch(() => cb());
    };

    mqttClient.handleMessage = handleMessage;

    logger.publish(3, 'mqtt-client', 'initClient:res', mqttClientOptions);
    return startClient();
  } catch (error) {
    logger.publish(2, 'mqtt-client', 'initClient:err', error);
    if (MQTTClient.failureCount <= MQTTClient.maxFailureCount) {
      MQTTClient.failureCount += 1;
      return setTimeout(() => initClient(app, config), baseOptions.reconnectPeriod);
    }
    // else await mqttClient.end(true);
    return false;
  }
};

/**
 * Event reporting that MQTTClient has to init.
 * @event module:MQTTClient.init
 * @param {object} app - Loopback app
 * @param {object} config - Formatted config.
 * @returns {Promise<function>} MQTTClient~initClient
 */
MQTTClient.on('init', initClient);

/**
 * Convert payload and topic before publish
 * @method module:MQTTClient.publish
 * @param {string} topic - Packet topic
 * @param {any} payload - Packet payload
 * @returns {Promise<boolean>} status
 */
MQTTClient.publish = async (topic, payload, retain = false, qos = 0) => {
  // if (typeof payload === 'boolean') {
  //   payload = payload.toString();
  // } else if (typeof payload === 'number') {
  //   payload = payload.toString();
  // } else
  if (typeof payload === 'object' && !Buffer.isBuffer(payload)) {
    //  console.log('publish buffer ?', payload instanceof Buffer);
    payload = JSON.stringify(payload);
  }
  // topic = `${pubsubVersion}/${getBaseTopic()}/tx/${topic}`;
  topic = `${getBaseTopic()}/tx/${topic}`;
  logger.publish(3, 'mqtt-client', 'publish:topic', topic);
  if (!mqttClient) {
    return false;
  }
  await mqttClient.publish(topic, payload, { qos, retain });
  return true;
};

/**
 * Stop MQTT client and unsubscribe
 * @method module:MQTTClient~stopClient
 * @returns {Promise<boolean>} status
 */
const stopClient = async () => {
  try {
    if (mqttClient && mqttClient.connected) {
      await mqttClient.unsubscribe([
        `aloes-${process.env.ALOES_ID}/sync`,
        `${getBaseTopic()}/status`,
        `${getBaseTopic()}/rx/#`,
      ]);
      await mqttClient.end(true);
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
 * @returns {Promise<function>} MQTTClient~stopClient
 */
MQTTClient.on('stop', stopClient);

export default MQTTClient;
