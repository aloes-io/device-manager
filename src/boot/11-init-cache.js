/* Copyright 2019 Edouard Maleix, read LICENSE */

import logger from '../services/logger';
import utils from '../services/utils';

module.exports = async function initCache(app) {
  try {
    if (utils.isMasterProcess(process.env)) {
      logger.publish(2, 'loopback', 'boot:initCache:req', '');
      await app.models.Client.deleteAll();
      await app.models.SensorResource.deleteAll();
      // console.log('connected devices', await app.models.Device.find({ 'clients.length': { gt: 0 } }));
      await app.models.Device.updateAll(
        // { 'clients.length': { gt: 0 } },
        { status: false, clients: [] },
      );
      await app.models.Device.syncCache('DOWN');
    }
  } catch (error) {
    logger.publish(2, 'loopback', 'boot:initCache:err', error);
  }
};
