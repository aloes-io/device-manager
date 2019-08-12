import logger from '../services/logger';
import utils from '../services/utils';
import deviceTypes from '../initial-data/device-types.json';

// generate slot device_names for snips assistant
export default async function deviceWatcher(app) {
  try {
    const Device = app.models.Device;

    const sortByType = async instances => {
      try {
        const promises = await Object.keys(deviceTypes).map(type => {
          const sorted = instances.filter(instance => instance.type === type);
          const deviceNames = sorted.map(instance => instance.name);
          return { [type]: deviceNames };
        });
        const result = await Promise.all(promises);
        return result;
      } catch (error) {
        return error;
      }
    };

    const devices = await Device.find();
    const devicesByType = await sortByType(devices);
    logger.publish(2, 'loopback', 'boot:watchDevices:res', devicesByType);
    const path = `${__dirname}/../../device-names.json`;
    await utils.writeFile(path, JSON.stringify(devicesByType));
    // const result = await utils.readFile(path);
    return path;
  } catch (error) {
    logger.publish(2, 'loopback', 'boot:watchDevices:err', error);
    return error;
  }
}
