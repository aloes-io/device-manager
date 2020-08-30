/* Copyright 2020 Edouard Maleix, read LICENSE */

import logger from '../services/logger';
import utils from '../lib/utils';

module.exports = async function initCache(app) {
  if (utils.isMasterProcess(process.env)) {
    logger.publish(2, 'loopback', 'boot:initCache:req', '');
    await app.models.Client.remove();
    await app.models.Device.updateAll(
      { status: false, clients: [] },
    );
  }
};
