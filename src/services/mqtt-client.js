/* eslint-disable no-underscore-dangle */
import mqtt from 'async-mqtt';
import logger from './logger';

/**
 * @module Client
 */
const mqttClient = {};

mqttClient.init = (app, config) => {
  const clientId = `aloes-${process.env.ALOES_ID}-${Math.random()
    .toString(16)
    .substr(2, 8)}`;
  mqttClient.id = clientId;
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
    clientId,
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

  mqttClient.instance = mqtt.connect(mqttBrokerUrl, mqttClientOptions);

  logger.publish(4, 'mqtt-client', 'init', mqttClientOptions);

  mqttClient.instance.on('error', err => {
    logger.publish(4, 'mqtt-client', 'error', err);
  });

  mqttClient.instance.on('connect', async packet => {
    try {
      logger.publish(4, 'mqtt-client', 'connect:req', packet);
      app.clientId = clientId;
      await mqttClient.instance.subscribe(`aloes-${process.env.ALOES_ID}/sync`, {
        qos: 2,
        retain: true,
      });
      await mqttClient.instance.subscribe(`${clientId}/status`, {
        qos: 0,
        retain: false,
      });
      await mqttClient.instance.subscribe(`${clientId}/rx/#`, {
        qos: 0,
        retain: false,
      });
      return packet;
    } catch (error) {
      logger.publish(4, 'mqtt-client', 'connect:err', error);
      return error;
    }
  });

  mqttClient.instance.on('offline', async packet => {
    try {
      logger.publish(4, 'mqtt-client', 'offline:req', packet);
      delete app.clientId;
      await mqttClient.instance.unsubscribe(`aloes-${process.env.ALOES_ID}/sync`);
      await mqttClient.instance.unsubscribe(`${clientId}/status`);
      await mqttClient.instance.unsubscribe(`${clientId}/rx/#`);
      return packet;
    } catch (error) {
      return error;
    }
  });

  /**
   * Update models status from MQTT conection status and client properties
   * @method module:Client~updateModelsStatus
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
   * Retrieve pattern from packet.topic
   * @method module:Client~findPattern
   * @param {object} packet - MQTT packet
   * @param {object} client - MQTT client
   * @returns {object} pattern
   */
  const findPattern = async (packet, client) => {
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
   * @method module:Client~redirectMessage
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
          console.log('setInstance payload res', payload);
          // payload = JSON.parse(Buffer.from(payload.data).toString());
        }
        // else {
        //   payload = payload.toString();
        //   // payload = JSON.parse(payload.toString());
        // }
      }
      logger.publish(4, 'mqtt-client', 'setInstancePayload:res', typeof payload);
      console.log('outgoing payload', payload);
      return payload;
    } catch (error) {
      logger.publish(4, 'mqtt-client', 'setInstancePayload:err', typeof payload);
      if (typeof payload === 'string') {
        payload = Buffer.from(payload, 'binary');
        console.log('outgoing payload', payload);
      }
      return payload;
    }
  };

  const onStatus = async (topic, payload) => {
    try {
      logger.publish(4, 'mqtt-client', 'onStatus:req', { topic });
      payload = setBrokerPayload(payload);
      const client = payload.client;
      const status = payload.status;
      await updateModelsStatus(client, status);
      return null;
    } catch (error) {
      return error;
    }
  };

  const onReceive = async (topic, payload) => {
    try {
      logger.publish(4, 'mqtt-client', 'onReceive:req', { topic });
      payload = setBrokerPayload(payload);
      const client = payload.client;
      const packet = { topic, payload: setInstancePayload(payload.payload) };
      const pattern = await findPattern(packet, client);
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

  const onMessage = async (topic, payload) => {
    try {
      const topicParts = topic.split('/');
      logger.publish(5, 'mqtt-client', 'onMessage:req', { topic: topicParts });
      if (topicParts[1] === 'status') {
        return onStatus(topic, payload);
      } else if (topicParts[1] === 'rx') {
        topic = topicParts.slice(2, topicParts.length).join('/');
        return onReceive(topic, payload);
      } else if (topicParts[1] === 'sync') {
        console.log('ONSYNC', payload);
      }
      return null;
    } catch (error) {
      logger.publish(4, 'mqtt-client', 'onMessage:err', error);
      return error;
    }
  };

  mqttClient.instance.on('message', onMessage);

  return app.client;
};

mqttClient.publish = async (topic, payload, retain = false, qos = 0) => {
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
    topic = `${mqttClient.id}/tx/${topic}`;
    logger.publish(4, 'mqtt-client', 'publish:topic', topic);
    if (!mqttClient.instance) throw new Error('MQTT Client unavailable');
    //  {qos, retain}
    await mqttClient.instance.publish(topic, payload, { qos, retain });
    return true;
  } catch (error) {
    return error;
  }
};

mqttClient.stop = async () => {
  try {
    await mqttClient.instance.end();
    logger.publish(2, 'mqtt-client', 'stopped', mqttClient.id);
    return true;
  } catch (error) {
    logger.publish(2, 'mqtt-client', 'stopped:err', error);
    return error;
  }
};

export default mqttClient;
