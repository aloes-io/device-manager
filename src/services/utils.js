/* eslint-disable no-underscore-dangle */
import ejs from 'ejs';
import * as fs from 'fs';
import crypto from 'crypto';
import path from 'path';

const utils = {};

const codeNames = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
};

utils.buildError = (statusCode, code, message) => {
  const err = new Error(code || codeNames[statusCode] || message || 'An error occurred!');
  // const err = new Error(message);
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
    fs.readFile(filePath, opts, (err, data) => (err ? reject(err) : resolve(data)));
  });

utils.writeFile = (filePath, data, opts = 'utf8') =>
  new Promise((resolve, reject) => {
    fs.appendFile(filePath, data, opts, err => (err ? reject(err) : resolve()));
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

export default utils;
