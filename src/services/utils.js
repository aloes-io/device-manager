/* eslint-disable no-underscore-dangle */
import ejs from 'ejs';
import * as fs from 'fs';
import path from 'path';
import server from '../server';
import logger from './logger';
//  import createVue from "./views/create-vue";

const collectionName = 'Utils';
const utils = {};

utils.buildError = (code, message) => {
  const err = new Error(message);
  err.statusCode = 400;
  err.code = code;
  return err;
};

utils.mkDirByPathSync = async (targetDir, { isRelativeToScript = false } = {}) => {
  const sep = path.sep;
  const initDir = path.isAbsolute(targetDir) ? sep : '';
  const baseDir = isRelativeToScript ? __dirname : '.';

  return targetDir.split(sep).reduce((parentDir, childDir) => {
    const curDir = path.resolve(baseDir, parentDir, childDir);
    try {
      fs.mkdirSync(curDir);
    } catch (err) {
      if (err.code === 'EEXIST') {
        // curDir already exists!
        return curDir;
      }
      // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
      if (err.code === 'ENOENT') {
        // Throw the original parentDir error on curDir `ENOENT` failure.
        throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
      }
      const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
      if (!caughtErr || (caughtErr && targetDir === curDir)) {
        throw err; // Throw if it's just the last created dir.
      }
    }
    return curDir;
  }, initDir);
};

utils.renderTemplate = options =>
  new Promise((resolve, reject) => {
    ejs.renderFile(options.template, options, (err, html) =>
      err ? reject(err) : resolve({ ...options, html }),
    );
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

utils.roleResolver = async (user, subcribeType) => {
  try {
    logger.publish(4, `${collectionName}`, 'roleResolver:req', {
      subcribeType,
    });
    const Role = server.models.Role;
    const RoleMapping = server.models.RoleMapping;
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    const payload = await Role.find({ where: { name: subcribeType } })
      .then(role => ({ user, role: role[0] }))
      .then(res => res);

    const response = { ...payload };
    logger.publish(4, `${collectionName}`, 'roleResolver:res1', response);
    const foundRole = await RoleMapping.findOrCreate(
      {
        where: {
          and: [{ principalId: response.user.id }, { roleId: { neq: adminRole.id } }],
        },
      },
      {
        principalType: RoleMapping.USER,
        principalId: response.user.id,
        roleId: response.role.id,
      },
    );
    logger.publish(4, `${collectionName}`, 'roleResolver:res2', foundRole[0]);
    if (!foundRole) {
      return new Error('no role found or created !');
    }

    const result = await RoleMapping.replaceById(foundRole[0].id, {
      ...foundRole[0],
      principalType: RoleMapping.USER,
      principalId: response.user.id,
      roleId: response.role.id,
    });
    logger.publish(4, collectionName, 'roleResolver:res', {
      result,
    });
    return result;
  } catch (error) {
    logger.publish(4, collectionName, 'roleResolver:err', {
      error,
    });
    return error;
  }
};

const findCollection = (filter, collectionIdsList) =>
  new Promise((resolve, reject) => {
    server.models[filter.collectionType].find(
      {
        where: { id: { inq: collectionIdsList } },
        include: {
          relation: filter.relationName,
          scope: {
            where: { public: true },
          },
        },
      },
      (err, collection) => (err ? reject(err) : resolve(collection)),
    );
  });

utils.composeGeoLocateResult = async (filter, collectionIdsList) => {
  try {
    if (filter.collectionType.toLowerCase() === 'device') filter.relationName = 'deviceAddress';
    else filter.relationName = 'profileAddress';
    const result = await findCollection(filter, collectionIdsList);
    logger.publish(4, `${collectionName}`, 'composeGeoLocateResult:res3', result);
    return result;
  } catch (error) {
    logger.publish(4, `${collectionName}`, 'composeGeoLocateResult:err', error);
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
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(temp[key])}`)
    .join('&');
  //  console.log(`[${collectionName.toUpperCase()}] verifyCaptcha req : ${body}`);
  if (coinhive) {
    return coinhive
      .verifyCaptcha('token/verify', body)
      .then(res => JSON.parse(res))
      .catch(err => err);
    // console.log(
    //   `[${collectionName.toUpperCase()}] verifyCaptcha res :`,
    //   JSON.parse(res),
    // );
    //  return result;
  }
  return false;
};

utils.createLink = async (coinhive, user, url) => {
  let result;
  const temp = {
    url,
    hashes: process.env.COINHIVE_HASHES,
    secret: process.env.COINHIVE_API_KEY,
  };
  const body = Object.keys(temp)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(temp[key])}`)
    .join('&');
  if (coinhive) {
    console.log('creating link', body);
    await coinhive
      .createLink('link/create', body)
      .then(res => {
        console.log(`[${collectionName.toUpperCase()}] createLink res :`, res);
        result = JSON.parse(res);
      })
      .catch(err => err);
    return result;
  }
  return false;
};

export default utils;
