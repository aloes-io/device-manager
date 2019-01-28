import handlers from "aloes-handlers";

module.exports = function(Favorite) {
  const collectionName = "Favorite";

  Favorite.observe("after save", async (ctx) => {
    console.log(`[${collectionName.toUpperCase()}]  after save : ${JSON.stringify(ctx.options)}`);
    // teacher = Favorite.app.models.Teacher.findById(ctx.instance.memberId)
    // studio = Favorite.app.models.Studio.findById(ctx.instance.studioId)
    // check who's the sender : ctx.options.accessToken.userId === studio.accountId or teacher.accountId
    // send a notification to the profile invited
    // send via profile or account id ?
    if (Favorite.app.brocker !== undefined) {
      if (ctx.isNewInstance) {
        const result = await handlers.publish({
          accountId: ctx.options.accessToken.userId,
          collectionName,
          data: ctx.instance,
          method: "POST",
          pattern: "aloesClient",
        });
        if (result && result.topic && result.payload) {
          await Favorite.app.publish(result.topic, result.payload);
        } else return null;
      }
      return null;
    }
    return null;
  });

  Favorite.observe("before delete", async (ctx) => {
    try {
      const instance = await ctx.Model.findById(ctx.where.id);
      console.log("before delete ", instance);
      if (instance && Favorite.app.brocker) {
        const result = await handlers.publish({
          accountId: ctx.options.accessToken.userId,
          collectionName,
          data: instance,
          method: "DELETE",
          pattern: "aloesClient",
        });
        if (result && result.topic && result.payload) {
          await Favorite.app.publish(result.topic, result.payload);
        } else return null;
        //  return null;
      }
      return null;
    } catch (error) {
      return error;
    }
  });
};
