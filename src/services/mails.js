import server from '../server';
import utils from './utils';
import logger from './logger';

const emailFrom = process.env.CONTACT_EMAIL;
const verifyTemplate = '../views/verify.ejs';
const resetTemplate = '../views/reset-password.ejs';
const inviteTemplate = '../views/mail-invite.ejs';
const contactFormTemplate = '../views/contact-form.ejs';
const collectionName = 'Mail';
const mails = {};
const baseConf = {
  type: 'email',
  to: '',
  from: emailFrom,
  text: '',
  headers: {'Mime-Version': '1.0'},
  host: `${process.env.HOST}`,
  port: process.env.PORT,
  restApiRoot: process.env.REST_API_ROOT,
  serverUrl: process.env.HTTP_SERVER_URL,
  url: '',
};
const config = {
  verifyOptions: {
    ...baseConf,
    subject: `Welcome on ${process.env.APP_NAME}`,
    template: verifyTemplate,
  },
  resetOptions: {
    ...baseConf,
    subject: `New password for ${process.env.APP_NAME}`,
    template: resetTemplate,
    //  redirect: `${process.env.HTTP_CLIENT_URL}`,
  },
  contactFormOptions: {
    ...baseConf,
    subject: `New message via contact form ${process.env.APP_NAME}`,
    template: contactFormTemplate,
  },
  inviteOptions: {
    ...baseConf,
    subject: `You are nvited on ${process.env.APP_NAME}`,
    template: inviteTemplate,
  },
};

const sendMail = updatedOptions =>
  new Promise((resolve, reject) => {
    server.models.Email.send(updatedOptions, (err, res) =>
      err ? reject(err) : resolve(res),
    );
  });

mails.send = async options => {
  try {
    const updatedOptions = await utils.renderTemplate(options);
    let result = await sendMail(updatedOptions);
    logger.publish(4, `${collectionName}`, 'send:res', {
      result,
      options,
    });
    if (result.accepted.length < 1) {
      // send the mail a second time ?
      const mailError = utils.buildError('INVALID_EMAIL', 'email was rejected');
      return mailError;
    }
    result = {message: 'email sent'};
    return result;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'send:err', error);
    return error;
  }
};

mails.verifyEmail = async user => {
  logger.publish(4, `${collectionName}`, 'verifyEmail:req', user);
  // loopback appends &token=value
  const options = {
    ...config.verifyOptions,
    to: user.email,
    verifyHref: `${process.env.HTTP_SERVER_URL}${
      process.env.REST_API_ROOT
    }/users/confirm?uid=${user.id}&redirect=${
      process.env.HTTP_CLIENT_URL
    }/login`,
    user,
    text: `Please confirm account creation by opening this link`,
  };

  const result = await user.verify(options).catch(err => {
    logger.publish(2, `${collectionName}`, 'verifyEmail:err', err);
    return err;
  });
  // if (!result.email.accepted) {
  //   const error = new Error('Email rejected');
  //   logger.publish(2, `${collectionName}`, 'verifyEmail:err', error);
  //   return error;
  // }
  logger.publish(2, `${collectionName}`, 'verifyEmail:res', result);
  return result;
};

mails.sendResetPasswordMail = async options => {
  logger.publish(4, `${collectionName}`, 'sendResetPasswordMail:req', options);
  const newOptions = {
    ...config.resetOptions,
    to: options.email,
    url: `${process.env.HTTP_CLIENT_URL}/reset-password?userId=${
      options.accessToken.userId
    }&token=${options.accessToken.id}`,
    user: options.user,
    text: `You can assign a new password on clicking that link`,
  };

  return mails.send(newOptions);
};

mails.sendContactForm = async options => {
  logger.publish(4, `${collectionName}`, 'sendContactForm:req', options);
  const newOptions = {
    ...config.contactFormOptions,
    to: `${process.env.ADMIN_EMAIL}`,
    email: options.email,
    firstName: options.firstName,
    lastName: options.lastName,
    subject: options.subject,
    text: options.content,
  };
  return mails.send(newOptions);
};

mails.sendMailInvite = async (ctx, options) => {
  console.log(`[${collectionName.toUpperCase()}] sendMailInvite req`, options);
  const newOptions = {
    ...config.inviteOptions,
    to: options.email,
    guestName: options.email,
    url: `${process.env.HTTP_CLIENT_URL}`,
    text: `${options.profile.firstName} ${
      options.profile.lastName
    } invited you on ${process.env.APP_NAME}`,
  };
  return mails.send(newOptions);
};

export default mails;
