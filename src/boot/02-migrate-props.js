/* Copyright 2020 Edouard Maleix, read LICENSE */

import logger from '../services/logger';
import utils from '../lib/utils';
import { validateOmaObject } from '../lib/models/sensor';

module.exports = async function migrateProps(app) {
  if (!utils.isMasterProcess(process.env)) return;

  const { Device, Sensor, SensorResource } = app.models;
  const devices = await utils.find(Device);
  await Promise.all(
    devices.map(async (device) => {
      const deviceHasAddress = await device.address.get();
      if (!deviceHasAddress) {
        await device.address.create({
          street: '',
          streetNumber: null,
          streetName: null,
          postalCode: null,
          city: null,
          public: false,
        });
      }
      if (!device.createdAt) {
        await device.setAttribute('createdAt', new Date());
      }
    }),
  );
  const sensors = await utils.find(Sensor);
  await Promise.all(
    sensors.map(async (sensor) => {
      if (!sensor.createdAt) {
        await sensor.setAttribute('createdAt', new Date());
      }
      if (sensor.resources) {
        let resources = await SensorResource.find(sensor.deviceId, sensor.id);
        resources = { ...resources, ...sensor.resources };
        validateOmaObject(sensor, resources);
        await SensorResource.save(sensor.deviceId, sensor.id, resources);
        await sensor.unsetAttribute('resources');
      }
    }),
  );
  logger.publish(4, 'loopback', 'boot:migrateProps:res', 'success');
};
