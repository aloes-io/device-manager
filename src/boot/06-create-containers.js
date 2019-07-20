import utils from '../services/utils';
import logger from '../services/logger';

module.exports = async function(server) {
  try {
    const User = server.models.user;
    //  const Application = server.models.Application;
    const Storage = server.datasources.storage.settings.root;

    const createContainers = async instances => {
      try {
        const promises = await instances.map(async instance =>
          utils.mkDirByPathSync(`${Storage}/${instance.id}`),
        );
        const paths = await Promise.all(promises);
        return paths;
      } catch (error) {
        console.log('create containers:err', error);
        return error;
      }
    };

    const accounts = await User.find();
    //  const applications = await Application.find();
    if (accounts.length < 1) {
      return false;
    }
    let mainStorage = false;

    mainStorage = utils
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

    if (mainStorage) {
      const accountsContainers = await createContainers(accounts);
      logger.publish(5, 'loopback', 'boot:initAccountsStorages:res', accountsContainers);
      // const appContainers = await createContainers(applications);
      // logger.publish(5, 'loopback', 'boot:initApplicationStorages:res', appContainers);
    }
    return mainStorage;
  } catch (error) {
    logger.publish(2, 'loopback', 'boot:initStorages:err', error);
    return error;
  }
};
