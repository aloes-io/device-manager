/* Copyright 2020 Edouard Maleix, read LICENSE */

import isAlphanumeric from 'validator/lib/isAlphanumeric';
import isLength from 'validator/lib/isLength';
import logger from '../services/logger';
import roleManager from '../services/role-manager';

module.exports = app => {
  const logCurrentUser = (method, options) => {
    logger.publish(4, 'loopback', 'setCurrentUser:res', {
      method,
      options,
    });
  };

  const setCurrentUserSync = (ctx, next) => {
    const options = ctx.args.options || {};
    const headers = ctx.req.headers || {};
    const ip = ctx.req.ip || (ctx.req.connection && ctx.req.connection.remoteAddress);
    // logger.publish(3, 'loopback', 'setCurrentUser:test', { ips: ctx.req.ips, ip: ctx.req.ip });
    logger.publish(4, 'loopback', 'setCurrentUser:req', { ip, headers });

    // console.log('setCurrentUserSync', ctx.req.remotingContext);
    if (headers['aloes-id'] && headers['aloes-key']) {
      const aloesId = headers['aloes-id'];
      const aloesKey = headers['aloes-key'];
      if (aloesId === process.env.ALOES_ID && aloesKey === process.env.ALOES_KEY) {
        options.currentUser = {
          id: aloesId,
          ip,
          roles: ['machine'],
          type: 'Aloes',
        };
        ctx.options = { ...options };
        // ctx.args.options = { ...options };
        logCurrentUser(ctx.methodString, ctx.options);
        //  await roleManager.setUserRole(app, accounts[0].id, 'machine', true);
        return next();
      }
      return next(new Error('Invalid Aloes client'));
    } else if (options.accessToken && options.accessToken.userId) {
      return roleManager
        .getUserRoleNames(app, options.accessToken.userId)
        .then(roles => {
          options.currentUser = {
            id: options.accessToken.userId.toString(),
            ip,
            // email: promises[0].email,
            roles,
            type: 'User',
          };
          // ctx.args.options = { ...options };
          ctx.options = { ...options };
          logCurrentUser(ctx.methodString, ctx.options);
          return next();
        })
        .catch(next);
    } else if (headers.authorization) {
      return app.models.accessToken
        .findById(headers.authorization)
        .then(token => {
          roleManager
            .getUserRoleNames(app, token.userId)
            .then(roles => {
              options.currentUser = {
                id: token.userId.toString(),
                ip,
                roles,
                type: 'User',
              };
              // ctx.args.options = { ...options };
              ctx.options = { ...options };
              logCurrentUser(ctx.methodString, ctx.options);
              return next();
            })
            .catch(next);
        })
        .catch(next);
    } else if (
      headers.deveui &&
      isLength(headers.deveui, { min: 4, max: 64 }) &&
      isAlphanumeric(headers.deveui)
    ) {
      // or device.authenticate ? with header containing 'key'
      return app.models.Device.findOne({
        where: {
          and: [
            {
              devEui: {
                // eslint-disable-next-line security/detect-non-literal-regexp
                like: new RegExp(`.*${headers.deveui}.*`, 'i'),
              },
            },
            { apiKey: headers.apikey },
          ],
        },
      })
        .then(device => {
          options.currentUser = {
            id: device.id.toString(),
            ip,
            devEui: device.devEui,
            roles: ['user'],
            type: 'Device',
            ownerId: device.ownerId,
          };
          ctx.options = { ...options };
          logCurrentUser(ctx.methodString, ctx.options);
          return next();
        })
        .catch(next);
    } else if (
      headers.appid &&
      isLength(headers.appid, { min: 1, max: 32 }) &&
      isAlphanumeric(headers.appid)
    ) {
      return app.models.Application.findOne({
        where: {
          and: [
            {
              id: {
                // eslint-disable-next-line security/detect-non-literal-regexp
                like: new RegExp(`.*${headers.appid}.*`, 'i'),
              },
            },
            { apiKey: headers.apikey },
          ],
        },
      })
        .then(application => {
          options.currentUser = {
            id: application.id.toString(),
            ip,
            appId: application.id.toString(),
            appEui: application.appEui,
            roles: ['user'],
            type: 'Application',
            ownerId: application.ownerId,
          };
          ctx.options = { ...options };
          logCurrentUser(ctx.methodString, ctx.options);
          return next();
        })
        .catch(next);
    }
    options.currentUser = {
      ip,
      userId: 'anonymous',
      roles: ['user'],
    };
    ctx.options = { ...options };
    logCurrentUser(ctx.methodString, ctx.options);
    return next();
  };

  app
    .remotes()
    // .phases.addBefore('invoke', 'set-current-user')
    .phases.addBefore('auth', 'set-current-user')
    .use(setCurrentUserSync);

  // const Role = app.models.Role;

  // Role.registerResolver('collaborator', function(role, ctx, cb) {
  //   if (ctx.modelName !== 'Device') {
  //     return process.nextTick(() => cb(null, false));
  //   }

  //   const currentUser = ctx.options ? ctx.options.currentUser : {};
  //   logger.publish(4, 'loopback', 'setRoleResolver:res', { isMachine });
  //   context.model.findById(context.modelId, (err, device) => {
  //     if (err) return cb(err);
  //     if (!device) return cb(new Error('Device not found'));

  //     if (device.userIds.includes(currentUser.userId)) {
  //       return cb(null, true);
  //     } else {
  //       return cb(null, false);
  //     }
  //   });
  // });
};
