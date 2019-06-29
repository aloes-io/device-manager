import initialUsersList from '../initial-data/base-accounts.json';
import logger from '../services/logger';

//  export default createBaseAccounts;
module.exports = async function(app) {
  try {
    const User = app.models.user;
    const Role = app.models.Role;
    const RoleMapping = app.models.RoleMapping;

    const payload = await User.find()
      .then(accounts => {
        if (accounts.length < 1) {
          return User.create(initialUsersList);
        }
        return accounts;
      })
      .then(accounts => {
        if (!accounts[0].profileAddress) {
          logger.publish(4, 'loopback', 'boot:createSample:res', accounts);
          accounts[0].profileAddress.create({
            street: '98 Rue des Garennes',
            streetNumber: 98,
            streetName: 'Rue des Garennes',
            postalCode: 38390,
            city: ' Bouvesse-Quirieu',
            public: true,
          });
          // accounts[1].profileAddress.create({
          //   street: "98 Rue des Garennes",
          //   streetNumber: 98,
          //   streetName: "Rue des Garennes",
          //   postalCode: 38390,
          //   city: " Bouvesse-Quirieu",
          //   public: true,
          // }) &&
          //  create roles
        }
        return Role.find({ name: 'admin' }).then(roles => ({ accounts, roles }));
      });

    if (!payload || payload === null) {
      return null;
    }
    // get account and role from payload
    logger.publish(4, 'loopback', 'boot:createPrincipal:req', payload.roles);
    if (payload && payload.accounts && payload.roles) {
      const myPayload = { ...payload };
      // myPayload.roles[5].principals
      //   .create({
      //     principalType: RoleMapping.USER,
      //     principalId: myPayload.accounts[0].id,
      //   })
      //   .then(principal => {
      //     myPayload.principal = principal;
      //     logger.publish(4, 'loopback', 'boot:createPrincipal:res', principal);
      //     return myPayload;
      //   });
      let principal = await myPayload.roles[1].principals.find({
        where: {
          principalType: RoleMapping.USER,
          principalId: myPayload.accounts[0].id,
        },
      });

      if (!principal) {
        principal = await myPayload.roles[1].principals.create({
          principalType: RoleMapping.USER,
          principalId: myPayload.accounts[0].id,
        });
      }

      myPayload.principal = principal;
      //  myPayload.principal = principal;
      logger.publish(4, 'loopback', 'boot:createPrincipal:res', principal);
      return myPayload;
    }
    return null;
  } catch (error) {
    logger.publish(2, 'loopback', 'boot:createPrincipal:err', error);
    return error;
  }
};
