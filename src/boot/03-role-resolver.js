//  import logger from '../services/logger';

// module.exports = function roleResolver(app) {
//   const Role = app.models.Role;

//   Role.registerResolver('$collaborator', (role, context, cb) => {
//     function reject() {
//       process.nextTick(() => {
//         cb(null, false);
//       });
//     }
//     console.log('[BOOT] roleResolver:req ', role, context);

//     if (context.modelName !== 'Application' && context.modelName !== 'Device') {
//       return reject();
//     }
//     // do not allow anonymous users
//     const userId = context.accessToken.userId;
//     if (!userId) {
//       return reject();
//     }

//     //  const principal = context.principal;
//     // const filter = {
//     //   where: {
//     //     or: [
//     //       { ownerId: { like: new RegExp(`.*${userId}.*`, 'i') } },
//     //       { userIds: { inq: [userId] } },
//     //     ],
//     //   },
//     // };

//     let auth = false;
//     context.model.findById(context.modelId, (err, res) => {
//       if (err) return cb(err);
//       if (!res) return reject();
//       //  if (!res) return cb(new Error(`${context.modelName} not found`));
//       if (res.ownerId && res.ownerId === userId) {
//         auth = false;
//       } else if (res.userIds && res.userIds.indexOf(userId) > -1) {
//         auth = true;
//       }
//       return auth;
//     });
//     console.log('[BOOT] roleResolver:res ', auth);

//     return cb(null, auth);
//   });

// Role.registerResolver('$deviceApp', async (role, context) => {
//   try {
//     console.log('[BOOT] roleResolver', context.modelName);
//     if (context.modelName !== 'Device') {
//       return false;
//     }
//     const appId = context.req.headers.appId || context.appId;
//     const tokenId = context.req.headers.apikey  || context.apikey;
//     if (!tokenId || !appId) {
//       return false;
//     }
//     const device = await context.model.findById(context.modelId);
//     if (!device || device === null) return false;
//     console.log('[BOOT] roleResolver:res', device);
//     if (device.appIds.some(id => id === appId) ) {
//       return true;
//     }
//     return false;
//   } catch (error) {
//     logger.publish(4, 'loopback', 'boot:roleResolver:err', error);
//     return error;
//   }
// });
// };
