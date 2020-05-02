/* Copyright 2020 Edouard Maleix, read LICENSE */

import initialUsersList from '../initial-data/base-accounts.json';
import logger from '../services/logger';
import roleManager from '../services/role-manager';
import utils from '../lib/utils';

module.exports = async function createSampleAccounts(app) {
  if (!utils.isMasterProcess(process.env)) return;
  const User = app.models.user;
  let accounts = await utils.find(User);
  if (!accounts || !accounts.length) {
    accounts = await User.create(initialUsersList);
  }
  await roleManager.setUserRole(app, accounts[0].id, 'admin', true);
  logger.publish(4, 'loopback', 'boot:createSampleAccounts:res', accounts);
};
