/* Copyright 2019 Edouard Maleix, read LICENSE */

import logger from '../services/logger';
import utils from '../lib/utils';

module.exports = async function initCache(app) {
  if (utils.isMasterProcess(process.env)) {
    logger.publish(2, 'loopback', 'boot:initCache:req', '');
    await app.models.Client.remove();
    await app.models.Device.updateAll(
      // { 'clients.length': { gt: 0 } },
      { status: false, clients: [] },
    );
    // await app.models.SensorResource.deleteAll();
  }
};
