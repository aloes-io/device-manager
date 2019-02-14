//  const redis = require("redis");
import redis from "redis";
import redisDeletePattern from "redis-delete-pattern";
import {promisify} from "util";

//  const sep = "__";
let cacheInstance;

function getModelName(ctx) {
  return ctx.Model && ctx.Model.definition && ctx.Model.definition.name;
}

function getType(val) {
  return Object.prototype.toString.call(val).slice(8, -1);
}

//  Returns a function that watches model crection changes and publishes them
function loopbackHook(cache, app) {
  return async (ctx) => {
    try {
      const modelName = getModelName(ctx);
      if (!modelName) return ctx;

      if (!ctx.instance || ctx.instance === null) {
        if (ctx.where.id) {
          const cacheKey = `${modelName}-${new Buffer(`${JSON.stringify({id: ctx.where.id})}`).toString("base64")}`;
          const cacheValue = await cache.getAsync(cacheKey);
          console.log("[CACHE] afterSave:req", cacheKey, cacheValue);
          if (cacheValue && cacheValue !== null) {
            await cache.asyncRedisDeletePattern({
              redis: cache,
              pattern: cacheKey,
            });
          }
          return ctx;
        }
        return ctx;
      }
      if (ctx.instance && ctx.instance.id) {
        //  if (ctx.isNewInstance)
        const cacheKey = `${modelName}-${new Buffer(`${JSON.stringify({id: ctx.instance.id})}`).toString("base64")}`;
        const cacheExpire = ctx.req.query.cache || "120";
        await cache.setAsync(cacheKey, JSON.stringify(ctx.instance));
        await cache.expireAsync(cacheKey, cacheExpire);
        return ctx;
      }
      return ctx;
      // const models = await app.models[modelName].find();
      // if (!models || models.length < 1) {
      //   await cache.asyncRedisDeletePattern({
      //     redis: cache,
      //     pattern: modelName,
      //   });
      // } else await cache.setAsync(modelName, JSON.stringify(models));
    } catch (error) {
      // set ctx.error
      if (error && error.message) console.error(error.message);
      return null;
    }
  };
}

/**
 * Creates the cache machine
 *
 * @param {object} app - Loopback app object.
 * @param {object} options - Configuration options.
 * @param {string} options.host - Host for redis storage.
 * @param {string} options.port - Port for redis storage.
 * @param {object[]} [options.models] - Models to watch and cache.  Used when options.type is client.
 */
function Cache(options) {
  const self = this;

  self.cache = redis.createClient({
    host: options.host,
    port: options.port,
  });

  self.cache.getAsync = promisify(self.cache.get).bind(self.cache);
  self.cache.setAsync = promisify(self.cache.set).bind(self.cache);
  self.cache.ttlAsync = promisify(self.cache.ttl).bind(self.cache);
  self.cache.expireAsync = promisify(self.cache.expire).bind(self.cache);
  self.cache.asyncRedisDeletePattern = promisify(redisDeletePattern).bind(redisDeletePattern);

  self.cache.on("error", (err) => {
    if (err && err.message) console.error(err.message);
  });

  self.findObj = (modelName, key, value) =>
    self.findObjs(modelName, key, value).then((res) => (res && res.length > 0 ? res[0] : res));

  self.findObjs = async (modelName, key, value) => {
    try {
      return self.cache
        .getAsync(modelName)
        .then((res) => {
          if (res && res.length > 0) return JSON.parse(res);
          if (!self.unPrimed) return res;
          return self.unPrimed(modelName).then(() => self.findObjs(modelName, key, value));
        })
        .then((res) => {
          if (!res || res.length < 1) return [];
          return res.filter((obj) => obj[key] === value);
        });
    } catch (error) {
      return error;
    }
  };

  if (options) {
    if (options.unPrimed) {
      if (getType(options.unPrimed) !== "Function") throw new Error("options.unPrimed must be a function");
      self.unPrimed = options.unPrimed;
    }

    if (options.models)
      options.models.forEach((modelName) => {
        const Model = options.app.models[modelName];
        if (!modelName || !Model) return;
        Model.observe("after save", loopbackHook(self.cache, options.app));
        Model.observe("before delete", loopbackHook(self.cache, options.app));
      });
  }

  return self;
}

module.exports = function(options) {
  if (!cacheInstance && options) cacheInstance = Cache.call({}, options);
  return cacheInstance;
};
