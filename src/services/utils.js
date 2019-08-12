/* eslint-disable no-underscore-dangle */
import ejs from 'ejs';
import * as fs from 'fs';
import crypto from 'crypto';
import stream from 'stream';
import path from 'path';
import app from './server';
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

utils.readFile = (filePath, opts = 'utf8') =>
  new Promise((resolve, reject) => {
    fs.readFile(filePath, opts, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

utils.writeFile = (filePath, data, opts = 'utf8') =>
  new Promise((resolve, reject) => {
    fs.appendFile(filePath, data, opts, err => {
      if (err) reject(err);
      else resolve();
    });
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
    const Role = app.models.Role;
    const RoleMapping = app.models.RoleMapping;
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
    app.models[filter.collectionType].find(
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

utils.generateKey = (hmacKey, algorithm, encoding) => {
  hmacKey = hmacKey || 'loopback';
  algorithm = algorithm || 'sha1';
  encoding = encoding || 'hex';
  const hmac = crypto.createHmac(algorithm, hmacKey);
  const buf = crypto.randomBytes(32);
  hmac.update(buf);
  const key = hmac.digest(encoding);
  return key;
};

utils.liner = new stream.Transform({ objectMode: true });
// https://strongloop.com/strongblog/practical-examples-of-the-new-node-js-streams-api/
// example
// const source = fs.createReadStream('./access_log')
// source.pipe(utils.liner)
// utils.liner.on('readable', () => {
//      var line = ""
//      while (null !== (line = utils.liner.read())) {
//           // do something with line
//      }
// })

utils.liner._transform = function(chunk, encoding, done) {
  let data = chunk.toString();
  if (this._lastLineData) data = this._lastLineData + data;

  const lines = data.split('\n');
  this._lastLineData = lines.splice(lines.length - 1, 1)[0];

  lines.forEach(this.push.bind(this));
  done();
};

utils.liner._flush = function(done) {
  if (this._lastLineData) this.push(this._lastLineData);
  this._lastLineData = null;
  done();
};

export default utils;
