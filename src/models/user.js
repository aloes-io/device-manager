//  import {ensureLoggedIn} from 'connect-ensure-login';
import mails from '../services/mails';
import logger from '../services/logger';
import utils from '../services/utils';
//  import initialRolesList from '../initial-data/base-roles.json';

const collectionName = 'User';
//  const resources = 'Users';

/**
 * @module User
 */
module.exports = function(User) {
  // async function subscribeTypeValidator(err) {
  //   let falseCounter = 0;
  //   await initialRolesList.forEach(role => {
  //     if (this.subscribed !== role.name) {
  //       falseCounter += 1;
  //     }
  //     if (falseCounter === initialRolesList.length) {
  //       return err();
  //     }
  //     return null;
  //   });
  // }

  //  User.validatesAbsenceOf('deleted', {unless: 'admin'});
  User.validatesLengthOf('password', {
    min: 5,
    message: { min: 'User password is too short' },
  });
  // User.validatesPresenceOf('type', {
  //   message: 'User must contain type value',
  // });

  // User.validate('subscribed', subscribeTypeValidator, {
  //   message: 'Wrong subcribe plan',
  // });

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
   * Event reporting that a new user instance has been created.
   * @event create
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} user - User new instance
   */
  User.afterRemote('**.create', async (ctx, user) => {
    let result;
    try {
      logger.publish(4, `${collectionName}`, 'afterCreate:req', user);
      await user.profileAddress.create({
        street: '',
        streetNumber: null,
        streetName: null,
        postalCode: null,
        city: null,
        public: false,
      });
      if (user.id) {
        const response = await mails.verifyEmail(user);
        logger.publish(4, `${collectionName}`, 'afterCreate:res', response);
        if (response.email.accepted[0] === user.email) {
          result = user;
          return result;
        }
        const error = utils.buildError(
          'INVALID_EMAIL',
          `Echec d'envoi de l'email à ${user.email}, veuillez réessayer`,
        );
        await User.destroyById(user.id);
        logger.publish(4, `${collectionName}`, 'afterCreate:err', error);
        return error;
      }
      const error = utils.buildError(
        'INVALID_PROFILE',
        `Echec de la création du profile ${user.type}`,
      );
      logger.publish(4, `${collectionName}`, 'afterCreate:err', error);
      return error;
    } catch (error) {
      await User.destroyById(user.id);
      logger.publish(4, `${collectionName}`, 'afterCreate:err', error);
      return error;
    }
  });

  User.afterRemoteError('confirm', async ctx => {
    logger.publish(4, `${collectionName}`, `after ${ctx.methodString}:err`, '');
    ctx.res.redirect(process.env.HTTP_CLIENT_URL);
    return null;
  });

  /**
   * Event reporting that an user has confirmed mail validation
   * @event after confirm
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   */
  User.afterRemote('confirm', async ctx => {
    logger.publish(4, `${collectionName}`, 'afterConfirm:req', ctx.args.uid);
    if (ctx.args.uid) {
      return utils
        .mkDirByPathSync(`${process.env.FS_PATH}/${ctx.args.uid}`)
        .then(res => {
          console.log(`[${collectionName.toUpperCase()}] container Check : ${res}`);
          return res;
        })
        .catch(err => err);
    }
    const error = await utils.buildError(
      'INVALID_CONATINER',
      `while creating containers for ${ctx.args.uid}`,
    );
    logger.publish(4, `${collectionName}`, 'afterConfirm:err', error);
    return error;
  });

  /**
   * Event reporting that an user attempts to login
   * @event before confirm
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   */
  User.beforeRemote('login', async ctx => {
    logger.publish(4, `${collectionName}`, 'beforeLogin:req', ctx.args);
    try {
      const token = await User.login(ctx.args.credentials, 'user');
      return token;
    } catch (err) {
      logger.publish(4, `${collectionName}`, 'beforeLogin:err', {
        err,
      });
      if (err.code && err.code === 'LOGIN_FAILED_EMAIL_NOT_VERIFIED') {
        console.log('user not verified');
        //  return new Error("user not verified");
        ctx.res.send('LOGIN_FAILED_EMAIL_NOT_VERIFIED');
        return err;
      }
      ctx.res.send('LOGIN_FAILED');
      return err;
    }
  });

  // User.beforeRemote('**.find', ensureLoggedIn('/login'), async ctx => {
  //   logger.publish(4, `${collectionName}`, 'beforeFind:req', ctx.args);
  //   try {
  //     return ctx;
  //   } catch (err) {
  //     logger.publish(4, `${collectionName}`, 'beforeFind:err', {
  //       err,
  //     });
  //     return err;
  //   }
  // });

  /**
   * Find an user by its email address and send a confirmation link
   * @method module:User.findByEmail
   * @param {string} email - User email address
   * @returns {object} mail result
   */
  User.findByEmail = async email => {
    try {
      logger.publish(4, `${collectionName}`, 'findByEmail:req', email);
      const user = await User.findOne({ where: { email } });
      if (!user || user === null) {
        return new Error("user doesn't exist");
      }
      const result = await mails.verifyEmail(user);
      if (result && !result.email.accepted) {
        const error = new Error('Email rejected');
        logger.publish(2, `${collectionName}`, 'findByEmail:err', error);
        return error;
      }
      logger.publish(4, `${collectionName}`, 'findByEmail:res', result);
      return result;
    } catch (error) {
      logger.publish(4, `${collectionName}`, 'findByEmail:err', error);
      return error;
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
      const instance = await User.findById(user.id);
      if (!instance || instance === null) {
        return new Error("user doesn't exist");
      }
      logger.publish(4, `${collectionName}`, 'verifyEmail:res1', instance);
      const result = await mails.verifyEmail(instance);
      if (result && !result.email.accepted) {
        const error = new Error('Email rejected');
        logger.publish(2, `${collectionName}`, 'findByEmail:err', error);
        return error;
      }
      logger.publish(4, `${collectionName}`, 'verifyEmail:res', result);
      return result;
    } catch (error) {
      logger.publish(4, `${collectionName}`, 'verifyEmail:err', error);
      return error;
    }
  };

  User.verifyCaptcha = async (hashes, token) => {
    let result;
    const coinhive = User.app.dataSources.coinhive;
    await utils
      .verifyCaptcha(coinhive, hashes, token)
      .then(res => {
        result = res;
      })
      .catch(err => err);
    return result;
  };

  User.verifyAddress = async address => {
    logger.publish(4, `${collectionName}`, 'verifyAddress:req', address);
    return User.app.models.Address.verifyAddress(address)
      .then(res => res)
      .catch(err => err);
  };

  //  send password reset link when requested
  User.on('resetPasswordRequest', async options => {
    logger.publish(3, `${collectionName}`, 'resetPasswordRequest:req', options);
    return mails.sendResetPasswordMail(options).catch(err => err);
    // logger.publish(3, `${collectionName}`, 'resetPasswordRequest:res', result);
  });

  User.updatePasswordFromToken = async (accessToken, newPassword) => {
    logger.publish(3, `${collectionName}`, 'updatePasswordFromToken:req', accessToken);
    let error;

    if (!accessToken) {
      error = utils.buildError('INVALID_TOKEN', 'token is null');
      return error;
    }

    const user = await User.findById(accessToken.userId)
      .then(res =>
        res.updateAttribute('password', newPassword).catch(err => {
          error = utils.buildError('INVALID_OPERATION', err);
          return Promise.reject(error);
        }),
      )
      .catch(err => {
        error = utils.buildError('INVALID_USER', err);
        return Promise.reject(error);
      });

    if (!user.id) {
      return false;
    }
    return true;
  };

  User.setNewPassword = async (ctx, oldPassword, newPassword) => {
    try {
      if (!ctx.req.accessToken) throw new Error('missing token');
      logger.publish(3, `${collectionName}`, 'setNewPassword:req', '');
      const accessToken = ctx.req.accessToken;
      const user = await User.findById(accessToken.userId);
      if (!user || !user.id) throw new Error('no user found');
      await User.changePassword(user.id, oldPassword, newPassword);
      //  logger.publish(3, `${collectionName}`, 'setNewPassword:res', res);
      return user;
    } catch (error) {
      return error;
    }
  };

  User.sendContactForm = async form => {
    logger.publish(4, `${collectionName}`, 'sendContactForm:req', form);
    try {
      const response = await mails.sendContactForm(form);
      logger.publish(4, `${collectionName}`, 'sendContactForm:res', response);
      return response;
    } catch (error) {
      logger.publish(4, `${collectionName}`, 'sendContactForm:err', error);
      throw error;
    }
  };

  User.sendInvite = async (ctx, options) => {
    try {
      const result = await mails.sendMailInvite(ctx, options);
      logger.publish(4, collectionName, ' sendInvite:res', result);
      return result;
    } catch (error) {
      logger.publish(4, collectionName, ' sendInvite:err', error);
      return error;
    }
  };
};
