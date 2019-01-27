import mails from "../mails";
import logger from "../logger";
import utils from "../utils";
import initialRolesList from "../initial-data/base-roles.json";

const collectionName = "Account";
//  const resources = 'Accounts';

module.exports = function(Account) {
  async function accountTypeValidator(err) {
    if (this.type === "admin" || this.type === "editor") {
      return;
    }
    err();
  }

  async function subscribeTypeValidator(err) {
    let falseCounter = 0;
    await initialRolesList.forEach((role) => {
      if (this.subscribed !== role.name) {
        falseCounter += 1;
      }
      if (falseCounter === initialRolesList.length) {
        return err();
      }
      return null;
    });
  }

  Account.validatesAbsenceOf("deleted", {unless: "admin"});
  Account.validatesLengthOf("password", {
    min: 5,
    message: {min: "Account password is too short"},
  });
  Account.validatesPresenceOf("type", {
    message: "Account must contain type value",
  });
  Account.validate("type", accountTypeValidator, {
    message: "Wrong account type",
  });
  Account.validate("subscribed", subscribeTypeValidator, {
    message: "Wrong subcribe plan",
  });

  // Account.afterRemoteError('*', async (ctx) => {
  //   logger.publish(4, `${collectionName}`, `after ${ctx.methodString}:err`, '');
  //   // ctx.result = new Error(
  //   //   `[${collectionName.toUpperCase()}]  error on this remote method : ${
  //   //     ctx.methodString
  //   //   }`,
  //   // );
  //   return null;
  // });

  Account.afterRemote("**.create", async (context, account) => {
    let result;
    try {
      logger.publish(4, `${collectionName}`, "afterCreate:req", account);
      await account.profileAddress.create({
        street: "",
        streetNumber: null,
        streetName: null,
        postalCode: null,
        city: null,
        public: false,
      });
      if (account.id) {
        const response = await mails.verifyEmail(account);
        logger.publish(4, `${collectionName}`, "afterCreate:res", response);
        if (response.email.accepted[0] === account.email) {
          result = account;
          return result;
        }
        const error = utils.buildError(
          "INVALID_EMAIL",
          `Echec d'envoi de l'email à ${account.email}, veuillez réessayer`,
        );
        await Account.destroyById(account.id);
        logger.publish(4, `${collectionName}`, "afterCreate:err", error);
        return error;
      }
      const error = utils.buildError("INVALID_PROFILE", `Echec de la création du profile ${account.type}`);
      logger.publish(4, `${collectionName}`, "afterCreate:err", error);
      return error;
    } catch (error) {
      await Account.destroyById(account.id);
      logger.publish(4, `${collectionName}`, "afterCreate:err", error);
      return error;
    }
  });

  Account.afterRemote("confirm", async (context) => {
    logger.publish(4, `${collectionName}`, "afterConfirm:req", context.args.uid);
    if (context.args.uid) {
      return utils
        .mkDirByPathSync(`${process.env.FS_PATH}/${context.args.uid}`)
        .then((res) => {
          console.log(`[${collectionName.toUpperCase()}] container Check : ${res}`);
          return res;
        })
        .catch((err) => err);
    }
    const error = await utils.buildError("INVALID_CONATINER", `while creating containers for ${context.args.uid}`);
    logger.publish(4, `${collectionName}`, "afterConfirm:err", error);
    return error;
  });

  Account.beforeRemote("login", async (context) => {
    logger.publish(4, `${collectionName}`, "beforeLogin:res", context.args);
    return Account.login(context.args.credentials, "account")
      .then((token) => token)
      .catch((err) => {
        logger.publish(4, `${collectionName}`, "beforeLogin:err", {
          err,
        });
        return err;
      });
  });

  Account.verifyEmail = async (account) => {
    try {
      logger.publish(4, `${collectionName}`, "verifyEmail:req", account);
      let result = {};
      const instance = await Account.findById(account.id);
      if (instance.verificationToken) {
        result = await mails.verifyEmail(instance);
      } else if (instance.id) {
        return {message: "account already verified"};
      } else if (!instance.id) {
        return {message: "account doesn't exist"};
      }
      logger.publish(4, `${collectionName}`, "verifyEmail:res", result);
      return result;
    } catch (error) {
      logger.publish(4, `${collectionName}`, "verifyEmail:err", error);
      return error;
    }
  };

  Account.verifyCaptcha = async (hashes, token) => {
    let result;
    const coinhive = Account.app.dataSources.coinhive;
    await utils
      .verifyCaptcha(coinhive, hashes, token)
      .then((res) => {
        result = res;
      })
      .catch((err) => err);
    return result;
  };

  Account.verifyAddress = async (address) => {
    logger.publish(4, `${collectionName}`, "verifyAddress:req", address);
    return Account.app.models.Address.verifyAddress(address)
      .then((res) => res)
      .catch((err) => err);
  };

  //  send password reset link when requested
  Account.on("resetPasswordRequest", async (options) => {
    logger.publish(3, `${collectionName}`, "resetPasswordRequest:req", options);
    return mails.sendResetPasswordMail(options).catch((err) => err);
    // logger.publish(3, `${collectionName}`, 'resetPasswordRequest:res', result);
  });

  Account.updatePasswordFromToken = async (accessToken, newPassword) => {
    logger.publish(3, `${collectionName}`, "updatePasswordFromToken:req", accessToken);
    let error;

    if (!accessToken) {
      error = utils.buildError("INVALID_TOKEN", "token is null");
      return error;
    }

    const user = await Account.findById(accessToken.userId)
      .then((account) =>
        account.updateAttribute("password", newPassword).catch((err) => {
          error = utils.buildError("INVALID_OPERATION", err);
          return Promise.reject(error);
        }),
      )
      .catch((err) => {
        error = utils.buildError("INVALID_USER", err);
        return Promise.reject(error);
      });

    if (!user.id) {
      return false;
    }
    return true;
  };

  Account.sendContactForm = async (form) => {
    logger.publish(4, `${collectionName}`, "sendContactForm:req", form);
    try {
      const response = await mails.sendContactForm(form);
      logger.publish(4, `${collectionName}`, "sendContactForm:res", response);
      return response;
    } catch (error) {
      logger.publish(4, `${collectionName}`, "sendContactForm:err", error);
      throw error;
    }
  };

  Account.sendInvite = async (ctx, options) => {
    let result;
    await mails
      .sendMailInvite(ctx, options)
      .then((res) => {
        logger.publish(4, collectionName, " sendInvite:res", res);
        result = true;
      })
      .catch((err) => {
        //  result = err;
        logger.publish(4, collectionName, " sendInvite:err", err);
        result = false;
        return Promise.reject(err);
      });
    return result;
  };

  const findProfiles = async (whereFilter) =>
    new Promise((resolve, reject) => {
      Account.app.models.find(whereFilter, (err, profiles) => (err ? reject(err) : resolve(profiles)));
    });

  Account.textSearch = async (ctx, filter) => {
    logger.publish(4, `${collectionName}`, "textSearch:req", filter);
    try {
      //  if (process.env.NODE_ENV.toString() === "development") return null;
      if (!ctx.req.accessToken.userId || (!filter.name && !filter.place)) {
        return null;
      }
      let whereFilter;
      if (filter.place && !filter.name) {
        whereFilter = {
          where: {
            fullAddress: {
              like: new RegExp(`.*${filter.place}.*`, "i"),
            },
          },
        };
      } else if (filter.name && !filter.place) {
        whereFilter = {
          where: {
            fullName: {
              like: new RegExp(`.*${filter.name}.*`, "i"),
            },
          },
        };
      } else {
        whereFilter = {
          where: {
            or: [
              {
                fullName: {
                  like: new RegExp(`.*${filter.name}.*`, "i"),
                },
              },
              {
                fullAddress: {
                  like: new RegExp(`.*${filter.place}.*`, "i"),
                },
              },
            ],
          },
        };
      }
      filter.collectionType = collectionName;
      const profiles = await findProfiles(whereFilter);
      const result = await utils.composeTextSearchResult(ctx.req.accessToken.userId, filter, profiles);
      logger.publish(2, `${collectionName}`, "textSearch:res", result);
      return result;
    } catch (error) {
      logger.publish(2`${collectionName}`, "textSearch:err", error);
      return error;
    }
  };

  const findAddresses = async (filter) =>
    new Promise((resolve, reject) => {
      Account.app.models.Address.find(
        {
          where: {
            public: true,
            coordinates: {
              near: filter.location,
              maxDistance: filter.maxDistance,
              unit: filter.unit,
            },
          },
        },
        (err, addresses) => (err ? reject(err) : resolve(addresses)),
      );
    });

  Account.geoLocate = async (filter) => {
    try {
      logger.publish(4, `${collectionName}`, "geoLocate:req", filter);
      filter.collectionType = collectionName;
      const addresses = await findAddresses(filter);
      //  logger.publish(4, `${collectionName}`, 'geoLocate:res', addresses);
      if (!addresses) {
        const error = new Error("Aucun match");
        return error;
      }
      let profileAddresses = await addresses.filter((address) => address.accountId);
      logger.publish(4, `${collectionName}`, "geoLocate:res", profileAddresses);
      if (profileAddresses.length > 0) {
        profileAddresses = await utils.composeGeoLocateResult(filter, addresses);
      }
      return profileAddresses;
    } catch (error) {
      logger.publish(2, `${collectionName}`, "geoLocate:err", error);
      return error;
      //  next(error);
    }
  };

};
