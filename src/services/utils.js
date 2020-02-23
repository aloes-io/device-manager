/* Copyright 2019 Edouard Maleix, read LICENSE */

/* eslint-disable no-underscore-dangle */
import ejs from 'ejs';
import * as fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import Papa from 'papaparse';
import JSONFilter from 'simple-json-filter';

const utils = {};

const codeNames = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  415: 'Unsupported',
};

utils.buildError = (statusCode, code, message) => {
  // eslint-disable-next-line security/detect-object-injection
  const err = new Error(code || codeNames[statusCode] || message || 'An error occurred!');
  err.statusCode = statusCode;
  // err.code = code;
  return err;
};

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

utils.renderTemplate = options =>
  new Promise((resolve, reject) => {
    ejs.renderFile(options.template, options, (err, html) =>
      err ? reject(err) : resolve({ ...options, html }),
    );
  });

utils.readFile = (filePath, opts = 'utf8') =>
  new Promise((resolve, reject) => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.readFile(filePath, opts, (err, data) => (err ? reject(err) : resolve(data)));
  });

utils.writeFile = (filePath, data, opts = 'utf8') =>
  new Promise((resolve, reject) => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.appendFile(filePath, data, opts, err => (err ? reject(err) : resolve()));
  });

utils.removeFile = filePath =>
  new Promise((resolve, reject) => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.unlink(filePath, err => (err && err.code !== 'ENOENT' ? reject(err) : resolve()));
  });

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

utils.isMasterProcess = env => {
  // if (process.env.CLUSTER_MODE) {
  //   if (process.env.PROCESS_ID !== '0') return null;
  //   if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
  // }
  if (
    env.CLUSTER_MODE &&
    (env.PROCESS_ID !== '0' || (env.INSTANCES_PREFIX && env.INSTANCES_PREFIX !== '1'))
  ) {
    return false;
  }
  return true;
};

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
