/* Copyright 2019 Edouard Maleix, read LICENSE */

import initialUsersList from '../initial-data/base-accounts.json';
import logger from '../services/logger';
import roleManager from '../services/role-manager';

module.exports = async function createSampleAccounts(app) {
  try {
    if (process.env.CLUSTER_MODE) {
      if (process.env.PROCESS_ID !== '0') return null;
      if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
    }
    const User = app.models.user;
    const accounts = await User.find().then(res => {
      if (res.length < 1) {
        return User.create(initialUsersList);
      }
      return res;
    });
    await roleManager.setUserRole(app, accounts[0].id, 'admin', true);
    logger.publish(4, 'loopback', 'boot:createSampleAccounts:res', accounts);
    return accounts;
  } catch (error) {
    logger.publish(2, 'loopback', 'boot:createSampleAccounts:err', error);
    throw error;
  }
};
