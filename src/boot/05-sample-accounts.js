import initialUsersList from '../initial-data/base-accounts.json';
import logger from '../services/logger';

//  export default createBaseAccounts;
module.exports = async function(app) {
  try {
    const User = app.models.user;
    const Role = app.models.Role;
    const RoleMapping = app.models.RoleMapping;

    const accounts = await User.find().then(res => {
      if (res.length < 1) {
        return User.create(initialUsersList);
      }
      return res;
    });

    //  await accounts[0].address.destroy();
    let address = await accounts[0].address.get();
    if (!address) {
      logger.publish(4, 'loopback', 'boot:createSample:res', accounts);
      address = await accounts[0].address.create({
        street: '98 Rue des Garennes',
        streetNumber: 98,
        streetName: 'Rue des Garennes',
        postalCode: 38390,
        city: ' Bouvesse-Quirieu',
        public: true,
      });
    }

    const role = await Role.findOne({ where: { name: 'admin' } });
    if (!role || role === null || !accounts || accounts === null) {
      return null;
    }
    logger.publish(4, 'loopback', 'boot:createPrincipal:req', role);

    let principal = await role.principals.find({
      where: {
        principalType: RoleMapping.USER,
        principalId: accounts[0].id,
      },
    });

    if (!principal || principal === null) {
      principal = await role.principals.create({
        principalType: RoleMapping.USER,
        principalId: accounts[0].id,
      });
    }

    logger.publish(4, 'loopback', 'boot:createPrincipal:res', principal);
    return principal;
  } catch (error) {
    logger.publish(2, 'loopback', 'boot:createPrincipal:err', error);
    return error;
  }
};
