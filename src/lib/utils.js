/* Copyright 2020 Edouard Maleix, read LICENSE */

/* eslint-disable no-underscore-dangle */
import ejs from 'ejs';
import * as fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import Papa from 'papaparse';
import JSONFilter from 'simple-json-filter';

/**
 * @module Utils
 */
const utils = {};

const codeNames = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  415: 'Unsupported',
};

/**
 * Custom Error builder
 * @method module:Utils.buildError
 * @param {number} statusCode
 * @param {string} code - error description
 * @param {string} message - error message
 * @returns {Error}
 */
utils.buildError = (statusCode, code, message) => {
  // eslint-disable-next-line security/detect-object-injection
  const err = new Error(code || codeNames[statusCode] || message || 'An error occurred!');
  err.statusCode = statusCode;
  // err.code = code;
  return err;
};

/**
 * Create directory
 * @method module:Utils.mkDirByPathSync
 * @param {string} targetDir
 * @param {object} options
 * @returns {Promise<string>} directory path
 */
utils.mkDirByPathSync = async (targetDir, { isRelativeToScript = false } = {}) => {
  const sep = path.sep;
  const initDir = path.isAbsolute(targetDir) ? sep : '';
  const baseDir = isRelativeToScript ? __dirname : '.';

  return targetDir.split(sep).reduce((parentDir, childDir) => {
    const curDir = path.resolve(baseDir, parentDir, childDir);
    try {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.mkdirSync(curDir);
    } catch (err) {
      if (err.code === 'EEXIST') return curDir;
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

/**
 * Promise wrapper to render EJS template in HTML
 * @method module:Utils.readFile
 * @param {object} options
 * @returns {Promise<object>} - HTML file and options
 */
utils.renderTemplate = options =>
  new Promise((resolve, reject) =>
    ejs.renderFile(options.template, options, (err, html) =>
      err ? reject(err) : resolve({ ...options, html }),
    ),
  );

/**
 * Promise wrapper to read a file
 * @method module:Utils.readFile
 * @param {string} filePath
 * @param {string} [opts] - format of the file
 * @returns {Promise<object>}
 */
utils.readFile = (filePath, opts = 'utf8') =>
  new Promise((resolve, reject) =>
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.readFile(filePath, opts, (err, data) => (err ? reject(err) : resolve(data))),
  );

/**
 * Promise wrapper to write a file
 * @method module:Utils.writeFile
 * @param {string} filePath
 * @param {object} data - file content
 * @param {string} [opts] - format of the file
 * @returns {Promise<object>}
 */
utils.writeFile = (filePath, data, opts = 'utf8') =>
  new Promise((resolve, reject) =>
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.appendFile(filePath, data, opts, err => (err ? reject(err) : resolve())),
  );

/**
 * Promise wrapper to remove a file
 * @method module:Utils.removeFile
 * @param {string} filePath
 * @returns {Promise<object>}
 */
utils.removeFile = filePath =>
  new Promise((resolve, reject) =>
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.unlink(filePath, err => (err && err.code !== 'ENOENT' ? reject(err) : resolve())),
  );

/**
 * Iterate over each KV Store keys found in cache
 * @generator
 * @async
 * @method module:Utils.cacheIterator
 * @param {object} Model - Loopback Model
 * @param {object} [filter] - filter.match
 * @yields {Promise<string>}  Storage key
 * @returns {Promise<string>}  Storage key
 */
utils.cacheIterator = async function*(Model, filter) {
  const iterator = Model.iterateKeys(filter);
  let empty = false;
  while (!empty) {
    // eslint-disable-next-line no-await-in-loop
    const key = await iterator.next();
    if (!key) {
      empty = true;
      break;
    }
    yield key;
  }
};

/**
 * Key generator for authentification
 * @method module:Utils.generateKey
 * @param {string} [hmacKey]
 * @param {string} [algorithm]
 * @param {string} [encoding]
 * @returns {string} key - Encoded key
 */
utils.generateKey = (hmacKey = 'loopback', algorithm = 'sha1', encoding = 'hex') => {
  const hmac = crypto.createHmac(algorithm, hmacKey);
  const buf = crypto.randomBytes(32);
  hmac.update(buf);
  const key = hmac.digest(encoding);
  return key;
};

/**
 * Array flattener, to transform multi dimensional arrays
 * @method module:Utils.flatten
 * @param {array} input
 * @returns {array}
 */
utils.flatten = input => {
  const stack = [...input];
  const res = [];
  while (stack.length) {
    // pop value from stack
    const next = stack.pop();
    if (Array.isArray(next)) {
      // push back array items, won't modify the original input
      stack.push(...next);
    } else {
      res.push(next);
    }
  }
  // reverse to restore input order
  return res.reverse();
};

/**
 * Convert an object as a CSV table
 * @method module:Utils.exportToCSV
 * @param {object | array} input
 * @param {object} [filter]
 * @returns {object}
 */
utils.exportToCSV = (input, filter) => {
  let selection;

  if (filter && Object.keys(filter).length > 0) {
    const sjf = new JSONFilter();
    // const exportBuffer = [];
    // sjf.addHandler(/^(.*)$/, (key, val, data) => {
    //   const str = data[key] + '';
    //   // console.log(val);
    //   for (let i = 0; i < str.length; i++) {
    //     if (data[key] !== undefined && data[key].includes(val)) {
    //       exportBuffer.push(data);
    //       //return data;
    //     }
    //   }
    // });

    const filterTemplate = {};
    // todo : filter valid keys
    Object.keys(filter).forEach(key => {
      // eslint-disable-next-line security/detect-object-injection
      filterTemplate[key] = filter[key];
    });

    selection = sjf
      .filter(filterTemplate)
      .data(input)
      .wantArray()
      .exec();

    // console.log('export selection', selection);
  } else {
    selection = input;
  }

  const csv = Papa.unparse(selection);
  return csv;
};

/**
 * Check if a process is configured to be master
 * @method module:Utils.isMasterProcess
 * @param {object} env - environment variables
 * @returns {boolean}
 */
utils.isMasterProcess = env => {
  if (
    env.CLUSTER_MODE &&
    (env.PROCESS_ID !== '0' || (env.INSTANCES_PREFIX && env.INSTANCES_PREFIX !== '1'))
  ) {
    return false;
  }
  return true;
};

/**
 * Extract ownerId from HTTP user options
 * @method module:Utils.getOwnerId
 * @param {object} options
 * @returns {string | null}
 */
utils.getOwnerId = options => {
  if (options.currentUser && options.currentUser.type) {
    if (options.currentUser.type === 'User') {
      return options.currentUser.id.toString();
    }
    return options.currentUser.ownerId.toString();
  }
  return null;
};

export default utils;
