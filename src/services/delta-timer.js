import logger from './logger';

const DeltaTimer = function(cb, data, interval) {
  try {
    let timeout, lastTime;
    let count = 0;

    const loop = () => {
      try {
        count += 1;
        const thisTime = +new Date();
        const deltaTime = thisTime - lastTime;
        const delay = Math.max(interval - deltaTime, 0);
        timeout = setTimeout(loop, delay);
        lastTime = thisTime + delay;
        data.delay = delay;
        data.count = count;
        data.time = thisTime;
        data.lastTime = lastTime;
        if (count > 1) cb(data);
        return null;
      } catch (error) {
        return error;
      }
    };

    const start = () => {
      try {
        timeout = setTimeout(loop, 0);
        lastTime = +new Date();
        logger.publish(4, 'UTILS', 'DeltaTimer:start', lastTime);
        return lastTime;
      } catch (error) {
        return error;
      }
    };

    const stop = () => {
      try {
        logger.publish(4, 'UTILS', 'DeltaTimer:stop', lastTime);
        clearTimeout(timeout);
        return lastTime;
      } catch (error) {
        return error;
      }
    };

    this.start = start;
    this.stop = stop;
    return timeout;
  } catch (error) {
    return error;
  }
};

export default DeltaTimer;
