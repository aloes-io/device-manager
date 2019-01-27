import utils from "./utils";
import loopback from "./server";
//  import colors from 'colors';

const logger = {};
const remoteLog = false;

logger.publish = (priority, collectionName, command, content) => {
  const logLevel = Number(process.env.SERVER_LOGGER_LEVEL) || 4;
  let fullContent;
  if (priority <= logLevel) {
    if (typeof content === "object") {
      fullContent = `[${collectionName.toUpperCase()}] ${command} : ${JSON.stringify(
        content,
      )}`;
    } else if (typeof content !== "object") {
      fullContent = `[${collectionName.toUpperCase()}] ${command} : ${content}`;
    }

    console.log(fullContent);
    // if (remoteLog === true) {
    //   pubsub.publish(loopback, {
    //     accountId: 0,
    //     collectionName,
    //     data: content,
    //     method: "POST",
    //   });
    // }
    return null;
  } else if (priority > logLevel) {
    return null;
  }
  const error = utils.buildError("INVALID_LOG", "Missing argument in logger");
  throw error;
};

export default logger;
