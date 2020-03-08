/* Copyright 2019 Edouard Maleix, read LICENSE */

/* eslint-disable security/detect-non-literal-fs-filename */
import logger from '../services/logger';
import utils from '../lib/utils';
import deviceTypes from '../initial-data/device-types.json';

const sortByType = instances =>
  Object.keys(deviceTypes).map(type => {
    const sorted = instances.filter(instance => instance.type === type);
    const deviceNames = sorted.map(instance => instance.name);
    return { [type]: deviceNames };
  });

// generate slot device_names for snips assistant
export default async function deviceWatcher(app) {
  if (utils.isMasterProcess(process.env)) {
    const Device = app.models.Device;
    const devices = await Device.find();
    const devicesByType = sortByType(devices);
    logger.publish(2, 'loopback', 'boot:watchDevices:res', devicesByType);
    const path = `${__dirname}/../../device-names.json`;
    await utils.removeFile(path);
    await utils.writeFile(path, JSON.stringify(devicesByType, null, 2));
    // const result = await utils.readFile(path);
  }
}
