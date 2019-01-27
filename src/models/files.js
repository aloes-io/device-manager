import logger from "../logger";

const CONTAINERS_URL = `${process.env.HTTP_SERVER_URL}${
  process.env.REST_API_ROOT
}/files/`;
const collectionName = "files";

module.exports = function(Files) {
  const uploadToContainer = (ctx, ownerId, options) =>
    new Promise((resolve, reject) =>
      Files.app.models.container.upload(
        ownerId,
        ctx.req,
        ctx.result,
        options,
        (err, fileObj) => (err ? reject(err) : resolve(fileObj.files.file[0])),
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

  Files.upload = async (ctx, userId) => {
    try {
      // console.log("upload", ctx.req);
      const options = {};
      if (!ctx.req.accessToken === userId) {
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
          where: {and: [{name: fileInfo.name}, {ownerId: userId}]},
        },
        {
          name: fileInfo.name,
          originalFilename: fileInfo.originalFilename,
          type: fileInfo.type,
          ownerId: userId,
          url: `${CONTAINERS_URL}${userId}/download/${fileInfo.name}`,
        },
      );
      console.log(`[${collectionName.toUpperCase()}] upload:res`, file[0]);
      return file[0];
    } catch (err) {
      logger.publish(2, `${collectionName}`, "upload:err", err);
      return err;
    }
  };

  Files.download = (ctx, userId, name, cb) => {
    ctx.res.set("Access-Control-Allow-Origin", "*");
    // const file = await downloadFromContainer(ctx, userId, name);
    // console.log(`[${collectionName.toUpperCase()}] download:res`, file);
    // return file;
    Files.app.models.container.download(
      userId,
      name,
      ctx.req,
      ctx.res,
      (err, fileObj) => {
        if (err) {
          logger.publish(4, `${collectionName}`, "download:err", err);
          cb(err);
        } else {
          cb(null, fileObj);
        }
      },
    );
  };
};
