//  import logger from '../services/logger';

module.exports = function roleResolver(app) {
  //  const Role = app.models.Role;
  // Role.registerResolver('device', async (role, context) => {
  //   try {
  //     console.log('[BOOT] roleResolver', role);
  //     if (context.modelName !== 'Device') {
  //       return false;
  //     }
  //     //  const userId = context.accessToken.userId;
  //     const userId = context.req.headers.userId;
  //     const tokenId = context.req.headers.authorization;
  //     if (!tokenId || !userId) {
  //       return false;
  //     }
  //     const device = await context.model.findById(context.modelId);
  //     if (!device || device === null) return false;
  //     console.log('[BOOT] roleResolver:res', device);
  //     if (device.apiKey === tokenId) {
  //       return true;
  //     }
  //     return false;
  //   } catch (error) {
  //     logger.publish(4, 'loopback', 'boot:roleResolver:err', error);
  //     return error;
  //   }
  // });
  // Role.registerResolver('teamMember', async (role, context) => {
  //   try {
  //     logger.publish(4, 'loopback', 'boot:roleResolver:res', role);
  //     // function reject() {
  //     //   process.nextTick(() => {
  //     //     cb(null, false);
  //     //     // return false
  //     //   });
  //     // }
  //     if (context.modelName !== 'Device') {
  //       //  return reject();
  //       return false;
  //     }
  //     const userId = context.accessToken.userId;
  //     if (!userId) {
  //       //  return reject();
  //       return false;
  //     }
  //     const virtualObject = await context.model.findById(context.modelId);
  //     if (!virtualObject) return false;
  //     const Team = app.models.Team;
  //     const count = await Team.count({
  //       ownerId: virtualObject.ownerId,
  //       memberId: userId,
  //       role: 'viewer',
  //     });
  //     console.log('[BOOT] roleResolver:res', count);
  //     if (count > 0) {
  //       //  return cb(null, true);
  //       return true;
  //     }
  //     //  return cb(null, false);
  //     return false;
  //   } catch (error) {
  //     logger.publish(4, 'loopback', 'boot:roleResolver:err', error);
  //     return error;
  //   }
  // });
};
