/* Copyright 2019 Edouard Maleix, read LICENSE */

/* eslint-disable security/detect-object-injection */
import loopbackPassport from 'loopback-component-passport';
import providers from '../providers';
import logger from '../services/logger';
import utils from '../services/utils';

module.exports = function passportConfig(app) {
  try {
    if (utils.isMasterProcess(process.env)) {
      const PassportConfigurator = loopbackPassport.PassportConfigurator;
      const passportConfigurator = new PassportConfigurator(app);
      logger.publish(4, 'loopback', 'boot:passportConfig:req', providers);

      passportConfigurator.init();
      passportConfigurator.setupModels({
        userModel: app.models.user,
        userIdentityModel: app.models.userIdentity,
        userCredentialModel: app.models.userCredential,
      });

      const configuredProviders = Object.keys(providers).map(provider => {
        const c = providers[provider];
        // if (!c.clientId) {
        //   return null;
        // }
        c.session = c.session !== false;
        passportConfigurator.configureProvider(provider, c);
        return c;
      });
      //  const configuredProviders = await Promise.all(promises);
      logger.publish(3, 'loopback', 'boot:passportConfig:res', configuredProviders);
    }
  } catch (error) {
    logger.publish(2, 'loopback', 'boot:passportConfig:err', error);
  }
};
