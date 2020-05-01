/* Copyright 2020 Edouard Maleix, read LICENSE */

import logger from '../../services/logger';
import rateLimiter from '../../services/rate-limiter';
import roleManager from '../../services/role-manager';
import utils from '../utils';

export const collectionName = 'User';

/**
 * Create dependencies after a new user has been created
 * @async
 * @method module:User~createProps
 * @param {object} app - Loopback app
 * @param {object} user - New user instance
 * @returns {Promise<object | null>} user
 */
const createProps = async (app, user) => {
  try {
    logger.publish(4, `${collectionName}`, 'createProps:req', user);
    if (user.address && !(await user.address.get())) {
      await user.address.create({
        street: '',
        streetNumber: null,
        streetName: null,
        postalCode: null,
        city: null,
        public: false,
      });
    }
    try {
      await app.models.Files.createContainer(user.id);
    } catch (e) {
      logger.publish(3, `${collectionName}`, 'createProps:err', e);
      if (e.code !== 'EEXIST') {
        throw e;
      }
    }
    user.createdAt = Date.now();
    if (!user.emailVerified) {
      app.models.user.emit('verifyEmail', user);
    }
    // logger.publish(4, `${collectionName}`, 'createProps:res', user);
    return user;
  } catch (error) {
    logger.publish(4, `${collectionName}`, 'createProps:err', error);
    // throw error;
    return null;
  }
};

/**
 * Validate instance before creation
 * @async
 * @method module:User~onBeforeSave
 * @param {object} ctx - Loopback context
 * @returns {Promise<object>} ctx
 */
export const onBeforeSave = async ctx => {
  let roleName;
  const appRoles = roleManager.getAppRoles();
  if (ctx.data) {
    logger.publish(4, `${collectionName}`, 'onBeforeSave:req', ctx.data);
    roleName = ctx.data.roleName;
    if (!roleName || !appRoles.includes(roleName)) {
      roleName = 'user';
    }
    ctx.data.roleName = roleName;
    ctx.data.updatedAt = Date.now();
    ctx.hookState.updateData = ctx.data;
  } else if (ctx.instance) {
    logger.publish(4, `${collectionName}`, 'onBeforeSave:req', ctx.instance);
    ctx.instance.setAttribute({ updatedAt: Date.now() });
    roleName = ctx.instance.roleName;
    if (!appRoles.includes(roleName)) {
      ctx.instance.setAttribute({ roleName: 'user' });
    } else {
      ctx.instance.setAttribute({ roleName });
    }
  }
  logger.publish(4, `${collectionName}`, 'onBeforeSave:res', { roleName });
  return ctx;
};

/**
 * Create relations on instance creation
 * @async
 * @method module:User~onAfterSave
 * @param {object} ctx - Loopback context
 * @returns {Promise<object>} ctx
 */
export const onAfterSave = async ctx => {
  logger.publish(4, `${collectionName}`, 'onAfterSave:req', ctx.instance);
  if (ctx.hookState.updateData) {
    // const updatedProps = Object.keys(ctx.hookState.updateData);
    return ctx;
  }
  if (ctx.isNewInstance) {
    const updatedUser = await createProps(ctx.Model.app, ctx.instance);
    if (!updatedUser || !updatedUser.id) {
      // await ctx.Model.app.User.destroyById(user.id);
      await ctx.instance.destroy();
      throw utils.buildError(
        404,
        'FAILED_ACCOUNT_CREATION',
        `Failed to create account properly, try again`,
      );
    }
  }

  if (!ctx.isNewInstance || ctx.instance.roleName === 'admin') {
    const roleName = ctx.instance.roleName;
    await roleManager.setUserRole(ctx.Model.app, ctx.instance.id, roleName, !ctx.isNewInstance);
  }
  logger.publish(4, `${collectionName}`, 'onAfterSave:res', ctx.instance);
  return ctx;
};

/**
 * Control access validity and limit access if needed before login request
 *
 * Incrementing counter on failure and resetting it on success
 *
 * @method module:User~onBeforeLogin
 * @async
 * @param {object} ctx - Loopback context
 * @returns {Promise<object>} ctx
 */
const onBeforeLogin = async ctx => {
  logger.publish(4, `${collectionName}`, 'beforeLogin:req', {
    username: ctx.args && ctx.args.credentials ? ctx.args.credentials.email : null,
    options: ctx.options,
  });
  // const options = {...ctx.args.credentials, ttl: 2 * 7 * 24 * 60 * 60}
  const ipAddr = ctx.options && ctx.options.currentUser && ctx.options.currentUser.ip;
  const username = ctx.args.credentials.email;
  const { limiter, limiterType, retrySecs, usernameIPkey } = await rateLimiter.getAuthLimiter(
    ipAddr,
    username,
  );

  if (retrySecs > 0) {
    if (limiter && limiterType) {
      ctx.res.set('Retry-After', String(retrySecs));
      // eslint-disable-next-line security/detect-object-injection
      ctx.res.set('X-RateLimit-Limit', rateLimiter.limits[limiterType]);
      ctx.res.set('X-RateLimit-Remaining', limiter.remainingPoints);
      ctx.res.set('X-RateLimit-Reset', new Date(Date.now() + limiter.msBeforeNext));
    }
    throw utils.buildError(429, 'TOO_MANY_REQUESTS', 'Too many errors with this ip, unauthorized');
  }

  try {
    const token = await ctx.method.ctor.login(ctx.args.credentials, 'user');
    logger.publish(3, `${collectionName}`, 'beforeLogin:res', token);
    await rateLimiter.cleanAuthLimiter(ipAddr, username);
    return token;
  } catch (error) {
    // logger.publish(2, `${collectionName}`, 'beforeLogin:err', error);
    if (error.code === 'LOGIN_FAILED_EMAIL_NOT_VERIFIED' || error.code === 'TOO_MANY_REQUESTS') {
      throw error;
    }
    let loginError = utils.buildError(401, 'LOGIN_ERROR', 'Email or password is wrong');
    let user;
    try {
      user = await ctx.method.ctor.findByEmail(username);
      if (user && user.email) {
        logger.publish(
          2,
          `${collectionName}`,
          'beforeLogin:err',
          `Failure for user and IP : ${usernameIPkey}`,
        );
      }
    } catch (e) {
      logger.publish(2, `${collectionName}`, 'beforeLogin:err', `Failure for IP : ${ipAddr}`);
    } finally {
      try {
        await rateLimiter.setAuthLimiter(ipAddr, user ? username : null);
      } catch (rlRejected) {
        logger.publish(2, `${collectionName}`, 'beforeLogin:err2', rlRejected);
        if (rlRejected instanceof Error) {
          // loginError = utils.buildError(401, 'LOGIN_ERROR', 'Email or password is worng');
        } else {
          // ctx.res.set('Retry-After', String(Math.round(rlRejected.msBeforeNext / 1000)) || 1);
          // ctx.res.set('X-RateLimit-Limit', rlRejected.consumedPoints - 1);
          // ctx.res.set('X-RateLimit-Remaining', rlRejected.remainingPoints);
          // ctx.res.set('X-RateLimit-Reset', new Date(Date.now() + rlRejected.msBeforeNext));
          loginError = utils.buildError(
            429,
            'TOO_MANY_REQUESTS',
            'Too many errors with this ip, unauthorized',
          );
        }
      }
    }
    throw loginError;
  }
};

/**
 * Delete relations on instance(s) deletion
 * @async
 * @method module:User~deleteProps
 * @param {object} app - Loopback app
 * @param {object} user - user to delete
 * @returns {Promise<boolean>} ctx
 */
const deleteProps = async (app, user) => {
  try {
    logger.publish(4, `${collectionName}`, 'deleteProps:req', user);
    if (user.address && (await user.address.get()) !== null) {
      // console.log('user ADDRESS', await user.address.get());
      await user.address.destroy();
    }
    if (user.accessTokens) {
      await user.accessTokens.destroyAll();
    }
    if (user.devices && (await user.devices.count())) {
      await user.devices.destroyAll();
    }
    if (user.sensors && (await user.sensors.count())) {
      await user.sensors.destroyAll();
    }
    if (user.files && (await user.files.count())) {
      await user.files.destroyAll();
    }
    try {
      await app.models.files.removeContainer(user.id);
    } catch (e) {
      console.log(`[${collectionName.toUpperCase()}] deleteProps:e`, e);
    }

    logger.publish(3, `${collectionName}`, 'deleteProps:res', user);
    return true;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'deleteProps:err', error);
    return false;
  }
};

/**
 * Delete registered user
 * @async
 * @method module:User~onBeforeDelete
 * @param {object} ctx - Loopback context
 * @returns {Promise<object>} ctx
 */
export const onBeforeDelete = async ctx => {
  logger.publish(4, `${collectionName}`, 'onBeforeDelete:req', ctx.where);
  if (ctx.where && ctx.where.id && !ctx.where.id.inq) {
    const user = await utils.findById(ctx.Model, ctx.where.id);
    await deleteProps(ctx.Model.app, user);
  } else {
    const filter = { where: ctx.where };
    const users = await utils.find(ctx.Model, filter);
    await Promise.all(users.map(async user => deleteProps(ctx.Model.app, user)));
  }
  // logger.publish(3, `${collectionName}`, 'onBeforeDelete:res', 'done');
  return ctx;
};

/**
 * Hook executed before every remote methods
 * @async
 * @method module:User~onBeforeRemote
 * @param {object} ctx - Loopback context
 * @returns {Promise<object>} ctx
 */
export const onBeforeRemote = async ctx => {
  if (
    ctx.method.name.indexOf('upsert') !== -1 ||
    ctx.method.name.indexOf('updateAll') !== -1 ||
    ctx.method.name.indexOf('save') !== -1 ||
    ctx.method.name.indexOf('patchAttributes') !== -1 ||
    ctx.method.name.indexOf('updateAttributes') !== -1
  ) {
    const options = ctx.options || {};
    const data = ctx.args.data;
    const authorizedRoles = options && options.authorizedRoles ? options.authorizedRoles : {};
    const roleName = data.roleName || 'user';
    const isAdmin = options && options.currentUser && options.currentUser.roles.includes('admin');
    const nonAdminChangingRoleToAdmin = roleName === 'admin' && !isAdmin;
    const nonOwnerChangingPassword =
      !ctx.isNewInstance && authorizedRoles.owner !== true && data.password !== undefined;
    if (nonAdminChangingRoleToAdmin || nonOwnerChangingPassword) {
      throw utils.buildError(403, 'INVALID_ROLE', 'Unauthorized to update this user');
    }
  } else if (ctx.method.name.indexOf('create') !== -1) {
    const options = ctx.options || {};
    const data = ctx.args.data;
    const roleName = data.roleName || 'user';
    const isAdmin = options && options.currentUser && options.currentUser.roles.includes('admin');
    if (roleName === 'admin' && !isAdmin) {
      throw utils.buildError(403, 'NO_ADMIN', 'Unauthorized to create this user');
    }
  } else if (ctx.method.name === 'login') {
    await onBeforeLogin(ctx);
  }
  return ctx;
};
