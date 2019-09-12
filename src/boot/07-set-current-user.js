import logger from '../services/logger';
import roleManager from '../services/role-manager';

module.exports = app => {
  app
    .remotes()
    .phases.addBefore('invoke', 'set-current-user')
    .use((ctx, next) => {
      const options = ctx.args.options || {};
      const userId = options.accessToken && options.accessToken.userId;
      logger.publish(
        4,
        'loopback',
        `Incoming call to ${ctx.methodString} from`,
        `${userId ? `user-id: ${userId}` : 'anonymous'}`,
      );
      if (!userId) return next();

      return Promise.all([
        app.models.user.findById(userId),
        roleManager.getUserRoleNames(app, userId),
      ])
        .then(res => {
          // console.log('FOUND USER', res[0], res[1]);
          ctx.args.options.currentUser = {
            id: userId,
            email: res[0].email,
            roles: res[1],
          };
          next();
        })
        .catch(err => next(err));
    });
  return app;
};
