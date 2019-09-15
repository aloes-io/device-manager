import logger from './logger';

const DeltaTimer = function(cb, data, interval) {
  try {
    let timer, lastTime;
    let count = 0;
    let timeout = interval;
    let timerData = data;
    let callback = cb;

    const loop = () => {
      try {
        count += 1;
        const thisTime = +new Date();
        const deltaTime = thisTime - lastTime;
        const delay = Math.max(timeout - deltaTime, 0);
        timer = setTimeout(loop, delay);
        lastTime = thisTime + delay;
        timerData.delay = delay;
        timerData.count = count;
        timerData.time = thisTime;
        timerData.lastTime = lastTime;
        if (count > 1) callback(timerData);
        return null;
      } catch (error) {
        return error;
      }
    };

    const start = () => {
      try {
        timer = setTimeout(loop, 0);
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
        clearTimeout(timer);
        return lastTime;
      } catch (error) {
        return error;
      }
    };

    const update = (updatedCb, updatedData, updatedInterval) => {
      callback = updatedCb;
      timerData = { ...timerData, ...updatedData };
      timeout = updatedInterval;
    };

    this.start = start;
    this.stop = stop;
    this.update = update;
    return timer;
  } catch (error) {
    return error;
  }
};

export default DeltaTimer;
