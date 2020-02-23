/* Copyright 2019 Edouard Maleix, read LICENSE */

import logger from '../services/logger';
import utils from '../services/utils';

module.exports = async function initCache(app) {
  if (utils.isMasterProcess(process.env)) {
    logger.publish(2, 'loopback', 'boot:initCache:req', '');
    await app.models.Client.deleteAll();
    // console.log('connected devices', await app.models.Device.find({ 'clients.length': { gt: 0 } }));
    await app.models.Device.updateAll(
      // { 'clients.length': { gt: 0 } },
      { status: false, clients: [] },
    );
    // await app.models.SensorResource.deleteAll();
  }
};
