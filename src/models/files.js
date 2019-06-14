import logger from '../services/logger';

//  const CONTAINERS_URL = `${process.env.HTTP_SERVER_URL}${process.env.REST_API_ROOT}/files/`;
const CONTAINERS_URL = `${process.env.REST_API_ROOT}/files/`;
const collectionName = 'files';

/**
 * @module Files
 */

module.exports = function(Files) {
  const uploadToContainer = (ctx, ownerId, options) =>
    new Promise((resolve, reject) =>
      Files.app.models.container.upload(ownerId, ctx.req, ctx.res, options, (err, fileObj) =>
        err ? reject(err) : resolve(fileObj.files.file[0]),
      ),
    );

  // const deleteFromContainer = (ctx, ownerId, name) =>
  //   new Promise((resolve, reject) =>
  //     Files.app.models.container.removeFile(
  //       ownerId,
  //       name,
  //       ctx.req,
  //       ctx.result,
  //       (err, fileObj) => (err ? reject(err) : resolve(fileObj)),
  //     ),
  //   );

  // const infosFromContainer = (ctx, userId, name) =>
  //   new Promise((resolve, reject) =>
  //     Files.app.models.container.getFile(
  //       userId,
  //       name,
  //       ctx.req,
  //       ctx.result,
  //       (err, infos) => (err ? reject(err) : resolve(infos)),
  //     ),
  //   );

  // const downloadFile = (ctx, userId, name) =>
  //   new Promise((resolve, reject) =>
  //     Files.app.models.container.download(userId, name, ctx.req, ctx.res, (err, fileObj) =>
  //       err ? reject(err) : resolve(fileObj),
  //     ),
  //   );

  Files.upload = async (ctx, userId) => {
    try {
      const options = {};
      if (!ctx.req.accessToken) {
        throw new Error('no auth token');
      }
      let auth = false;
      const tokenUserId = ctx.req.accessToken.userId.toString();
      const Device = Files.app.models.Device;
      if (tokenUserId === userId.toString()) {
        auth = true;
      } else {
        const device = await Device.findById(userId);
        console.log('device', device);

        if (device && device.ownerId.toString() === tokenUserId) {
          auth = true;
        }
      }
      if (!auth) {
        return null;
      }
      //  ctx.res.set("Access-Control-Allow-Origin", "*")
      // check if owner already have fileType ( avatar or header ) saved
      // if no => Files.create
      // else =>
      //          Files.app.models.container.delete(userId,filename)
      //          && Files.app.models.container.upload
      //          && Files.update
      const fileInfo = await uploadToContainer(ctx, userId, options);
      //  console.log(`[${collectionName.toUpperCase()}] upload:res1`, fileInfo);
      const file = await Files.findOrCreate(
        {
          //  where: { and: [{ name: fileInfo.name }, { ownerId: userId }] },
          where: { and: [{ originalFilename: fileInfo.originalFilename }, { ownerId: userId }] },
        },
        {
          name: fileInfo.name,
          originalFilename: fileInfo.originalFilename,
          type: fileInfo.type,
          ownerId: userId,
          url: `${CONTAINERS_URL}${userId}/download/${fileInfo.name}`,
        },
      );
      //  console.log(`[${collectionName.toUpperCase()}] upload:res`, file[0]);
      logger.publish(3, `${collectionName}`, 'upload:res', fileInfo);
      return file[0];
    } catch (err) {
      logger.publish(2, `${collectionName}`, 'upload:err', err);
      return err;
    }
  };

  Files.download = async (ctx, userId, name) => {
    try {
      // let auth = false;
      // if (tokenUserId === userId.toString()) {
      //   auth = true;
      // }
      ctx.res.set('Access-Control-Allow-Origin', '*');
      ctx.res.set('Content-Type', `application/octet-stream`);
      ctx.res.set('Content-Disposition', `attachment; filename=${name}`);
      logger.publish(3, `${collectionName}`, 'download:req', userId);
      const fileStream = Files.app.models.container.downloadStream(userId.toString(), name);
      //  ctx.res.set('Content-Length', fileStream.bytesRead);

      if (fileStream && fileStream !== null) {
        //  console.log('found fileStream');
        fileStream
          .pipe(ctx.res)
          .on('finish', () => {
            ctx.res.end();
          })
          .on('error', err => {
            throw err;
          });
      }
      throw new Error('no file found');
    } catch (error) {
      return error;
    }
  };

  // Files.download = (ctx, userId, name, cb) => {
  //   ctx.res.set('Access-Control-Allow-Origin', '*');
  //   // console.log(`[${collectionName.toUpperCase()}] download:res`, file);
  //   logger.publish(3, `${collectionName}`, 'download:req', userId);
  //   // const file = await downlloadFile(ctx, userId, name);
  //   Files.app.models.container.download(userId, name, ctx.req, ctx.res, (err, fileObj) => {
  //     if (err) {
  //       logger.publish(4, `${collectionName}`, 'download:err', err);
  //       cb(err);
  //     } else {
  //       cb(null, fileObj);
  //     }
  //   });
  // };
};
