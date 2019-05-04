import logger from '../services/logger';

export default function roleResolver(server) {
  const Role = server.models.Role;

  Role.registerResolver('teamMember', async (role, context) => {
    try {
      logger.publish(4, 'loopback', 'boot:roleResolver:res', role);
      // function reject() {
      //   process.nextTick(() => {
      //     cb(null, false);
      //     // return false
      //   });
      // }
      if (context.modelName !== 'VirtualObject') {
        //  return reject();
        return false;
      }
      const userId = context.accessToken.userId;
      if (!userId) {
        //  return reject();
        return false;
      }
      const virtualObject = await context.model.findById(context.modelId);
      if (!virtualObject) return false;

      const Team = server.models.Team;
      const count = await Team.count({
        ownerId: virtualObject.ownerId,
        memberId: userId,
        role: 'viewer',
      });
      console.log('[BOOT] roleResolver:res', count);
      if (count > 0) {
        //  return cb(null, true);
        return true;
      }
      //  return cb(null, false);
      return false;
    } catch (error) {
      logger.publish(4, 'loopback', 'boot:roleResolver:err', error);
      return error;
    }
  });

  Role.registerResolver('editor', async (role, context) => {
    try {
      console.log('[BOOT] roleResolver', role);
      if (context.modelName !== 'VirtualObject') {
        return false;
      }
      const userId = context.accessToken.userId;
      if (!userId) {
        return false;
      }
      const virtualObject = await context.model.findById(context.modelId);
      if (!virtualObject) return false;

      const Team = server.models.Team;
      const count = await Team.count({
        ownerId: virtualObject.ownerId,
        memberId: userId,
        role: 'editor',
      });
      console.log('[BOOT] roleResolver:res', count);
      if (count > 0) {
        return true;
      }
      return false;
    } catch (error) {
      logger.publish(4, 'loopback', 'boot:roleResolver:err', error);
      return error;
    }
  });
}
