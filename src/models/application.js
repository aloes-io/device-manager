import logger from "../services/logger";

module.exports = (Application) => {
  const collectionName = "Application";
  Application.validatesUniquenessOf("appEui");

  // Application.beforeRemote("login", async (context) => {
  //   logger.publish(4, `${collectionName}`, "beforeLogin:res", context.args);
  //   return Application.login(context.args.credentials, "application")
  //     .then((token) => token)
  //     .catch((err) => {
  //       logger.publish(4, `${collectionName}`, "beforeLogin:err", {
  //         err,
  //       });
  //       return err;
  //     });
  // });

  Application.observe("after save", async (ctx) => {
    logger.publish(3, `${collectionName}`, "afterSave:req", ctx.instance);
    try {
      if (ctx.instance && Application.app) {
        if (ctx.isNewInstance) {
          const token = await Application.app.models.AccessToken.findOrCreate(
            {
              where: {
                appEui: ctx.instance.appEui,
                userId: ctx.instance.id,
              },
            },
            {
              appEui: ctx.instance.appEui,
              userId: ctx.instance.id,
            },
          );
          logger.publish(2, collectionName, "afterSave:res1", token[0]);
          await ctx.instance.updateAttribute("appKey", token[0].id.toString());
        }
        return null;
      }
      return ctx;
    } catch (error) {
      logger.publish(3, `${collectionName}`, "afterSave:err", error);
      throw error;
    }
  });
};
