/* Copyright 2020 Edouard Maleix, read LICENSE */

import app from './server';
import utils from '../lib/utils';
import logger from './logger';

const emailFrom = process.env.CONTACT_EMAIL;
const verifyTemplate = `${__dirname}/../views/verify.ejs`;
const resetTemplate = `${__dirname}/../views/reset-password.ejs`;
const inviteTemplate = `${__dirname}/../views/mail-invite.ejs`;
const contactFormTemplate = `${__dirname}/../views/contact-form.ejs`;
const collectionName = 'Mail';

const baseConf = {
  type: 'email',
  to: '',
  from: emailFrom,
  text: '',
  headers: { 'Mime-Version': '1.0' },
  host: `${process.env.DOMAIN}`,
  port: process.env.HTTP_SECURE ? 443 : 80,
  // port: Number(process.env.HTTP_SERVER_PORT),
  restApiRoot: process.env.REST_API_ROOT,
  // restApiRoot: `${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}`,
  serverUrl: process.env.HTTP_SERVER_URL,
  url: '',
};

const config = {
  verifyOptions: {
    ...baseConf,
    subject: `Welcome on ${process.env.NODE_NAME}`,
    template: verifyTemplate,
  },
  resetOptions: {
    ...baseConf,
    subject: `New password for ${process.env.NODE_NAME}`,
    template: resetTemplate,
    //  redirect: `${process.env.HTTP_CLIENT_URL}`,
  },
  contactFormOptions: {
    ...baseConf,
    subject: `New message via contact form ${process.env.NODE_NAME}`,
    template: contactFormTemplate,
  },
  inviteOptions: {
    ...baseConf,
    subject: `You are invited to join ${process.env.NODE_NAME}`,
    template: inviteTemplate,
  },
};

/**
 * @module Mails
 */
const mails = {};

/**
 * Promise wrapper to send email using Email datasource
 * @method module:Mails~sendMail
 * @returns {Promise<object>}
 */
const sendMail = updatedOptions =>
  new Promise((resolve, reject) => {
    app.models.Email.send(updatedOptions, (err, mail) => (err ? reject(err) : resolve(mail)));
  });

/**
 * Generate HTML template and send email
 * @method module:Mails.send
 * @param {object} options - Mail options
 * @returns {Promise<object>} result - Mail result
 */
mails.send = async options => {
  try {
    const updatedOptions = await utils.renderTemplate(options);
    let result = await sendMail(updatedOptions);
    logger.publish(4, `${collectionName}`, 'send:res', {
      result,
      options,
    });
    if (result && result.accepted && result.accepted.length < 1) {
      // send the mail a second time ?
      throw utils.buildError(404, 'INVALID_EMAIL', 'email was rejected');
    }
    result = { message: 'email sent' };
    return result;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'send:err', error);
    return { message: 'email not sent' };
  }
};

/**
 * Promise wrapper to send verification email after user registration
 * @method module:Mails~verifyUser
 * @returns {Promise<object>}
 */
const verifyUser = (user, options) =>
  new Promise((resolve, reject) => {
    user.verify(options, (err, res) => (err ? reject(err) : resolve({ ...options, ...res })));
  });

/**
 * Sending a verification email to confirm account creation
 * @method module:Mails.verifyEmail
 * @param {object} user - Account created
 * @returns {Promise<object>} result - Mail result
 */
mails.verifyEmail = async user => {
  try {
    logger.publish(4, `${collectionName}`, 'verifyEmail:req', { verifyTemplate, user });
    // loopback will append &token=value
    const options = {
      ...config.verifyOptions,
      to: user.email,
      verifyHref: `${config.serverUrl}${config.restApiRoot}/users/confirm?uid=${user.id}&redirect=${
        process.env.HTTP_CLIENT_URL
      }/login`,
      user,
      text: `Please confirm account creation by opening this link`,
    };

    const result = await verifyUser(user, options);
    // if (!result.email.accepted) {
    //   const error = new Error('Email rejected');
    //   logger.publish(2, `${collectionName}`, 'verifyEmail:err', error);
    //   throw error;
    // }
    logger.publish(4, `${collectionName}`, 'verifyEmail:res', result);
    return result;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'verifyEmail:err', error);
    return null;
  }
};

/**
 * Sending a mail to set a new password
 * @method module:Mails.sendResetPasswordMail
 * @param {object} options - Mail options
 */
mails.sendResetPasswordMail = async options => {
  try {
    const newOptions = {
      ...config.resetOptions,
      to: options.email,
      url: `${process.env.HTTP_CLIENT_URL}/reset-password?userId=${
        options.accessToken.userId
      }&token=${options.accessToken.id}`,
      user: options.user,
      text: `You can assign a new password on clicking that link`,
    };
    logger.publish(4, `${collectionName}`, 'sendResetPasswordMail:req', newOptions);
    return mails.send(newOptions);
  } catch (error) {
    logger.publish(4, `${collectionName}`, 'sendResetPasswordMail:err', error);
    return null;
  }
};

/**
 * Sending a mail to admin
 * @method module:Mails.sendContactForm
 * @param {Promise<object>} options - Mail response
 */
mails.sendContactForm = async options => {
  try {
    const newOptions = {
      ...config.contactFormOptions,
      to: `${process.env.ADMIN_EMAIL}`,
      email: options.email,
      firstName: options.firstName,
      lastName: options.lastName,
      subject: options.subject,
      text: options.content,
    };
    logger.publish(4, `${collectionName}`, 'sendContactForm:req', newOptions);
    return mails.send(newOptions);
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'sendContactForm:err', error);
    return null;
  }
};

/**
 * Sending a mail invitation to new user
 * @method module:Mails.sendMailInvite
 * @param {Promise<object>} options - Mail response
 */
mails.sendMailInvite = async options => {
  try {
    const newOptions = {
      ...config.inviteOptions,
      to: options.email,
      guestName: options.email,
      url: `${process.env.HTTP_CLIENT_URL}`,
      text: `${options.profile.firstName} ${options.profile.lastName} invited you to join ${
        process.env.NODE_NAME
      }`,
    };
    logger.publish(4, `${collectionName}`, 'sendMailInvite:req', newOptions);
    return mails.send(newOptions);
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'sendConsendMailInvitetactForm:err', error);
    return null;
  }
};

export default mails;
