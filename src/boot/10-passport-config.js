/* Copyright 2019 Edouard Maleix, read LICENSE */

/* eslint-disable security/detect-object-injection */
import loopbackPassport from 'loopback-component-passport';
import providers from '../providers';
import logger from '../services/logger';

module.exports = async function passportConfig(app) {
  try {
    if (process.env.CLUSTER_MODE) {
      if (process.env.PROCESS_ID !== '0') return null;
      if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
    }
    const PassportConfigurator = loopbackPassport.PassportConfigurator;
    const passportConfigurator = new PassportConfigurator(app);
    logger.publish(4, 'loopback', 'boot:passportConfig:req', providers);

    passportConfigurator.init();

    passportConfigurator.setupModels({
      userModel: app.models.user,
      userIdentityModel: app.models.userIdentity,
      userCredentialModel: app.models.userCredential,
    });

    const configuredProviders = await Object.keys(providers).map(provider => {
      try {
        const c = providers[provider];
        // if (!c.clientId) {
        //   return null;
        // }
        c.session = c.session !== false;
        passportConfigurator.configureProvider(provider, c);
        return c;
      } catch (error) {
        return null;
      }
    });
    //  const configuredProviders = await Promise.all(promises);
    logger.publish(3, 'loopback', 'boot:passportConfig:res', configuredProviders);
    return configuredProviders;
  } catch (error) {
    logger.publish(2, 'loopback', 'boot:passportConfig:err', error);
    // throw error;
    return null;
  }
};
