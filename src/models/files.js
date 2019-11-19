/* Copyright 2019 Edouard Maleix, read LICENSE */

import fileType from 'file-type';
import stream from 'stream';
import isAlphanumeric from 'validator/lib/isAlphanumeric';
import isLength from 'validator/lib/isLength';
import logger from '../services/logger';
import utils from '../services/utils';

const collectionName = 'Files';
const CONTAINERS_URL = `${process.env.REST_API_ROOT}/${collectionName}/`;
// const CONTAINERS_URL = `${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}/${collectionName}/`;

const createContainer = (app, options) =>
  new Promise((resolve, reject) =>
    app.models.container.createContainer(options, (err, res) => (err ? reject(err) : resolve(res))),
  );

const getContainers = app =>
  new Promise((resolve, reject) =>
    app.models.container.getContainers((err, res) => (err ? reject(err) : resolve(res))),
  );

const getContainer = (app, ownerId) =>
  new Promise((resolve, reject) =>
    app.models.container.getContainer(ownerId.toString(), (err, res) =>
      err ? reject(err) : resolve(res),
    ),
  );

const getFileFromContainer = (app, ownerId, name) =>
  new Promise((resolve, reject) =>
    app.models.container.getFile(ownerId.toString(), name, (err, res) =>
      err ? reject(err) : resolve(res),
    ),
  );

const getFilesFromContainer = (app, ownerId, options = {}) =>
  new Promise((resolve, reject) =>
    app.models.container.getFiles(ownerId.toString(), options, (err, res) =>
      err ? reject(err) : resolve(res),
    ),
  );

const uploadToContainer = (app, ctx, ownerId, options) =>
  new Promise((resolve, reject) =>
    app.models.container.upload(ownerId.toString(), ctx.req, ctx.res, options, (err, fileObj) =>
      err ? reject(err) : resolve(fileObj),
    ),
  );

const uploadBufferToContainer = (app, buffer, ownerId, name) =>
  new Promise((resolve, reject) => {
    const bufferStream = new stream.PassThrough();
    bufferStream.on('error', reject);
    bufferStream.end(buffer);
    const type = fileType(buffer);
    if (!type || !type.ext) reject(new Error('File type information not found'));
    name = `${name}.${type.ext}`;
    // const nameParts = name.split('.');
    // if (nameParts.length < 2) {
    //   name = `${name}.${type.ext}`;
    // }
    // todo append type to name ??

    const writeStream = app.models.container.uploadStream(ownerId.toString(), name);
    bufferStream.pipe(writeStream);
    writeStream.on('finish', () => {
      resolve({
        type,
        path: writeStream.path,
        size: writeStream.bytesWritten,
        name,
        //  originalFilename: `${name}`,
      });
    });
    writeStream.on('error', reject);
  });

const removeFileFromContainer = (app, ownerId, name) =>
  new Promise((resolve, reject) =>
    app.models.container.removeFile(ownerId.toString(), name, (err, res) =>
      err ? reject(err) : resolve(res),
    ),
  );

const removeContainer = (app, ownerId) =>
  new Promise((resolve, reject) =>
    app.models.container.destroyContainer(ownerId.toString(), (err, res) =>
      err ? reject(err) : resolve(res),
    ),
  );

/**
 * Validate instance before creation
 * @method module:Files~onBeforeSave
 * @param {object} ctx - Loopback context
 * @returns {object} ctx
 */
const onBeforeSave = async ctx => {
  try {
    if (ctx.data) {
      logger.publish(5, `${collectionName}`, 'onBeforeSave:req', ctx.data);
      if (ctx.data.name) {
        // UPDATE FILE IN CONTAINER TOO
        // prevent name from being updated
      }
      ctx.hookState.updateData = ctx.data;
    } else if (ctx.instance) {
      logger.publish(5, `${collectionName}`, 'onBeforeSave:req', ctx.instance);
      // UPDATE FILE IN CONTAINER TOO
      // prevent name from being updated
    }
    const data = ctx.data || ctx.instance || ctx.currentInstance;
    // const authorizedRoles =
    //   ctx.options && ctx.options.authorizedRoles ? ctx.options.authorizedRoles : {};
    logger.publish(4, `${collectionName}`, 'onBeforeSave:res', { data });
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onBeforeSave:err', error);
    throw error;
  }
};

const deleteProps = async (app, fileMeta) => {
  try {
    if (!fileMeta || !fileMeta.id || !fileMeta.ownerId) {
      throw utils.buildError(403, 'INVALID_FILE', 'Invalid file instance');
    }
    logger.publish(4, `${collectionName}`, 'deleteProps:req', fileMeta);
    try {
      const file = await getFileFromContainer(app, fileMeta.ownerId.toString(), fileMeta.name);
      if (file && file.name) {
        await removeFileFromContainer(app, fileMeta.ownerId, file.name);
      }
    } catch (e) {
      logger.publish(4, `${collectionName}`, 'deleteProps:err', e);
    }
    return fileMeta;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete relations on instance(s) deletetion
 * @method module:Files~onBeforeDelete
 * @param {object} ctx - Loopback context
 * @returns {object} ctx
 */
const onBeforeDelete = async ctx => {
  try {
    if (ctx.where && ctx.where.id && !ctx.where.id.inq) {
      const file = await ctx.Model.findById(ctx.where.id);
      await deleteProps(ctx.Model.app, file);
    } else {
      const filter = { where: ctx.where };
      const files = await ctx.Model.find(filter);
      await Promise.all(files.map(async file => deleteProps(ctx.Model.app, file)));
    }
    logger.publish(4, `${collectionName}`, 'onBeforeDelete:res', 'success');
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onBeforeDelete:err', error);
    throw error;
  }
};

const onBeforeRemote = async ctx => {
  try {
    if (
      ctx.method.name === 'upload' ||
      ctx.method.name === 'uploadBuffer' ||
      ctx.method.name === 'download'
    ) {
      const options = ctx.args ? ctx.args.options : {};
      if (!options || !options.currentUser) {
        throw utils.buildError(401, 'UNAUTHORIZED', 'Requires authentification');
      }
      // console.log('before remote', ctx.method.name, options.currentUser, ctx.args.ownerId);
      const isAdmin = options.currentUser.roles.includes('admin');
      if (!isAdmin) {
        if (!ctx.args.ownerId || ctx.args.ownerId !== options.currentUser.id.toString()) {
          throw utils.buildError(401, 'UNAUTHORIZED', 'Requires admin rights');
        }
      }
    }
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onBeforeRemote:err', error);
    throw error;
  }
};
/**
 * @module Files
 * @property {string} id  Database generated ID
 * @property {string} name
 * @property {string} type
 * @property {string} size
 * @property {string} role
 * @property {string} url
 */
module.exports = function(Files) {
  Files.validatesPresenceOf('ownerId');

  Files.disableRemoteMethodByName('count');
  Files.disableRemoteMethodByName('upsertWithWhere');
  Files.disableRemoteMethodByName('replaceOrCreate');
  Files.disableRemoteMethodByName('createChangeStream');

  const updateFileMeta = async (fileMeta, newFileMeta, ownerId) => {
    try {
      logger.publish(3, `${collectionName}`, 'updateFileMeta:req', { ownerId, ...newFileMeta });
      if (fileMeta && fileMeta.id) {
        await fileMeta.updateAttributes({ ...newFileMeta });
      } else {
        fileMeta = await Files.create({
          ...newFileMeta,
          ownerId,
          // url: `${CONTAINERS_URL}${ownerId}/download/${newFileMeta.originalFilename}`,
        });
      }
      return fileMeta;
    } catch (error) {
      throw error;
    }
  };
  /**
   * Request to upload file in userId container via multipart/form data
   * @method module:Files.upload
   * @param {object} ctx - Loopback context
   * @param {string} ownerId - Container owner and path
   * @param {string} [name] - File name
   * @returns {object} file
   */
  Files.upload = async (ctx, ownerId, name) => {
    try {
      logger.publish(3, `${collectionName}`, 'upload:req', { ownerId, name });

      const options = {};
      //  ctx.res.set("Access-Control-Allow-Origin", "*")
      const filter = {
        where: {
          and: [{ ownerId }],
        },
      };

      /* eslint-disable security/detect-non-literal-regexp */
      if (name && name !== null && isLength(name, { min: 2, max: 30 }) && isAlphanumeric(name)) {
        options.name = name;
        filter.where.and.push({
          or: [
            { name: { like: new RegExp(`.*${name}.*`, 'i') } },
            { originalFilename: { like: new RegExp(`.*${name}.*`, 'i') } },
          ],
        });
      }
      /* eslint-enable security/detect-non-literal-regexp */

      let fileMeta = await Files.findOne(filter);
      if (fileMeta && fileMeta.id) {
        await deleteProps(Files.app, fileMeta);
      }
      const result = await uploadToContainer(Files.app, ctx, ownerId.toString(), options);
      if (result && result.files) {
        if (result.files.length > 1) {
          let fileInfo;
          await Promise.all(
            result.files.map(async file => {
              Object.keys(file).forEach(key => {
                if (key === 'fields' && result.files.fields) {
                  fileInfo = result.files.fields;
                }
                if (key === 'file') {
                  fileInfo = result.files.file[0];
                }
              });
              fileInfo.url = `${CONTAINERS_URL}${ownerId}/download/${fileInfo.name}`;
              return updateFileMeta(fileMeta, fileInfo, ownerId);
            }),
          );
        } else {
          let fileInfo;
          Object.keys(result.files).forEach(key => {
            if (key === 'fields' && result.files.fields) {
              fileInfo = result.files.fields;
            }
            if (key === 'file') {
              fileInfo = result.files.file[0];
            }
          });
          fileInfo.url = `${CONTAINERS_URL}${ownerId}/download/${fileInfo.name}`;
          fileMeta = await updateFileMeta(fileMeta, fileInfo, ownerId);
        }
      } else {
        throw utils.buildError(400, 'ERROR_UPLOAD', 'Error while upload file');
      }

      logger.publish(3, `${collectionName}`, 'upload:res', fileMeta);
      return fileMeta;
    } catch (err) {
      logger.publish(2, `${collectionName}`, 'upload:err', err);
      throw err;
    }
  };

  /**
   * Request to upload file in userId container via raw buffer
   * @method module:Files.uploadBuffer
   * @param {buffer} buffer - Containing file data
   * @param {string} ownerId - Container owner and path
   * @param {string} name - File name
   * @returns {object} fileMeta
   */
  Files.uploadBuffer = async (buffer, ownerId, name) => {
    try {
      logger.publish(3, `${collectionName}`, 'uploadBuffer:req', { ownerId, name });
      if (!name || name === null || !isLength(name, { min: 4, max: 30 }) || !isAlphanumeric(name)) {
        throw new Error('Invalid file name');
      }
      let fileMeta = await Files.findOne({
        where: {
          // eslint-disable-next-line security/detect-non-literal-regexp
          and: [{ name: { like: new RegExp(`.*${name}.*`, 'i') } }, { ownerId }],
        },
      });
      // console.log('buffer file upload', typeof buffer, Buffer.isBuffer(buffer), buffer);
      const fileStat = await uploadBufferToContainer(Files.app, buffer, ownerId, name);
      logger.publish(4, `${collectionName}`, 'uploadBuffer:res1', { fileStat });
      if (!fileStat || !fileStat.type) throw new Error('Failure while uploading stream');
      fileMeta = await updateFileMeta(
        fileMeta,
        {
          type: fileStat.type.mime,
          size: fileStat.size,
          name: fileStat.name,
          url: `${CONTAINERS_URL}${ownerId}/download/${fileStat.name}`,
        },
        ownerId,
      );

      logger.publish(3, `${collectionName}`, 'uploadBuffer:res', fileMeta);
      return fileMeta;
    } catch (err) {
      logger.publish(2, `${collectionName}`, 'uploadBuffer:err', err);
      throw err;
    }
  };

  /**
   * Request to download file in ownerId container
   * @method module:Files.download
   * @param {string} ownerId - Container owner and path
   * @param {string} name - File name
   * @returns {object} fileMeta
   */
  Files.download = async (ctx, ownerId, name) => {
    try {
      // let auth = false;
      ctx.res.set('Access-Control-Allow-Origin', '*');
      logger.publish(3, `${collectionName}`, 'download:req', { ownerId, name });
      const readStream = Files.app.models.container.downloadStream(ownerId, name);
      if (readStream && readStream !== null) {
        const endStream = new Promise((resolve, reject) => {
          const bodyChunks = [];
          readStream.on('data', d => {
            bodyChunks.push(d);
          });
          readStream.on('end', () => {
            const body = Buffer.concat(bodyChunks);
            ctx.res.set('Content-Type', `application/octet-stream`);
            ctx.res.set('Content-Disposition', `attachment; filename=${name}`);
            ctx.res.set('Content-Length', readStream.bytesRead);
            // ctx.res.status(200);
            resolve(body);
          });
          readStream.on('error', reject);
        });

        const file = await endStream;
        return file;
        // throw utils.buildError(304, 'ERROR_STREAMING', 'Error while reading stream');
      }
      throw utils.buildError(404, 'NOT_FOUND', 'no file found');
    } catch (error) {
      throw error;
    }
  };

  Files.createContainer = async userId => createContainer(Files.app, { name: userId.toString() });

  Files.getContainers = async userId => getContainers(Files.app, userId);

  Files.getContainer = async (userId, name) => getContainer(Files.app, userId, name);

  Files.getFilesFromContainer = async userId => getFilesFromContainer(Files.app, userId);

  Files.getFileFromContainer = async (userId, name) =>
    getFileFromContainer(Files.app, userId, name);

  Files.removeContainer = async userId => removeContainer(Files.app, userId);

  Files.removeFileFromContainer = async (userId, name) =>
    removeFileFromContainer(Files.app, userId, name);

  /**
   * On sensor update, if an OMA resource is of float or integer type
   * @method modules:Files.compose
   * @param {object} sensor - updated Sensor instance
   * @returns {object} buffer
   */
  Files.compose = sensor => {
    try {
      if (
        !sensor ||
        !sensor.id ||
        !sensor.deviceId ||
        !sensor.resource ||
        !sensor.resources ||
        !sensor.type
      ) {
        throw new Error('Invalid sensor instance');
      }
      let buffer = null;
      const resourceId = sensor.resource.toString();
      // eslint-disable-next-line security/detect-object-injection
      const resource = sensor.resources[resourceId];
      const resourceType = typeof resource;
      logger.publish(3, `${collectionName}`, 'compose:req', {
        resourceType,
        resourceId,
      });
      if (resourceType === 'string') {
        try {
          buffer = Buffer.from(JSON.parse(resource));
        } catch (error) {
          buffer = Buffer.from(resource, 'binary');
          // buffer = Buffer.from(resource, 'base64');
        }
      } else if (resourceType === 'object' && resource.type) {
        buffer = Buffer.from(resource.data);
      } else if (Buffer.isBuffer(resource)) {
        buffer = resource;
      }
      // logger.publish(3, `${collectionName}`, 'compose:res', buffer);
      return buffer;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'compose:er', error);
      throw error;
    }
  };

  /**
   * Event reporting that a new Files instance will be created.
   * @event before_save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} user - Files new instance
   * @returns {function} Files~onBeforeSave
   */
  Files.observe('before save', onBeforeSave);

  /**
   * Event reporting that a / several File instance(s) will be deleted.
   * @event before_delete
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.where.id - File meta instance
   * @returns {function} Files~onBeforeDelete
   */
  Files.observe('before delete', onBeforeDelete);

  /**
   * Event reporting that a file instance / collection is requested
   * @event before_*
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @returns {function} Files~onBeforeRemote
   */
  Files.beforeRemote('**', onBeforeRemote);

  Files.afterRemoteError('*', (ctx, next) => {
    logger.publish(2, `${collectionName}`, `after ${ctx.methodString}:err`, '');
    next();
  });
};
