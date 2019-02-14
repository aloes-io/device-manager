import handlers from "aloes-handlers";

module.exports = function(Team) {
  const collectionName = "Team";

  Team.observe("after save", async (ctx) => {
    console.log(`[${collectionName.toUpperCase()}]  after save : ${JSON.stringify(ctx.options)}`);
    if (Team.app.brocker !== undefined) {
      if (ctx.isNewInstance) {
        const result = await handlers.publish({
          accountId: ctx.options.accessToken.userId,
          collectionName,
          data: ctx.instance,
          method: "POST",
          pattern: "aloesClient",
        });
        if (result && result.topic && result.payload) {
          await Team.app.publish(result.topic, result.payload);
        }
      }
      return null;
    }
    return null;
  });

  Team.observe("before delete", async (ctx) => {
    try {
      const instance = await ctx.Model.findById(ctx.where.id);
      console.log("before delete ", instance);
      if (instance && Team.app.brocker) {
        const result = await handlers.publish({
          accountId: ctx.options.accessToken.userId,
          collectionName,
          data: instance,
          method: "DELETE",
          pattern: "aloesClient",
        });
        if (result && result.topic && result.payload) {
          await Team.app.publish(result.topic, result.payload);
        }
        return null;
      }
      return null;
    } catch (error) {
      return error;
    }
  });
};
