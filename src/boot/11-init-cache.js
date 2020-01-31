/* Copyright 2019 Edouard Maleix, read LICENSE */

import logger from '../services/logger';

module.exports = async function initCache(app) {
  try {
    if (process.env.CLUSTER_MODE) {
      if (process.env.PROCESS_ID !== '0') return null;
      if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
    }
    logger.publish(2, 'loopback', 'boot:initCache:req', '');
    await app.models.Client.deleteAll();
    await app.models.SensorResource.deleteAll();
    // console.log('connected devices', await app.models.Device.find({ 'clients.length': { gt: 0 } }));
    await app.models.Device.updateAll(
      // { 'clients.length': { gt: 0 } },
      { status: false, clients: [] },
    );
    const devices = await app.models.Device.syncCache('DOWN');
    return { devices };
  } catch (error) {
    logger.publish(2, 'loopback', 'boot:initCache:err', error);
    return null;
  }
};
