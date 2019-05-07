import loopbackPassport from 'loopback-component-passport';
import providers from '../providers';

module.exports = function passportConfig(server) {
  // Passport configurators..
  const PassportConfigurator = loopbackPassport.PassportConfigurator;
  const passportConfigurator = new PassportConfigurator(server);
  passportConfigurator.init();

  passportConfigurator.setupModels({
    userModel: server.models.user,
    userIdentityModel: server.models.userIdentity,
    userCredentialModel: server.models.userCredential,
  });
  Object.keys(providers).forEach(provider => {
    const c = providers[provider];
    if (provider.startsWith('github') && !providers[provider].clientId) {
      return null;
    }
    c.session = c.session !== false;
    return passportConfigurator.configureProvider(provider, c);
  });
};
