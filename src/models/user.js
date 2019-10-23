//  import {ensureLoggedIn} from 'connect-ensure-login';
import mails from '../services/mails';
import logger from '../services/logger';
import utils from '../services/utils';
import roleManager from '../services/role-manager';

const collectionName = 'User';

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
    // const container = await utils.mkDirByPathSync(`${process.env.FS_PATH}/${user.id}`);
    // console.log(`[${collectionName.toUpperCase()}] createProps:res`, container);
    try {
      await app.models.Files.createContainer(user.id);
    } catch (e) {
      console.log(`[${collectionName.toUpperCase()}] createProps:e`, e);
      if (e.code !== 'EEXIST') {
        throw e;
      }
    }

    if (!user.emailVerified) {
      app.models.user.emit('verifyEmail', user);
      // await mails.verifyEmail(user);
      // console.log('response after save ', response);
    }
    // logger.publish(4, `${collectionName}`, 'createProps:res', user);
    return user;
  } catch (error) {
    logger.publish(4, `${collectionName}`, 'createProps:err', error);
    throw error;
  }
};

/**
 * Validate instance before creation
 * @method module:User~onBeforeSave
 * @param {object} ctx - Loopback context
 * @returns {object} ctx
 */
const onBeforeSave = async ctx => {
  try {
    let role;
    const appRoles = await roleManager.getAppRoles();
    if (ctx.data) {
      logger.publish(4, `${collectionName}`, 'onBeforeSave:req', ctx.data);
      // filteredProperties.forEach(p => delete ctx.data[p]);
      role = ctx.data.role;
      if (!role || !appRoles.includes(role)) {
        role = 'user';
      }
      ctx.data.role = role;
      ctx.hookState.updateData = ctx.data;
    } else if (ctx.instance) {
      logger.publish(4, `${collectionName}`, 'onBeforeSave:req', ctx.instance);
      role = JSON.parse(JSON.stringify(ctx.instance)).role;
      if (!appRoles.includes(role)) {
        ctx.instance.setAttribute({ role: 'user' });
      } else {
        ctx.instance.setAttribute({ role });
      }
    }
    const data = ctx.data || ctx.instance || ctx.currentInstance;
    logger.publish(4, `${collectionName}`, 'onBeforeSave:res', { data, role });
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onBeforeSave:err', error);
    throw error;
  }
};

/**
 * Create relations on instance creation
 * @method module:User~onAfterSave
 * @param {object} ctx - Loopback context
 * @returns {object} ctx
 */
const onAfterSave = async ctx => {
  try {
    logger.publish(4, `${collectionName}`, 'onAfterSave:req', ctx.instance);
    if (ctx.hookState.updateData) {
      // logger.publish(4, `${collectionName}`, 'onAfterSave:req', ctx.hookState.updateData);
      // const updatedProps = Object.keys(ctx.hookState.updateData);
      return ctx;
    }
    if (ctx.isNewInstance) {
      const updatedUser = await createProps(ctx.Model.app, ctx.instance);
      if (!updatedUser || !updatedUser.id) {
        // await ctx.Model.app.User.destroyById(user.id);
        await ctx.instance.destroy();
        const error = utils.buildError(
          404,
          'FAILED_ACCOUNT_CREATION',
          `Failed to create account properly, try again`,
        );
        throw error;
      }
    }

    if (!ctx.isNewInstance || ctx.instance.role === 'admin') {
      const role = JSON.parse(JSON.stringify(ctx.instance)).role;
      await roleManager.setUserRole(ctx.Model.app, ctx.instance.id, role, !ctx.isNewInstance);
    }
    logger.publish(4, `${collectionName}`, 'onAfterSave:res', ctx.instance);
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onAfterSave:err', error);
    throw error;
  }
};

const deleteProps = async (app, user) => {
  try {
    logger.publish(5, `${collectionName}`, 'deleteProps:req', user);
    // console.log('INSTANCE ', user);
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

    logger.publish(4, `${collectionName}`, 'deleteProps:res', user);
    return user;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'deleteProps:err', error);
    throw error;
  }
};

/**
 * Delete relations on instance(s) deletetion
 * @method module:User~onBeforeDelete
 * @param {object} ctx - Loopback context
 * @returns {object} ctx
 */
const onBeforeDelete = async ctx => {
  try {
    logger.publish(4, `${collectionName}`, 'onBeforeDelete:req', ctx.where);
    if (ctx.where && ctx.where.id && !ctx.where.id.inq) {
      const user = await ctx.Model.findById(ctx.where.id);
      await deleteProps(ctx.Model.app, user);
    } else {
      const filter = { where: ctx.where };
      const users = await ctx.Model.find(filter);
      await Promise.all(users.map(async user => deleteProps(ctx.Model.app, user)));
    }
    logger.publish(4, `${collectionName}`, 'onBeforeDelete:res', 'done');
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onBeforeDelete:err', error);
    throw error;
  }
};

const onBeforeRemote = async (app, ctx) => {
  try {
    if (
      ctx.method.name.indexOf('upsert') !== -1 ||
      ctx.method.name.indexOf('updateAll') !== -1 ||
      ctx.method.name.indexOf('save') !== -1 ||
      ctx.method.name.indexOf('patchAttributes') !== -1 ||
      ctx.method.name.indexOf('updateAttributes') !== -1
    ) {
      const options = ctx.args ? ctx.args.options : {};
      const data = ctx.args.data;
      const authorizedRoles = options && options.authorizedRoles ? options.authorizedRoles : {};
      const role = data.role || 'user';
      const isAdmin = options && options.currentUser && options.currentUser.roles.includes('admin');
      // isAdmin = ctx.options && ctx.options.authorizedRoles && ctx.options.authorizedRoles.admin;
      // console.log('authorizedRoles, isAdmin & data', isAdmin, options, data);
      const nonAdminChangingRoleToAdmin = role === 'admin' && !isAdmin;
      const nonOwnerChangingPassword =
        !ctx.isNewInstance && authorizedRoles.owner !== true && data.password !== undefined;

      if (nonAdminChangingRoleToAdmin) {
        const error = utils.buildError(403, 'NO_ADMIN', 'Unauthorized to update this user');
        throw error;
      }
      if (nonOwnerChangingPassword) {
        const error = utils.buildError(403, 'NO_OWNER', 'Unauthorized to update this user');
        throw error;
      }
    } else if (ctx.method.name.indexOf('create') !== -1) {
      const options = ctx.args ? ctx.args.options : {};
      const data = ctx.args.data;
      const role = data.role || 'user';
      const isAdmin = options && options.currentUser && options.currentUser.roles.includes('admin');
      // console.log('authorizedRoles, isAdmin & data', isAdmin, options, data);
      if (role === 'admin' && !isAdmin) {
        const error = utils.buildError(403, 'NO_ADMIN', 'Unauthorized to create this user');
        throw error;
      }
    } else if (ctx.method.name === 'login') {
      logger.publish(4, `${collectionName}`, 'beforeLogin:req', ctx.args);
      try {
        // const options = {...ctx.args.credentials, ttl: 2 * 7 * 24 * 60 * 60}
        const token = await app.models.User.login(ctx.args.credentials, 'user');
        logger.publish(4, `${collectionName}`, 'beforeLogin:res', token);
        return token;
      } catch (err) {
        logger.publish(2, `${collectionName}`, 'beforeLogin:err', err);
        throw err;
      }
    }
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onBeforeRemote:err', error);
    throw error;
  }
};

/**
 * @module User
 * @property {string} id  Database generated ID
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} fullName
 * @property {string} fullAddress
 * @property {string} avatarImgUrl
 * @property {string} headerImgUrl
 * @property {boolean} status
 * @property {string} role admin or user
 */
module.exports = function(User) {
  //  User.validatesAbsenceOf('deleted', {unless: 'admin'});
  User.validatesLengthOf('password', {
    min: 5,
    message: { min: 'User password is too short' },
  });

  /**
   * Find a user by its email address and send a confirmation link
   * @method module:User.findByEmail
   * @param {string} email - User email address
   * @returns {object} mail result
   */
  User.findByEmail = async email => {
    try {
      logger.publish(4, `${collectionName}`, 'findByEmail:req', email);
      const user = await User.findOne({
        where: { email },
        fields: {
          email: true,
          firstName: true,
          lastName: true,
        },
      });
      if (!user || user === null) {
        const error = utils.buildError(404, 'USER_NOT_FOUND', `User doesn't exist`);
        throw error;
      }
      // User.app.emit('verifyEmail', user);
      logger.publish(4, `${collectionName}`, 'findByEmail:res', user);
      return user;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'findByEmail:err', error);
      throw error;
    }
  };

  /**
   * Send a confirmation link to confirm signup
   * @method module:User.verifyEmail
   * @param {object} user - User instance
   * @returns {object} mail result
   */
  User.verifyEmail = async user => {
    try {
      logger.publish(4, `${collectionName}`, 'verifyEmail:req', user);
      const instance = await User.findById(user.id, {
        fields: {
          email: true,
          firstName: true,
          lastName: true,
        },
      });
      if (!instance || instance === null) {
        const error = utils.buildError(404, 'USER_NOT_FOUND', `User doesn't exist`);
        throw error;
      }
      logger.publish(4, `${collectionName}`, 'verifyEmail:res', instance);
      User.app.emit('verifyEmail', user);
      return user;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'verifyEmail:err', error);
      throw error;
    }
  };

  /**
   * Updating user password using an authorization token
   * @method module:User.updatePasswordFromToken
   * @param {object} accessToken - User instance
   * @param {string} newPassword - User new password
   * @returns {boolean} result
   */
  User.updatePasswordFromToken = async (accessToken, newPassword) => {
    try {
      logger.publish(3, `${collectionName}`, 'updatePasswordFromToken:req', accessToken);
      let error;
      if (!accessToken || !accessToken.userId || !accessToken.id) {
        error = utils.buildError(401, 'INVALID_TOKEN', 'Missing token');
        throw error;
      }
      const token = await User.app.models.accessToken.findById(accessToken.id);
      if (!token || !token.userId || !token.id) {
        error = utils.buildError(401, 'INVALID_TOKEN', 'Token is invalid');
        throw error;
      }
      const user = await User.findById(accessToken.userId);
      if (!user || !user.id) {
        error = utils.buildError(404, 'INVALID_USER', 'User not found');
        throw error;
      }
      await user.updateAttribute('password', newPassword);
      return true;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'updatePasswordFromToken:err', error);
      throw error;
    }
  };

  /**
   * Updating user password
   * @method module:User.setNewPassword
   * @param {object} ctx - Loopback context
   * @param {string} oldPassword
   * @param {string} newPassword
   * @returns {object} user
   */
  User.setNewPassword = async (ctx, oldPassword, newPassword) => {
    try {
      let error;
      if (!ctx.req.accessToken) {
        error = utils.buildError(401, 'INVALID_TOKEN', 'Missing token');
        throw error;
      }
      logger.publish(3, `${collectionName}`, 'setNewPassword:req', '');
      const accessToken = ctx.req.accessToken;
      const token = await User.app.models.accessToken.findById(accessToken.id);
      if (!token || !token.userId || !token.id) {
        error = utils.buildError(401, 'INVALID_TOKEN', 'Token is invalid');
        throw error;
      }
      const user = await User.findById(accessToken.userId);
      if (!user || !user.id) {
        error = utils.buildError(404, 'INVALID_USER', 'User not found');
        throw error;
      }
      await User.changePassword(user.id, oldPassword, newPassword);
      //  logger.publish(3, `${collectionName}`, 'setNewPassword:res', res);
      return user;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'setNewPassword:err', error);
      throw error;
    }
  };

  /**
   * Sending a request to admin
   * @method module:User.sendContactForm
   * @param {object} form - Client form options
   * @fires User.sendContactForm
   */
  User.sendContactForm = async form => {
    logger.publish(4, `${collectionName}`, 'sendContactForm:req', form);
    try {
      if (!form || !form.email || !form.subject || !form.content) {
        const error = utils.buildError(400, 'INVALID_ARGS', 'Form is invalid');
        throw error;
      }
      User.app.emit('sendContactForm', form);
      return true;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'sendContactForm:err', error);
      throw error;
    }
  };

  User.sendInvite = async (ctx, options) => {
    try {
      if (!options || !options.email || !options.profile) {
        const error = utils.buildError(400, 'INVALID_ARGS', 'Options are invalid');
        throw error;
      }
      User.app.emit('sendMailInvite', options);
      return true;
    } catch (error) {
      logger.publish(2, collectionName, ' sendInvite:err', error);
      throw error;
    }
  };

  /**
   * Event reporting to trigger mails.verifyEmail
   * @event verifyEmail
   * @param {object} user - User instance
   * @returns {function} Mails.verifyEmail
   */
  User.on('verifyEmail', mails.verifyEmail);

  /**
   * Event reporting to trigger mails.send
   * @event sendContactForm
   * @param {object} options - Form properties
   * @returns {function} Mails.sendContactForm
   */
  User.on('sendContactForm', mails.sendContactForm);

  /**
   * Event reporting to trigger mails.send
   * @event sendMailInvite
   * @param {object} options - Form properties
   * @returns {function} Mails.sendMailInvite
   */
  User.on('sendMailInvite', mails.sendMailInvite);

  /**
   * Event reporting to send password reset link when requested
   * @event resetPasswordRequest
   * @param {object} options - Mail options
   * @returns {function} Mails.sendResetPasswordMail
   */
  User.on('resetPasswordRequest', mails.sendResetPasswordMail);

  /**
   * Event reporting that a new user instance will be created.
   * @event before_save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} user - User new instance
   * @returns {function} User~onBeforeSave
   */
  User.observe('before save', onBeforeSave);

  /**
   * Event reporting that a new user instance has been created.
   * @event after_save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} user - User new instance
   * @returns {function} User~onAfterSave
   */
  User.observe('after save', onAfterSave);

  /**
   * Event reporting that a user instance will be deleted.
   * @event before_delete
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.where.id - User instance id
   * @returns {function} User~onBeforeDelete
   */
  User.observe('before delete', onBeforeDelete);

  /**
   * Event reporting that a remote user method has been requested
   * @event before_*
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @returns {function} User~onBeforeRemote
   */
  User.beforeRemote('**', async ctx => onBeforeRemote(User.app, ctx));

  User.afterRemoteError('confirm', async ctx => {
    logger.publish(4, `${collectionName}`, `after ${ctx.methodString}:err`, '');
    ctx.res.redirect(process.env.HTTP_CLIENT_URL);
    return ctx;
  });

  // User.afterRemoteError('*', async (ctx) => {
  //   logger.publish(4, `${collectionName}`, `after ${ctx.methodString}:err`, '');
  //   // ctx.result = new Error(
  //   //   `[${collectionName.toUpperCase()}]  error on this remote method : ${
  //   //     ctx.methodString
  //   //   }`,
  //   // );
  //   return null;
  // });

  /**
   * Find users
   * @method module:User.find
   * @param {object} filter
   * @returns {object}
   */

  /**
   * Returns users length
   * @method module:User.count
   * @param {object} where
   * @returns {number}
   */

  /**
   * Find user by id
   * @method module:User.findById
   * @param {any} id
   * @returns {object}
   */

  /**
   * Create user
   * @method module:User.create
   * @param {object} user
   * @returns {object}
   */

  /**
   * Update user by id
   * @method module:User.updateById
   * @param {any} id
   * @returns {object}
   */

  /**
   * Delete user by id
   * @method module:User.deleteById
   * @param {any} id
   * @returns {object}
   */

  User.disableRemoteMethodByName('count');
  User.disableRemoteMethodByName('upsertWithWhere');
  User.disableRemoteMethodByName('replaceOrCreate');
  User.disableRemoteMethodByName('createChangeStream');

  User.disableRemoteMethodByName('prototype.__get__accessTokens');
  User.disableRemoteMethodByName('prototype.__findById__accessTokens');
  User.disableRemoteMethodByName('prototype.__count__accessTokens');
  User.disableRemoteMethodByName('prototype.__exists__accessTokens');
  User.disableRemoteMethodByName('prototype.__create__accessTokens');
  User.disableRemoteMethodByName('prototype.__update__accessTokens');
  User.disableRemoteMethodByName('prototype.__delete__accessTokens');
  User.disableRemoteMethodByName('prototype.__destroy__accessTokens');
  User.disableRemoteMethodByName('prototype.__updateById__accessTokens');
  User.disableRemoteMethodByName('prototype.__destroyById__accessTokens');

  User.disableRemoteMethodByName('prototype.__get__credentials');
  User.disableRemoteMethodByName('prototype.__findById__credentials');
  User.disableRemoteMethodByName('prototype.__count__credentials');
  User.disableRemoteMethodByName('prototype.__exists__credentials');
  User.disableRemoteMethodByName('prototype.__create__credentials');
  User.disableRemoteMethodByName('prototype.__update__credentials');
  User.disableRemoteMethodByName('prototype.__delete__credentials');
  User.disableRemoteMethodByName('prototype.__destroy__credentials');
  User.disableRemoteMethodByName('prototype.__updateById__credentials');
  User.disableRemoteMethodByName('prototype.__destroyById__credentials');

  User.disableRemoteMethodByName('prototype.__get__roleMapping');
  User.disableRemoteMethodByName('prototype.__findById__roleMapping');
  User.disableRemoteMethodByName('prototype.__count__roleMapping');
  User.disableRemoteMethodByName('prototype.__exists__roleMapping');
  User.disableRemoteMethodByName('prototype.__create__roleMapping');
  User.disableRemoteMethodByName('prototype.__update__roleMapping');
  User.disableRemoteMethodByName('prototype.__delete__roleMapping');
  User.disableRemoteMethodByName('prototype.__destroy__roleMapping');
  User.disableRemoteMethodByName('prototype.__updateById__roleMapping');
  User.disableRemoteMethodByName('prototype.__destroyById__roleMapping');

  User.disableRemoteMethodByName('prototype.__get__role');
  User.disableRemoteMethodByName('prototype.__findById__role');
  User.disableRemoteMethodByName('prototype.__count__role');
  User.disableRemoteMethodByName('prototype.__exists__role');
  User.disableRemoteMethodByName('prototype.__create__role');
  User.disableRemoteMethodByName('prototype.__updateById__role');
  User.disableRemoteMethodByName('prototype.__update__role');
  User.disableRemoteMethodByName('prototype.__delete__role');
  User.disableRemoteMethodByName('prototype.__destroyById__role');
  User.disableRemoteMethodByName('prototype.__destroy__role');
  User.disableRemoteMethodByName('prototype.__link__role');
  User.disableRemoteMethodByName('prototype.__unlink__role');

  User.disableRemoteMethodByName('prototype.__create__applications');
  User.disableRemoteMethodByName('prototype.__count__applications');
  User.disableRemoteMethodByName('prototype.__updateById__applications');
  User.disableRemoteMethodByName('prototype.__delete__applications');
  User.disableRemoteMethodByName('prototype.__deleteById__applications');
  User.disableRemoteMethodByName('prototype.__destroyById__applications');
  User.disableRemoteMethodByName('prototype.__link__applications');
  User.disableRemoteMethodByName('prototype.__unlink__applications');

  User.disableRemoteMethodByName('prototype.__create__devices');
  User.disableRemoteMethodByName('prototype.__count__devices');
  User.disableRemoteMethodByName('prototype.__updateById__devices');
  User.disableRemoteMethodByName('prototype.__delete__devices');
  User.disableRemoteMethodByName('prototype.__deleteById__devices');
  User.disableRemoteMethodByName('prototype.__destroyById__devices');
  User.disableRemoteMethodByName('prototype.__link__devices');
  User.disableRemoteMethodByName('prototype.__unlink__devices');

  User.disableRemoteMethodByName('prototype.__create__files');
  User.disableRemoteMethodByName('prototype.__count__files');
  User.disableRemoteMethodByName('prototype.__updateById__files');
  User.disableRemoteMethodByName('prototype.__delete__files');
  User.disableRemoteMethodByName('prototype.__deleteById__files');
  User.disableRemoteMethodByName('prototype.__destroyById__files');
  User.disableRemoteMethodByName('prototype.__link__files');
  User.disableRemoteMethodByName('prototype.__unlink__files');
};
