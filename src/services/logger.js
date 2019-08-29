import colors from 'colors';
import utils from './utils';

colors.setTheme({
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
  CACHE: ['red', 'bold'],
  TRACKER: ['yellow', 'bold'],
  DEFAULT: 'white',
  warn: 'yellow',
  error: 'red',
});

const logger = {};
//  const remoteLog = false;

logger.publish = (priority, collectionName, command, content) => {
  const logLevel = Number(process.env.SERVER_LOGGER_LEVEL) || 4;
  const maxLineSize = 250;
  let fullContent;
  if (priority <= logLevel) {
    if (typeof content === 'object') {
      if (content instanceof Error) {
        // fullContent = content;
        fullContent = `[${collectionName.toUpperCase()}] ${content.message} `;
      } else {
        fullContent = `[${collectionName.toUpperCase()}] ${command} : ${JSON.stringify(content)}`;
      }
    } else if (typeof content !== 'object') {
      fullContent = `[${collectionName.toUpperCase()}] ${command} : ${content}`;
    }
    if (typeof fullContent === 'string' && fullContent.length > maxLineSize) {
      fullContent = `${fullContent.substring(0, maxLineSize - 3)} ...`;
    }
    switch (collectionName.toUpperCase()) {
      case 'BROKER':
        console.log(`${fullContent}`.BROKER);
        break;
      case 'MQTT-CLIENT':
        console.log(`${fullContent}`['MQTT-CLIENT']);
        break;
      case 'TUNNEL':
        console.log(`${fullContent}`.TUNNEL);
        break;
      case 'LOOPBACK':
        console.log(`${fullContent}`.LOOPBACK);
        break;
      case 'CACHE':
        console.log(`${fullContent}`.CACHE);
        break;
      case 'TRACKER':
        console.log(`${fullContent}`.TRACKER);
        break;
      case 'USER':
        console.log(`${fullContent}`.USER);
        break;
      case 'APPLICATION':
        console.log(`${fullContent}`.APPLICATION);
        break;
      case 'DEVICE':
        console.log(`${fullContent}`.DEVICE);
        break;
      case 'SENSOR':
        console.log(`${fullContent}`.SENSOR);
        break;
      case 'FILES':
        console.log(`${fullContent}`.FILES);
        break;
      case 'MEASUREMENT':
        console.log(`${fullContent}`.MEASUREMENT);
        break;
      case 'SCHEDULER':
        console.log(`${fullContent}`.SCHEDULER);
        break;
      default:
        console.log(`${fullContent}`.DEFAULT);
    }

    // if (remoteLog === true) {
    //   pubsub.publish(loopback, {
    //     USER: 0,
    //     collectionName,
    //     data: content,
    //     method: "POST",
    //   });
    // }
    return null;
  } else if (priority > logLevel) {
    return null;
  }
  const error = utils.buildError('INVALID_LOG', 'Missing argument in logger');
  throw error;
};

export default logger;
