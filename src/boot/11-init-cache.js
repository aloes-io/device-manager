import logger from '../services/logger';

module.exports = async function initCache(app) {
  try {
    const Device = app.models.Device;

    const devices = await Device.find();

    const setCache = async device => {
      try {
        if (!device.sensors && device.sensors !== null) return null;
        //  logger.publish(4, 'loopback', 'boot:setCache:req', device.sensors);
        const sensors = await device.sensors.find();
        if (sensors && sensors.length > 0) {
          const result = await sensors.map(async sensor => {
            const resourceKey = `deviceId-${device.id}-sensorId-${sensor.id}`;
            logger.publish(5, 'loopback', 'boot:setCache:res1', resourceKey);
            return app.models.SensorResource.set(resourceKey, JSON.stringify(sensor));
          });
          return Promise.all(result);
        }
        return null;
      } catch (error) {
        return error;
      }
    };

    if (!devices || devices.length < 1) return null;
    const promises = await devices.map(setCache);
    const res = await Promise.all(promises);
    //  console.log('result cache', res);
    return res;
  } catch (error) {
    return error;
  }
};
