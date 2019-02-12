// forked from https://github.com/vkatsar/loopback-redis-cache
import redis from "redis";
import redisDeletePattern from "redis-delete-pattern";
import {promisify} from "util";
import app from "../server";

module.exports = (Model, options) => {
  let clientSettings;
  if (options.client) {
    clientSettings = options.client;
  } else {
    //  const app = require("../server").default;
    clientSettings = app.get("redis");
  }

  let client = redis.createClient(clientSettings);
  const getAsync = promisify(client.get).bind(client);
  const setAsync = promisify(client.set).bind(client);
  const ttlAsync = promisify(client.ttl).bind(client);
  const expireAsync = promisify(client.expire).bind(client);
  const asyncRedisDeletePattern = promisify(redisDeletePattern).bind(redisDeletePattern);

  client.on("error", (err) => {
    console.log(err);
    // try to connect again with server config
    if (err.toString().indexOf("invalid password") !== -1) {
      console.log("Invalid password... reconnecting with server config...");
      clientSettings = app.get("redis");
      client = redis.createClient(clientSettings);
    }
  });

  // Model.observe("access", async (ctx) => {
  //   console.log("Accessing %s matching %s", ctx.Model.modelName, JSON.stringify(ctx.query.where));
  //   return ctx;
  // });

  Model.beforeRemote("**", async (ctx) => {
    try {
      // get all find methods and search first in cache
      if (
        (ctx.method.name.indexOf("find") !== -1 ||
          ctx.method.name.indexOf("__get") !== -1 ||
          ctx.method.name.indexOf("get") !== -1) &&
        client.connected
      ) {
        console.log("[CACHE] beforeRemote get:req", ctx.req.query, ctx.req.params);
        const modelName = `${ctx.method.sharedClass.name}-${ctx.method.name}`;
        const cacheExpire = ctx.req.query.cache || "120";
        const cacheKey = `${modelName}-${new Buffer(
          `${JSON.stringify(ctx.req.params)}${JSON.stringify(ctx.req.query)}`,
        ).toString("base64")}`;
        const cacheValue = await getAsync(cacheKey);
        console.log("[CACHE] beforeRemote:res", cacheKey, cacheValue);
        if (cacheValue !== null) {
          ctx.result = await JSON.parse(cacheValue);
          ctx.res.setHeader("Cache-Hit", true);
          const data = await ttlAsync(cacheKey);
          console.log("[CACHE] beforeRemote:res1", data);

          if (data) {
            ctx.res.setHeader("Cache-TTL", data);
            const expires = new Date();
            expires.setSeconds(expires.getSeconds() + Number(data));
            ctx.res.setHeader("Expires", expires);
          }
          return ctx;
          // return ctx.done((error) => {
          //   if (error) return error;
          //   return;
          // });
        }
        ctx.res.setHeader("Cache-Hit", false);
        ctx.res.setHeader("Cache-TTL", cacheExpire);
        const expires = new Date();
        expires.setSeconds(expires.getSeconds() + Number(cacheExpire));
        ctx.res.setHeader("Expires", expires);
        return ctx;
      }
      return ctx;
    } catch (error) {
      console.log("[CACHE] beforeRemote get:err", error);
      return error;
    }
  });

  Model.afterRemote("**", async (ctx, res) => {
    try {
      // get all find methods and search first in cache - if not exist save in cache
      if (
        (ctx.method.name.indexOf("find") !== -1 ||
          ctx.method.name.indexOf("__get") !== -1 ||
          ctx.method.name.indexOf("get") !== -1) &&
        client.connected
      ) {
        //  console.log("[CACHE] afterRemote get:req", res);
        console.log("[CACHE] afterRemote get:req", ctx.req.query, ctx.req.params);
        const modelName = `${ctx.method.sharedClass.name}-${ctx.method.name}`;
        const cacheExpire = ctx.req.query.cache || "120";
        const cacheKey = `${modelName}-${new Buffer(
          `${JSON.stringify(ctx.req.params)}${JSON.stringify(ctx.req.query)}`,
        ).toString("base64")}`;
        let cacheValue = await getAsync(cacheKey);
        console.log("[CACHE] afterRemote:res", cacheKey, cacheValue);
        if (cacheValue === null) {
          cacheValue = await JSON.stringify(res);
          await setAsync(cacheKey, cacheValue);
          await expireAsync(cacheKey, cacheExpire);
        }
        return cacheValue;
      }

      return ctx;
    } catch (error) {
      console.log("[CACHE] afterRemote get:err", error);
      return error;
    }
  });

  Model.observe("after save", async (ctx) => {
    try {
      if (client.connected) {
        if (ctx.instance) {
          console.log("Saved %s#%s", ctx.Model.modelName, ctx.instance.id);
          //  console.log("[CACHE] afterSave:req", ctx);
          const modelName = `${ctx.Model.modelName}`;
          const cacheKey = `${modelName}-*`;
          const cacheValue = await getAsync(cacheKey);
          console.log("[CACHE] afterSave:req", cacheKey, cacheValue);
          if (cacheValue && cacheValue !== null) {
            await asyncRedisDeletePattern({
              redis: client,
              pattern: cacheKey,
            });
          }
        } else {
          console.log("Updated %s matching %j", ctx.Model.pluralModelName, ctx.where);
        }
        return ctx;
      }
      return ctx;
    } catch (error) {
      console.log("[CACHE] afterSave:err", error);
      return error;
    }
  });

  Model.observe("after delete", async (ctx) => {
    try {
      if (client.connected && ctx.where) {
        console.log("Deleted %s matching %j", ctx.Model.pluralModelName, ctx.where);
        const modelName = `${ctx.Model.definition.name}`;
        const cacheKey = `${modelName}-*`;
        const cacheValue = await getAsync(cacheKey);
        console.log("[CACHE] afterDelete:req", cacheKey, cacheValue);
        if (cacheValue && cacheValue !== null) {
          await asyncRedisDeletePattern({
            redis: client,
            pattern: cacheKey,
          });
        }
        return ctx;
      }
      return ctx;
    } catch (error) {
      console.log("[CACHE] afterDelete:err", error);
      return error;
    }
  });
};
