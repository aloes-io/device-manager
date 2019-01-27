/* eslint-disable no-underscore-dangle */
import ejs from "ejs";
import * as fs from "fs";
import path from "path";
import moment from "moment";
import server from "./server";
import logger from "./logger";
//  import createVue from "./views/create-vue";

require("moment-recur");

const collectionName = "Utils";
const utils = {};

utils.buildError = (code, message) => {
  const err = new Error(message);
  err.statusCode = 400;
  err.code = code;
  return err;
};

utils.mkDirByPathSync = async (targetDir, {isRelativeToScript = false} = {}) => {
  const sep = path.sep;
  const initDir = path.isAbsolute(targetDir) ? sep : "";
  const baseDir = isRelativeToScript ? __dirname : ".";

  return targetDir.split(sep).reduce((parentDir, childDir) => {
    const curDir = path.resolve(baseDir, parentDir, childDir);
    try {
      fs.mkdirSync(curDir);
    } catch (err) {
      if (err.code === "EEXIST") {
        // curDir already exists!
        return curDir;
      }
      // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
      if (err.code === "ENOENT") {
        // Throw the original parentDir error on curDir `ENOENT` failure.
        throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
      }
      const caughtErr = ["EACCES", "EPERM", "EISDIR"].indexOf(err.code) > -1;
      if (!caughtErr || (caughtErr && targetDir === curDir)) {
        throw err; // Throw if it's just the last created dir.
      }
    }
    return curDir;
  }, initDir);
};

utils.renderTemplate = (options) =>
  new Promise((resolve, reject) => {
    ejs.renderFile(options.template, options, (err, html) => (err ? reject(err) : resolve({...options, html})));
  });

// generate sensors and virtual object template ( .vue )
// utils.renderVueTemplate = async (template, context) => {
//   const app = createVue(context, options.template);
//   const renderer = require("vue-server-renderer").createRenderer();

//   const filledTemplate = await renderer
//     .renderToString(app)
//     .then((html) => {
//       console.log(html);
//       return html;
//     })
//     .catch((err) => {
//       console.error(err);
//     });
//   return filledTemplate;
// };

utils.roleResolver = async (account, subcribeType) => {
  try {
    logger.publish(4, `${collectionName}`, "roleResolver:req", {
      subcribeType,
    });
    const Role = server.models.Role;
    const RoleMapping = server.models.RoleMapping;
    const adminRole = await Role.findOne({where: {name: "admin"}});
    const payload = await Role.find({where: {name: subcribeType}})
      .then((role) => ({account, role: role[0]}))
      .then((res) => res);

    const response = {...payload};
    logger.publish(4, `${collectionName}`, "roleResolver:res1", response);
    const foundRole = await RoleMapping.findOrCreate(
      {
        where: {
          and: [{principalId: response.account.id}, {roleId: {neq: adminRole.id}}],
        },
      },
      {
        principalType: RoleMapping.USER,
        principalId: response.account.id,
        roleId: response.role.id,
      },
    );
    logger.publish(4, `${collectionName}`, "roleResolver:res2", foundRole[0]);
    if (!foundRole) {
      return new Error("no role found or created !");
    }

    const result = await RoleMapping.replaceById(foundRole[0].id, {
      ...foundRole[0],
      principalType: RoleMapping.USER,
      principalId: response.account.id,
      roleId: response.role.id,
    });
    logger.publish(4, collectionName, "roleResolver:res", {
      result,
    });
    return result;
  } catch (error) {
    logger.publish(4, collectionName, "roleResolver:err", {
      error,
    });
    return error;
  }
};

const findCollection = (filter, collectionIdsList) =>
  new Promise((resolve, reject) => {
    server.models[filter.collectionType].find(
      {
        where: {id: {inq: collectionIdsList}},
        include: {
          relation: filter.relationName,
          scope: {
            where: {public: true},
          },
        },
      },
      (err, collection) => (err ? reject(err) : resolve(collection)),
    );
  });

utils.composeTextSearchResult = async (userId, filter, collection) => {
  collection.forEach((instance) => {
    if (instance._id && !instance.id) {
      instance.id = instance._id;
      delete instance._id;
    }
    return instance;
  });
  logger.publish(4, collectionName, "composeTextSearchResult:req", {
    userId,
    filter,
  });
  let filteredCollection = collection;
  if (filter.status) {
    //  console.log('status filter');
    filteredCollection = filteredCollection.filter((instance) => instance.status === true);
  }

  // if (filter.collectionType.toLowerCase() === "studio" && filter.yogaStyle) {
  //   filteredCollection = filteredCollection.filter((profile) => {
  //     if (profile.yogaPractices) {
  //       const found = profile.yogaPractices.find((style) => style === filter.yogaStyle);
  //       if (found) {
  //         //  console.log('yogastyle filter', found);
  //         return true;
  //       }
  //       return false;
  //     }
  //     return false;
  //   });
  // }
  // if (filter.collectionType.toLowerCase() === "teacher" && filter.certifiedYA) {
  //   //  console.log('teacher YA filter');
  //   filteredCollection = filteredCollection.filter((profile) => {
  //     const found = profile.trainings.find((training) => training.certifiedYA === true);
  //     if (found) {
  //       return profile;
  //     }
  //     return false;
  //   });
  // }
  //  console.log('2', filteredCollection);
  let collectionIdsList = filteredCollection.map((instance) => instance.id);
  if (filter.favorites) {
    const profileOwner = await server.models.Account.findOne({
      where: {
        accountId: userId,
      },
      include: "favorites",
    });
    const favorites = profileOwner.favorites();
    collectionIdsList = favorites.map((favorite) => {
      const found = collectionIdsList.find((id) => id.toString() === favorite.memberId.toString());
      if (found) {
        return found;
      }
      return false;
    });
  }

  if (filter.scheduler) {
    const matches = await server.models.Event.find({
      where: {
        and: [
          {[`${filter.collectionType.toLowerCase()}Id`]: {inq: collectionIdsList}},
          {
            start: {gte: filter.scheduler.start},
          },
          {
            start: {lte: filter.scheduler.end},
          },
          {
            end: {lte: filter.scheduler.end},
          },
          {
            end: {gte: filter.scheduler.start},
          },
        ],
      },
    });
    //  console.log('scheduler filter 2', matches);
    collectionIdsList = matches.map((match) => match[`${match.collectionType.toLowerCase()}Id`]);
    collectionIdsList = collectionIdsList.filter((item, index, inputArray) => inputArray.indexOf(item) === index);
  }
  if (filter.collectionType.toLowerCase() === "device") filter.relationName = "deviceAddress";
  else filter.relationName = "profileAddress";
  const result = await findCollection(filter, collectionIdsList);
  logger.publish(4, `${collectionName}`, "composeTextSearchResult:res", result);
  return result;
};

utils.composeGeoLocateResult = async (filter, collectionIdsList) => {
  try {
    if (filter.collectionType.toLowerCase() === "device") filter.relationName = "deviceAddress";
    else filter.relationName = "profileAddress";
    const result = await findCollection(filter, collectionIdsList);
    logger.publish(4, `${collectionName}`, "composeGeoLocateResult:res3", result);
    return result;
  } catch (error) {
    logger.publish(4, `${collectionName}`, "composeGeoLocateResult:err", error);
    return error;
  }
};

utils.verifyCaptcha = async (coinhive, hashes, token) => {
  const temp = {
    token,
    hashes,
    secret: process.env.COINHIVE_API_KEY,
  };
  const body = Object.keys(temp)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(temp[key])}`)
    .join("&");
  //  console.log(`[${collectionName.toUpperCase()}] verifyCaptcha req : ${body}`);
  if (coinhive) {
    return coinhive
      .verifyCaptcha("token/verify", body)
      .then((res) => JSON.parse(res))
      .catch((err) => err);
    // console.log(
    //   `[${collectionName.toUpperCase()}] verifyCaptcha res :`,
    //   JSON.parse(res),
    // );
    //  return result;
  }
  return false;
};

utils.createLink = async (coinhive, account, url) => {
  let result;
  const temp = {
    url,
    hashes: process.env.COINHIVE_HASHES,
    secret: process.env.COINHIVE_API_KEY,
  };
  const body = Object.keys(temp)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(temp[key])}`)
    .join("&");
  if (coinhive) {
    console.log("creating link", body);
    await coinhive
      .createLink("link/create", body)
      .then((res) => {
        console.log(`[${collectionName.toUpperCase()}] createLink res :`, res);
        result = JSON.parse(res);
      })
      .catch((err) => err);
    return result;
  }
  return false;
};

export default utils;
