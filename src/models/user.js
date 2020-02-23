/* Copyright 2019 Edouard Maleix, read LICENSE */

/* eslint-disable global-require */
import isEmail from 'validator/lib/isEmail';
import {
  collectionName,
  onBeforeSave,
  onAfterSave,
  onBeforeDelete,
  onBeforeRemote,
} from '../lib/user';
import mails from '../services/mails';
import logger from '../services/logger';
import utils from '../services/utils';

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
 * @property {string} roleName admin or user
 */

module.exports = function(User) {
  //  User.validatesAbsenceOf('deleted', {unless: 'admin'});
  User.validatesLengthOf('password', {
    min: 5,
    message: { min: 'User password is too short' },
  });

  // User.validatesDateOf('createdAt', { message: 'createdAt is not a date' });
  // User.validatesDateOf('updatedAt', { message: 'updatedAt is not a date' });

  /**
   * Find a user by its email address and send a confirmation link
   * @method module:User.findByEmail
   * @param {string} email - User email address
   * @returns {object} mail result
   */
  User.findByEmail = async email => {
    logger.publish(4, `${collectionName}`, 'findByEmail:req', email);
    if (!isEmail(email)) {
      throw utils.buildError(400, 'INVALID_INPUT', 'Email is not valid');
    }
    const user = await User.findOne({
      where: { email },
      fields: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });
    if (!user || user === null) {
      throw utils.buildError(404, 'USER_NOT_FOUND', `User doesn't exist`);
    }
    logger.publish(4, `${collectionName}`, 'findByEmail:res', user);
    return user;
  };

  /**
   * Send a confirmation link to confirm signup
   * @method module:User.verifyEmail
   * @param {object} user - User instance
   * @returns {object} mail result
   */
  User.verifyEmail = async user => {
    logger.publish(4, `${collectionName}`, 'verifyEmail:req', user);
    if (!user || !user.id) {
      throw utils.buildError(400, 'INVALID_INPUT', 'User is not valid');
    }
    const instance = await User.findById(user.id, {
      fields: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });
    if (!instance || instance === null) {
      throw utils.buildError(404, 'USER_NOT_FOUND', `User doesn't exist`);
    }
    logger.publish(4, `${collectionName}`, 'verifyEmail:res', instance);
    User.app.emit('verifyEmail', user);
    return user;
  };

  /**
   * Updating user password using an authorization token
   * @method module:User.updatePasswordFromToken
   * @param {object} accessToken - User instance
   * @param {string} newPassword - User new password
   * @returns {boolean} result
   */
  User.updatePasswordFromToken = async (accessToken, newPassword) => {
    logger.publish(3, `${collectionName}`, 'updatePasswordFromToken:req', accessToken);
    if (!accessToken || !accessToken.userId || !accessToken.id) {
      throw utils.buildError(401, 'INVALID_TOKEN', 'Missing token');
    }
    const token = await User.app.models.accessToken.findById(accessToken.id);
    if (!token || !token.userId || !token.id) {
      throw utils.buildError(401, 'INVALID_TOKEN', 'Token is invalid');
    }
    const user = await User.findById(accessToken.userId);
    if (!user || !user.id) {
      throw utils.buildError(404, 'INVALID_USER', 'User not found');
    }
    await user.updateAttribute('password', newPassword);
    return true;
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
    if (!ctx.req.accessToken) {
      throw utils.buildError(401, 'INVALID_TOKEN', 'Missing token');
    }
    logger.publish(3, `${collectionName}`, 'setNewPassword:req', '');
    const accessToken = ctx.req.accessToken;
    const token = await User.app.models.accessToken.findById(accessToken.id);
    if (!token || !token.userId || !token.id) {
      throw utils.buildError(401, 'INVALID_TOKEN', 'Token is invalid');
    }
    const user = await User.findById(accessToken.userId);
    if (!user || !user.id) {
      throw utils.buildError(404, 'INVALID_USER', 'User not found');
    }
    await User.changePassword(user.id, oldPassword, newPassword);
    //  logger.publish(3, `${collectionName}`, 'setNewPassword:res', res);
    return user;
  };

  /**
   * Sending a request to admin
   * @method module:User.sendContactForm
   * @param {object} form - Client form options
   * @fires User.sendContactForm
   */
  User.sendContactForm = async form => {
    logger.publish(4, `${collectionName}`, 'sendContactForm:req', form);
    if (!form || !form.email || !form.subject || !form.content) {
      throw utils.buildError(400, 'INVALID_ARGS', 'Form is invalid');
    }
    User.app.emit('sendContactForm', form);
    return true;
  };

  User.sendInvite = async (ctx, options) => {
    if (!options || !options.email || !options.profile) {
      throw utils.buildError(400, 'INVALID_ARGS', 'Options are invalid');
    }
    User.app.emit('sendMailInvite', options);
    return true;
  };
  /**
   * Update client (as the user) status from MQTT connection status
   * @method module:User.updateStatus
   * @param {object} client - MQTT parsed client
   * @param {boolean} status - MQTT connection status
   * @returns {function}
   */
  User.updateStatus = async (client, status) => {
    if (!client || !client.id || !client.user) {
      throw new Error('Invalid client');
    }
    logger.publish(5, collectionName, 'updateStatus:req', status);
    const user = await User.findById(client.user);
    if (user && user.id) {
      const Client = User.app.models.Client;
      const ttl = 1 * 60 * 60 * 1000;
      // client.status = status;
      if (status) {
        await Client.set(client.id, JSON.stringify(client), ttl);
      } else {
        await Client.delete(client.id);
      }
      logger.publish(4, collectionName, 'updateStatus:res', { client, status });
      return client;
    }
    // user not found
    return null;
  };

  /**
   * Event reporting that User model has been attached to the application
   * @event attached
   */
  User.on('attached', () => {
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      User.definition.settings.emailVerificationRequired = false;
    }
  });

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
   * Event reporting that a client ( as the user ) connection status has changed.
   * @event client
   * @param {object} message - Parsed MQTT message.
   * @property {object} message.client - MQTT client
   * @property {boolean} message.status - MQTT client status.
   * @returns {function} User.updateStatus
   */
  User.on('client', async message => {
    try {
      logger.publish(2, `${collectionName}`, 'on-client:req', Object.keys(message));
      if (!message || message === null) throw new Error('Message empty');
      const status = message.status;
      const client = message.client;
      if (!client || !client.user || status === undefined) {
        throw new Error('Message missing properties');
      }
      return User.updateStatus(client, status);
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'on-client:err', error);
      return null;
    }
  });

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
   * @returns {function} User~onBeforeRemote
   */
  User.beforeRemote('**', onBeforeRemote);

  User.afterRemoteError('**', (ctx, next) => {
    logger.publish(4, `${collectionName}`, `afterRemote ${ctx.methodString}:err`, ctx.error);
    if (ctx.methodString === 'confirm') {
      ctx.res.redirect(process.env.HTTP_CLIENT_URL);
    }
    next();
  });

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
  // User.disableRemoteMethodByName('prototype.__count__applications');
  User.disableRemoteMethodByName('prototype.__updateById__applications');
  User.disableRemoteMethodByName('prototype.__delete__applications');
  User.disableRemoteMethodByName('prototype.__deleteById__applications');
  User.disableRemoteMethodByName('prototype.__destroyById__applications');
  User.disableRemoteMethodByName('prototype.__link__applications');
  User.disableRemoteMethodByName('prototype.__unlink__applications');

  User.disableRemoteMethodByName('prototype.__create__devices');
  // User.disableRemoteMethodByName('prototype.__count__devices');
  User.disableRemoteMethodByName('prototype.__updateById__devices');
  User.disableRemoteMethodByName('prototype.__delete__devices');
  User.disableRemoteMethodByName('prototype.__deleteById__devices');
  User.disableRemoteMethodByName('prototype.__destroyById__devices');
  User.disableRemoteMethodByName('prototype.__link__devices');
  User.disableRemoteMethodByName('prototype.__unlink__devices');

  User.disableRemoteMethodByName('prototype.__create__sensors');
  // User.disableRemoteMethodByName('prototype.__count__sensors');
  User.disableRemoteMethodByName('prototype.__updateById__sensors');
  User.disableRemoteMethodByName('prototype.__delete__sensors');
  User.disableRemoteMethodByName('prototype.__deleteById__sensors');
  User.disableRemoteMethodByName('prototype.__destroyById__sensors');
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
