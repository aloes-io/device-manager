/* Copyright 2019 Edouard Maleix, read LICENSE */

/* eslint-disable security/detect-non-literal-fs-filename */
import logger from '../services/logger';
import utils from '../services/utils';
import deviceTypes from '../initial-data/device-types.json';

// generate slot device_names for snips assistant
export default async function deviceWatcher(app) {
  try {
    if (process.env.CLUSTER_MODE) {
      if (process.env.PROCESS_ID !== '0') return null;
      if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
    }
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
        return null;
      }
    };

    const devices = await Device.find();
    const devicesByType = await sortByType(devices);
    logger.publish(2, 'loopback', 'boot:watchDevices:res', devicesByType);
    const path = `${__dirname}/../../device-names.json`;
    await utils.removeFile(path);
    await utils.writeFile(path, JSON.stringify(devicesByType, null, 2));
    // const result = await utils.readFile(path);
    return path;
  } catch (error) {
    logger.publish(2, 'loopback', 'boot:watchDevices:err', error);
    return null;
  }
}
