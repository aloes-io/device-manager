/* Copyright 2020 Edouard Maleix, read LICENSE */

import logger from '../services/logger';
import utils from '../lib/utils';

module.exports = async function migrateProps(app) {
  if (!utils.isMasterProcess(process.env)) return;

  const Device = app.models.Device;
  const Sensor = app.models.Sensor;
  const SensorResource = app.models.SensorResource;
  const devices = await utils.find(Device);
  await Promise.all(
    devices.map(async (device) => {
      const deviceHasAddress = await device.address.get();
      // console.log('device has address', deviceHasAddress);
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
        await SensorResource.save(sensor.deviceId, sensor.id, sensor.resources);
        await sensor.unsetAttribute('resources');
      }
    }),
  );
  logger.publish(4, 'loopback', 'boot:migrateProps:res', 'success');
};
