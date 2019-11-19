/* Copyright 2019 Edouard Maleix, read LICENSE */

import utils from '../services/utils';
import logger from '../services/logger';

module.exports = async function(server) {
  try {
    if (process.env.CLUSTER_MODE) {
      if (process.env.PROCESS_ID !== '0') return null;
      if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
    }
    const User = server.models.user;
    const Files = server.models.Files;
    //  const Application = server.models.Application;
    const Storage = server.datasources.storage.settings.root;

    const createContainers = async instances => {
      try {
        const promises = await instances.map(
          async instance => Files.createContainer(instance.id),
          // utils.mkDirByPathSync(`${Storage}/${instance.id}`),
        );
        const paths = await Promise.all(promises);
        return paths;
      } catch (error) {
        // console.log('create containers:err', error);
        return error;
      }
    };

    const accounts = await User.find();
    //  const applications = await Application.find();
    if (accounts.length < 1) {
      return false;
    }
    if (Storage) {
      await utils
        .mkDirByPathSync(`${Storage}`)
        .then(storage => {
          logger.publish(4, 'loopback', 'boot:initStorages:res', storage);
          return true;
        })
        .catch(err => {
          if (err.code === 'EEXIST') {
            logger.publish(2, 'loopback', 'boot:initStorages:err', err.code);
            return true;
          }
          return false;
        });
    }
    const accountsContainers = await createContainers(accounts);
    logger.publish(5, 'loopback', 'boot:initAccountsStorages:res', accountsContainers);
    // const appContainers = await createContainers(applications);
    // logger.publish(5, 'loopback', 'boot:initApplicationStorages:res', appContainers);

    return accountsContainers;
  } catch (error) {
    logger.publish(2, 'loopback', 'boot:initStorages:err', error);
    return error;
  }
};
