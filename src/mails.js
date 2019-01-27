import {emailFrom, verifyTemplate, resetTemplate, inviteTemplate, contactFormTemplate} from "./config.json";
import server from "./server";
import utils from "./utils";
import logger from "./logger";

const collectionName = "Mail";
const mails = {};
const baseConf = {
  type: "email",
  to: "",
  from: emailFrom,
  text: "",
  headers: {"Mime-Version": "1.0"},
  host: `${process.env.HOST}`,
  port: process.env.PORT,
  restApiRoot: process.env.REST_API_ROOT,
  serverUrl: process.env.HTTP_SERVER_URL,
  url: "",
};
const config = {
  verifyOptions: {
    ...baseConf,
    subject: `Bienvenue sur ${process.env.APP_NAME}`,
    template: verifyTemplate,
  },
  resetOptions: {
    ...baseConf,
    subject: `Nouveau mot de passe ${process.env.APP_NAME}`,
    template: resetTemplate,
    //  redirect: `${process.env.HTTP_CLIENT_URL}`,
  },
  contactFormOptions: {
    ...baseConf,
    subject: `Nouveau message via le formulaire de contact ${process.env.APP_NAME}`,
    template: contactFormTemplate,
  },
  inviteOptions: {
    ...baseConf,
    subject: `Invitation sur ${process.env.APP_NAME}`,
    template: inviteTemplate,
  },
};

const sendMail = (updatedOptions) =>
  new Promise((resolve, reject) => {
    server.models.Email.send(updatedOptions, (err, res) => (err ? reject(err) : resolve(res)));
  });

mails.send = async (options) => {
  try {
    const updatedOptions = await utils.renderTemplate(options);
    let result = await sendMail(updatedOptions);
    logger.publish(4, `${collectionName}`, "send:res", {
      result,
      options,
    });
    if (result.accepted.length < 1) {
      // send the mail a second time ?
      const mailError = utils.buildError("INVALID_EMAIL", "email was rejected");
      return mailError;
    }
    result = {message: "email sent"};
    return result;
  } catch (error) {
    logger.publish(2, `${collectionName}`, "send:err", error);
    return error;
  }
};

mails.verifyEmail = async (account) => {
  logger.publish(4, `${collectionName}`, "verifyEmail:req", account);
  // loopback appends &token=value
  const options = {
    ...config.verifyOptions,
    to: account.email,
    verifyHref: `${process.env.HTTP_SERVER_URL}${process.env.REST_API_ROOT}/Accounts/confirm?uid=${
      account.id
    }&redirect=${process.env.HTTP_CLIENT_URL}/login`,
    account,
    text: `Veuillez confirmer la création de votre compte ${account.type} en ouvrant le lien suivant`,
  };

  const result = await account.verify(options).catch((err) => {
    logger.publish(2, `${collectionName}`, "verifyEmail:err", err);
    return err;
  });
  // if (!result.email.accepted) {
  //   const error = new Error('Email rejected');
  //   logger.publish(2, `${collectionName}`, 'verifyEmail:err', error);
  //   return error;
  // }
  logger.publish(2, `${collectionName}`, "verifyEmail:res", result);
  return result;
};

mails.sendResetPasswordMail = async (options) => {
  logger.publish(4, `${collectionName}`, "sendResetPasswordMail:req", options);
  const newOptions = {
    ...config.resetOptions,
    to: options.email,
    url: `${process.env.HTTP_CLIENT_URL}/reset-password?userId=${options.accessToken.userId}&token=${
      options.accessToken.id
    }`,
    account: options.user,
    text: `Veuillez choisir votre nouveau mot de passe en ouvrant le lien suivant`,
  };

  return mails.send(newOptions);
};

mails.sendContactForm = async (options) => {
  logger.publish(4, `${collectionName}`, "sendContactForm:req", options);
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
    } vous a invité sur yogiinmycity, pour retrouver d'autres profils, cliquer sur le lien suivant :`,
  };
  return mails.send(newOptions);
};

export default mails;
