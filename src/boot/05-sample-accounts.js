/* Copyright 2019 Edouard Maleix, read LICENSE */

import initialUsersList from '../initial-data/base-accounts.json';
import logger from '../services/logger';
import roleManager from '../services/role-manager';
import utils from '../lib/utils';

module.exports = async function createSampleAccounts(app) {
  if (!utils.isMasterProcess(process.env)) return;
  const User = app.models.user;
  const accounts = await User.find().then(res =>
    res.length < 1 ? User.create(initialUsersList).then(res) : res,
  );
  await roleManager.setUserRole(app, accounts[0].id, 'admin', true);
  logger.publish(4, 'loopback', 'boot:createSampleAccounts:res', accounts);
};
