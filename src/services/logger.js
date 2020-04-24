/* Copyright 2020 Edouard Maleix, read LICENSE */

import colors from 'colors';
// import mqttClient from './mqtt-client';

const themes = {
  USER: ['grey', 'underline'],
  APPLICATION: ['white', 'bold', 'bgCyan'],
  DEVICE: ['white', 'bold', 'bgBlue'],
  SENSOR: ['white', 'bold', 'bgGreen'],
  MEASUREMENT: ['white', 'bold', 'bgMagenta'],
  SCHEDULER: ['white', 'bold', 'bgRed'],
  FILES: ['grey', 'bold', 'bgYellow'],
  LOOPBACK: ['cyan', 'bold'],
  BROKER: ['blue', 'bold'],
  'MQTT-CLIENT': ['green', 'bold'],
  TUNNEL: ['yellow', 'bold'],
  TRACKER: ['yellow', 'bold'],
  DEFAULT: 'white',
  WARN: 'yellow',
  ERROR: 'red',
};
colors.setTheme(themes);

const logger = {};
// const remoteLog = false;

const formatLog = (collectionName, command, content) => {
  let fullContent;
  const maxLineSize = 250;
  if (typeof content === 'object') {
    if (content instanceof Error) {
      // fullContent = content;
      // const code = content.code || content.statusCode;
      fullContent = `[${collectionName.toUpperCase()}] ${command} : ${content.message} `;
    } else {
      fullContent = `[${collectionName.toUpperCase()}] ${command} : ${JSON.stringify(content)}`;
    }
  } else if (typeof content !== 'object') {
    fullContent = `[${collectionName.toUpperCase()}] ${command} : ${content}`;
  }
  if (typeof fullContent === 'string' && fullContent.length > maxLineSize) {
    fullContent = `${fullContent.substring(0, maxLineSize - 3)} ...`;
  }
  return fullContent;
};

const sendFormatedLog = (collectionName, command, fullContent) => {
  if (themes[collectionName.toUpperCase()]) {
    console.log(`${fullContent}`[collectionName.toUpperCase()]);
  } else {
    console.log(`${fullContent}`.DEFAULT);
  }
};

logger.publish = (priority, collectionName, command, content) => {
  const logLevel = Number(process.env.SERVER_LOGGER_LEVEL) || 4;
  if (priority <= logLevel) {
    const fullContent = formatLog(collectionName, command, content);
    if (process.env.CLUSTER_MODE && process.env.CLUSTER_MODE === 'true') {
      process.send({
        type: 'log:msg',
        data: { collectionName, command, fullContent, content },
      });
    } else {
      sendFormatedLog(collectionName, command, fullContent);
    }
    // if (remoteLog && process.env.MQTT_BROKER_URL) {
    //   const topic = `${collectionName}/${command}`;
    //   if (mqttClient) {
    //     mqttClient.publish(topic, content);
    //   }
    // }
    return fullContent;
  }
  return null;
};

export default logger;
