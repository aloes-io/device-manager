import utils from "../utils";
import logger from "../logger";

// for each user in the db, create a unique file container
//  export default async function initStorages(server) {

module.exports = async function(server) {
  let result;
  const Account = server.models.Account;
  const Storage = server.datasources.storage.settings.root;

  async function createContainers(accounts) {
    await accounts.forEach((account) => {
      utils
        .mkDirByPathSync(`${Storage}/${account.id}`)
        .then((res) => {
          logger.publish(4, "BOOT", "createContainers:res", res);
          result = {...result, res};
        })
        .catch((err) => {
          logger.publish(2, "BOOT", "createContainers:err", err);
          result = err;
        });
    });
    return result;
  }

  await Account.find()
    .then((accounts) => {
      if (accounts.length < 1) {
        return false;
      }
      return utils
        .mkDirByPathSync(`${Storage}`)
        .then((storage) => {
          logger.publish(4, "BOOT", "initStorages:res", storage);
          result = storage;
          createContainers(accounts)
            .then((containers) => {
              result = {storage, containers};
            })
            .catch((err) => {
              result = err;
            });
        })
        .catch((err) => {
          if (err.code === "EEXIST") {
            logger.publish(2, "BOOT", "initStorages:err", err.code);
            createContainers(accounts)
              .then((containers) => {
                result = {err, containers};
              })
              .catch((error) => {
                result = error;
              });
          }
          logger.publish(2, "BOOT", "initStorages:err", err);
          result = err;
        });
    })
    .catch((err) => {
      logger.publish(2, "BOOT", "initStorages:err", err);
      return err;
    });
  return result;
};
