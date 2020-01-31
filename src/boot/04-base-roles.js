/* Copyright 2019 Edouard Maleix, read LICENSE */

import initialRolesList from '../initial-data/base-roles.json';
import logger from '../services/logger';
import roleManager from '../services/role-manager';

module.exports = async function createBaseRoles(app) {
  try {
    if (process.env.CLUSTER_MODE) {
      if (process.env.PROCESS_ID !== '0') return null;
      if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
    }
    const roles = await roleManager.setAppRoles(app, initialRolesList);
    logger.publish(4, 'loopback', 'boot:createBaseRoles:res', roles);
    return roles;
  } catch (error) {
    logger.publish(2, 'loopback', 'boot:createBaseRoles:err', error);
    throw error;
  }
};
