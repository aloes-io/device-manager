import logger from '../services/logger';
import roleManager from '../services/role-manager';

module.exports = app => {
  app
    .remotes()
    .phases.addBefore('invoke', 'set-current-user')
    .use(async (ctx, next) => {
      try {
        const options = ctx.args.options || {};
        const headers = ctx.req.headers || {};
        //  logger.publish(4, 'loopback', 'setCurrentUser:req', { options, headers: ctx.req.headers });
        let userId;
        if (options.accessToken && options.accessToken.userId) {
          userId = options.accessToken.userId;
        } else if (headers.authorization) {
          const accessToken = await app.models.accessToken.findById(headers.authorization);
          if (accessToken && accessToken.userId) {
            userId = accessToken.userId;
          }
        }

        if (userId) {
          const promises = await Promise.all([
            app.models.user.findById(userId),
            roleManager.getUserRoleNames(app, userId),
          ]);
          if (promises[0] && promises[0].id) {
            if (!ctx.args.options) ctx.args.options = {};
            ctx.args.options.currentUser = {
              id: userId,
              email: promises[0].email,
              roles: promises[1],
              type: 'User',
            };
            logger.publish(4, 'loopback', `setCurrentUser:res`, {
              method: ctx.methodString,
              userId,
            });
          } else {
            logger.publish(4, 'loopback', `setCurrentUser:res`, {
              method: ctx.methodString,
              userId: 'anonymous',
            });
          }
          return next();
        }

        // if (headers.apikey) options.apiKey = headers.apikey;
        // if (headers.appid) options.appId = headers.appid;
        // if (headers.deveui) options.devEui = headers.deveui;
        // if (headers.deviceid) options.deviceId = headers.deviceid;
        const deviceDevEui = headers.deveui;
        const deviceApiKey = headers.apikey;
        if (!deviceDevEui || !deviceApiKey) {
          logger.publish(4, 'loopback', `setCurrentUser:res`, {
            method: ctx.methodString,
            userId: 'anonymous',
          });
          return next();
        }
        // or device.authenticate ? with header containing 'key'
        const device = await app.models.Device.findOne({
          where: {
            and: [
              {
                devEui: {
                  like: new RegExp(`.*${deviceDevEui}.*`, 'i'),
                },
              },
              { apiKey: deviceApiKey },
            ],
          },
        });
        // console.log('FOUND DEVICE', device);
        if (device && device.id) {
          if (!ctx.args.options) ctx.args.options = {};
          ctx.args.options.currentUser = {
            id: device.id,
            devEui: device.devEui,
            roles: ['user'],
            type: 'Device',
            // onwerId: device.ownerId
          };
          logger.publish(4, 'loopback', 'setCurrentUser:res', {
            method: ctx.methodString,
            devEui: device.devEui,
            userId: device.id,
          });
        } else {
          logger.publish(4, 'loopback', `setCurrentUser:res`, {
            method: ctx.methodString,
            userId: 'anonymous',
          });
        }

        return next();
      } catch (error) {
        logger.publish(2, 'loopback', 'setCurrentUser:err', error);
        return next(error);
      }
    });

  return app;
};
