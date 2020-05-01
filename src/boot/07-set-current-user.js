/* Copyright 2020 Edouard Maleix, read LICENSE */

import isAlphanumeric from 'validator/lib/isAlphanumeric';
import isLength from 'validator/lib/isLength';
import logger from '../services/logger';
import roleManager from '../services/role-manager';

const setter = {
  aloes: (app, ip, aloesId, aloesKey) =>
    new Promise((resolve, reject) => {
      if (aloesId === process.env.ALOES_ID && aloesKey === process.env.ALOES_KEY) {
        return resolve({
          id: aloesId,
          ip,
          roles: ['machine'],
          type: 'Aloes',
        });
      }
      return reject(new Error('Invalid Aloes client'));
    }),
  user: (app, ip, token) =>
    new Promise((resolve, reject) => {
      roleManager
        .getUserRoleNames(app, token.userId)
        .then(roles =>
          resolve({
            id: token.userId.toString(),
            ip,
            roles,
            type: 'User',
          }),
        )
        .catch(reject);
    }),
  device: (app, ip, devEui, apiKey) =>
    new Promise((resolve, reject) => {
      app.models.Device.findOne({
        where: {
          // eslint-disable-next-line security/detect-non-literal-regexp
          and: [{ devEui: { like: new RegExp(`.*${devEui}.*`, 'i') } }, { apiKey }],
        },
      })
        .then(device =>
          resolve({
            id: device.id.toString(),
            ip,
            devEui: device.devEui,
            roles: ['user'],
            type: 'Device',
            ownerId: device.ownerId,
          }),
        )
        .catch(reject);
    }),
  application: (app, ip, appId, apiKey) =>
    new Promise((resolve, reject) => {
      app.models.Application.findOne({
        where: {
          and: [
            // eslint-disable-next-line security/detect-non-literal-regexp
            { id: { like: new RegExp(`.*${appId}.*`, 'i') } },
            { apiKey },
          ],
        },
      })
        .then(application =>
          resolve({
            id: application.id.toString(),
            ip,
            appId: application.id.toString(),
            appEui: application.appEui,
            roles: ['user'],
            type: 'Application',
            ownerId: application.ownerId,
          }),
        )
        .catch(reject);
    }),
};

module.exports = app => {
  const logCurrentUser = (method, options) => {
    logger.publish(4, 'loopback', 'setCurrentUser:res', {
      method,
      options,
    });
  };

  const setCurrentUser = (ctx, next) => {
    ctx.options = ctx.args.options || {};
    const headers = ctx.req.headers || {};
    const ip = ctx.req.ip || (ctx.req.connection && ctx.req.connection.remoteAddress);
    // logger.publish(3, 'loopback', 'setCurrentUser:test', { ips: ctx.req.ips, ip: ctx.req.ip });
    logger.publish(4, 'loopback', 'setCurrentUser:req', { ip, headers });
    if (headers['aloes-id'] && headers['aloes-key']) {
      return setter
        .aloes(app, ip, headers['aloes-id'], headers['aloes-key'])
        .then(currentUser => {
          ctx.options.currentUser = currentUser;
          logCurrentUser(ctx.methodString, ctx.options);
          //  await roleManager.setUserRole(app, accounts[0].id, 'machine', true);
          return next();
        })
        .catch(next);
    } else if (ctx.options.accessToken && ctx.options.accessToken.userId) {
      return setter
        .user(app, ip, ctx.options.accessToken)
        .then(currentUser => {
          ctx.options.currentUser = currentUser;
          logCurrentUser(ctx.methodString, ctx.options);
          //  await roleManager.setUserRole(app, accounts[0].id, 'machine', true);
          return next();
        })
        .catch(next);
    } else if (headers.authorization) {
      return app.models.accessToken
        .findById(headers.authorization)
        .then(token =>
          setter
            .user(app, ip, token)
            .then(currentUser => {
              ctx.options.currentUser = currentUser;
              logCurrentUser(ctx.methodString, ctx.options);
              //  await roleManager.setUserRole(app, accounts[0].id, 'machine', true);
              return next();
            })
            .catch(next),
        )
        .catch(next);
    } else if (
      headers.deveui &&
      isLength(headers.deveui, { min: 4, max: 64 }) &&
      isAlphanumeric(headers.deveui)
    ) {
      return setter
        .device(app, ip, headers.deveui, headers.apikey)
        .then(currentUser => {
          ctx.options.currentUser = currentUser;
          logCurrentUser(ctx.methodString, ctx.options);
          return next();
        })
        .catch(next);
    } else if (
      headers.appid &&
      isLength(headers.appid, { min: 1, max: 32 }) &&
      isAlphanumeric(headers.appid)
    ) {
      return setter
        .device(app, ip, headers.appid, headers.apikey)
        .then(currentUser => {
          ctx.options.currentUser = currentUser;
          logCurrentUser(ctx.methodString, ctx.options);
          return next();
        })
        .catch(next);
    }
    ctx.options.currentUser = {
      ip,
      userId: 'anonymous',
      roles: ['user'],
    };
    logCurrentUser(ctx.methodString, ctx.options);
    return next();
  };

  app
    .remotes()
    // .phases.addBefore('invoke', 'set-current-user')
    .phases.addBefore('auth', 'set-current-user')
    .use(setCurrentUser);

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
