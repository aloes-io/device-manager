/* Copyright 2019 Edouard Maleix, read LICENSE */

import logger from '../services/logger';
import utils from '../lib/utils';

module.exports = async function (server) {
  if (!utils.isMasterProcess(process.env)) return;
  const User = server.models.user;
  const Files = server.models.Files;
  const Storage = server.datasources.storage.settings.root;

  const accounts = await utils.find(User);
  //  const applications = await utils.find(Application);
  if (accounts.length < 1) {
    return;
  }
  try {
    await utils.mkDirByPathSync(`${Storage}`);

    const accountsContainers = await Promise.all(
      accounts.map(async (account) => Files.createContainer(account.id)),
    );
    logger.publish(5, 'loopback', 'boot:initAccountsStorages:res', accountsContainers);

    // const appContainers = await createContainers(applications);
    // logger.publish(5, 'loopback', 'boot:initApplicationStorages:res', appContainers);
  } catch (error) {
    logger.publish(2, 'loopback', 'boot:initStorages:err', error);
  }
};
