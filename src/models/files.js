import fileType from 'file-type';
import stream from 'stream';
import logger from '../services/logger';

const CONTAINERS_URL = `${process.env.REST_API_ROOT}/files/`;

/**
 * @module Files
 */
module.exports = function(Files) {
  const collectionName = 'files';

  Files.validatesPresenceOf('ownerId');

  Files.disableRemoteMethodByName('count');
  Files.disableRemoteMethodByName('upsertWithWhere');
  Files.disableRemoteMethodByName('replaceOrCreate');
  Files.disableRemoteMethodByName('createChangeStream');

  const uploadToContainer = (ctx, ownerId, options) =>
    new Promise((resolve, reject) =>
      Files.app.models.container.upload(ownerId, ctx.req, ctx.res, options, (err, fileObj) =>
        err ? reject(err) : resolve(fileObj.files.file[0]),
      ),
    );

  const uploadBufferToContainer = (buffer, ownerId, name) =>
    new Promise((resolve, reject) => {
      const bufferStream = new stream.PassThrough();
      bufferStream.on('error', reject);
      bufferStream.end(buffer);
      const type = fileType(buffer);
      if (!type || !type.ext) reject(new Error('File type information not found'));
      const nameParts = name.split('.');
      if (nameParts.length < 2) {
        name = `${name}.${type.ext}`;
      }
      const writeStream = Files.app.models.container.uploadStream(ownerId, name);
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

  const removeFromContainer = (ownerId, name) =>
    new Promise((resolve, reject) =>
      Files.app.models.container.removeFile(ownerId, name, (err, res) =>
        err ? reject(err) : resolve(res),
      ),
    );

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
      const options = {};
      //  ctx.res.set("Access-Control-Allow-Origin", "*")
      const filter = {
        where: {
          and: [{ ownerId }],
        },
      };

      if (name && name !== null) {
        options.name = name;
        filter.where.and.push({
          or: [
            { name: { like: new RegExp(`.*${name}.*`, 'i') } },
            { originalFilename: { like: new RegExp(`.*${name}.*`, 'i') } },
          ],
        });
      }

      let fileMeta = await Files.findOne(filter);
      const fileInfo = await uploadToContainer(ctx, ownerId, options);
      //  console.log('fileInfo Upload', fileInfo);

      if (fileMeta) {
        fileMeta.updateAttributes({
          type: fileInfo.type,
          //  size: fileInfo.size,
          name: fileInfo.name,
          originalFilename: fileInfo.originalFilename,
          url: `${CONTAINERS_URL}${ownerId}/download/${fileInfo.name}`,
        });
      } else {
        fileMeta = await Files.create({
          name: fileInfo.name,
          originalFilename: fileInfo.originalFilename,
          //  size: fileStat.size,
          type: fileInfo.type,
          ownerId,
          url: `${CONTAINERS_URL}${ownerId}/download/${fileInfo.name}`,
        });
      }

      // if (file[1])  await removeFromContainer(ownerId, name);
      logger.publish(3, `${collectionName}`, 'upload:res', fileInfo);
      //  return fileInfo;
      return fileMeta;
    } catch (err) {
      logger.publish(2, `${collectionName}`, 'upload:err', err);
      return err;
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
      let fileMeta = await Files.findOne({
        where: {
          and: [{ name: { like: new RegExp(`.*${name}.*`, 'i') } }, { ownerId }],
        },
      });

      const fileStat = await uploadBufferToContainer(buffer, ownerId, name);
      logger.publish(4, `${collectionName}`, 'uploadBuffer:res1', { fileStat });
      if (!fileStat || !fileStat.type) throw new Error('Failure while uploading stream');

      if (fileMeta) {
        fileMeta.updateAttributes({
          type: fileStat.type.mime,
          size: fileStat.size,
          name: fileStat.name,
          url: `${CONTAINERS_URL}${ownerId}/download/${fileStat.name}`,
          //  originalFilename: fileStat.originalFilename,
        });
      } else {
        fileMeta = await Files.create({
          size: fileStat.size,
          type: fileStat.type.mime,
          name: fileStat.name,
          ownerId,
          url: `${CONTAINERS_URL}${ownerId}/download/${fileStat.name}`,
          //  originalFilename: fileStat.originalFilename,
        });
      }
      logger.publish(3, `${collectionName}`, 'uploadBuffer:res', fileMeta);
      return fileMeta;
    } catch (err) {
      logger.publish(2, `${collectionName}`, 'upload:err', err);
      return err;
    }
  };

  /**
   * Request to download file in userId container
   * @method module:Files.download
   * @param {string} ownerId - Container owner and path
   * @param {string} name - File name
   * @returns {object} fileMeta
   */
  Files.download = async (ctx, userId, name) => {
    try {
      // let auth = false;
      ctx.res.set('Access-Control-Allow-Origin', '*');
      logger.publish(3, `${collectionName}`, 'download:req', userId);
      const readStream = Files.app.models.container.downloadStream(userId, name);
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
            ctx.res.status(200);
            resolve(body);
          });
          readStream.on('error', reject);
        });

        const result = await endStream;
        if (result && !(result instanceof Error)) {
          return result;
        }
        ctx.res.status(304);
        throw new Error('Error while reading stream');
      }
      throw new Error('no file found');
    } catch (error) {
      return error;
    }
  };

  Files.remove = async (userId, name) => {
    try {
      await removeFromContainer(userId, name);
      return true;
    } catch (error) {
      return error;
    }
  };

  /**
   * On sensor update, if an OMA resource is of float or integer type
   * @method Files:Measurement.compose
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
      const resource = sensor.resources[resourceId];
      const resourceType = typeof resource;
      logger.publish(3, `${collectionName}`, 'compose:req', { resourceType, resourceId });
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
      return error;
    }
  };
};
