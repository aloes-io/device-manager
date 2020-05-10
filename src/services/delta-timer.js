import logger from './logger';

const DeltaTimer = function (cb, data, interval) {
  let timer, lastTime;
  let count = 0;
  let timeout = interval;
  let timerData = data;
  let callback = cb;

  const loop = () => {
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
  };

  const start = () => {
    timer = setTimeout(loop, 0);
    lastTime = +new Date();
    logger.publish(4, 'UTILS', 'DeltaTimer:start', lastTime);
    return lastTime;
  };

  const stop = () => {
    logger.publish(4, 'UTILS', 'DeltaTimer:stop', lastTime);
    clearTimeout(timer);
    return lastTime;
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
};

export default DeltaTimer;
