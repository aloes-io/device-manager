import initialAccountsList from "../initial-data/base-accounts.json";
import logger from "../logger";

//  export default createBaseAccounts;
module.exports = function(server) {
  const Account = server.models.Account;
  const Role = server.models.Role;
  const RoleMapping = server.models.RoleMapping;

  return Account.find()
    .then((accounts) => {
      if (accounts.length < 1) {
        return Account.create(initialAccountsList);
      }
      return null;
    })
    .then((accounts) => {
      if (accounts) {
        console.log("[BOOT] createSample accounts", accounts);
        return (
          accounts[0].profileAddress.create({
            street: "98 Rue des Garennes",
            streetNumber: 98,
            streetName: "Rue des Garennes",
            postalCode: 38390,
            city: " Bouvesse-Quirieu",
            public: true,
          }) &&
          // accounts[1].profileAddress.create({
          //   street: "98 Rue des Garennes",
          //   streetNumber: 98,
          //   streetName: "Rue des Garennes",
          //   postalCode: 38390,
          //   city: " Bouvesse-Quirieu",
          //   public: true,
          // }) &&
          //  create roles
          Role.find({name: "admin"}).then((roles) => ({accounts, roles}))
        );
      }
      return null;
    })
    .then((payload) => {
      // get account and role from payload
      logger.publish(4, "boot", "createPrincipal:req", payload.roles);
      if (payload && payload.accounts && payload.roles) {
        const myPayload = {...payload};
        myPayload.roles[5].principals
          .create({
            principalType: RoleMapping.USER,
            principalId: myPayload.accounts[0].id,
          })
          .then((principal) => {
            myPayload.principal = principal;
            logger.publish(4, "boot", "createPrincipal:res", principal);
            return myPayload;
          });
        return myPayload.roles[1].principals
          .create({
            principalType: RoleMapping.USER,
            principalId: myPayload.accounts[1].id,
          })
          .then((principal) => {
            myPayload.principal = principal;
            logger.publish(4, "boot", "createPrincipal:res", principal);
            return myPayload;
          });
      }
      return null;
    })
    .catch((err) => {
      logger.publish(2, "boot", "createSample:err", err);
      return err;
    });
};
