import redis from 'redis';
import {promisify} from 'util';
import app from '../server';

module.exports = (Model, options) => {
  let clientSettings;
  if (options.client) {
    clientSettings = options.client;
  } else {
    //  const app = require("../server").default;
    clientSettings = app.get('redis');
  }
  let redisClient = redis.createClient({
    host: clientSettings.host,
    port: clientSettings.port,
    db: clientSettings.db.toString(),
  });

  if (clientSettings.password) {
    redisClient.auth(clientSettings.password, err => {
      if (err) throw err;
    });
  }
  /**
   * @method module:redisClient.hgetAsync
   * @params {string} model - Cache reference
   * @params {string} [id] - Cache model Id
   */
  redisClient.hgetAsync = promisify(redisClient.hget).bind(redisClient);

  /**
   * @method module:redisClient.hsetAsync
   * @params {string} model - Cache reference
   * @params {object} content - Object to save
   * @params {string} [id] - Cache model Id
   */
  redisClient.hsetAsync = promisify(redisClient.hset).bind(redisClient);

  /**
   * @method module:redisClient.hgetallAsync
   * @params {string} model - Cache reference
   */
  redisClient.hgetallAsync = promisify(redisClient.hgetall).bind(redisClient);

  /**
   * @method module:redisClient.hmsetAsync
   * @params {string} model - Cache reference
   * @params {object} content - Object to save
   */
  redisClient.hmsetAsync = promisify(redisClient.hmset).bind(redisClient);

  /**
   * @method module:redisClient.hkeysAsync
   * @params {string} model - Cache reference
   */
  redisClient.hkeysAsync = promisify(redisClient.hkeys).bind(redisClient);
  /**
   * @method module:redisClient.expireAsync
   * @params {string} model - Cache reference
   * @params {number} value - Expiration time
   */
  redisClient.expireAsync = promisify(redisClient.expire).bind(redisClient);

  redisClient.on('error', err => {
    console.log(err);
    // try to connect again with server config
    if (err.toString().indexOf('invalid password') !== -1) {
      console.log('Invalid password... reconnecting with server config...');
      clientSettings = app.get('redis');
      //  redisClient = redis.createClient(clientSettings);
      redisClient = redis.createClient({
        host: clientSettings.host,
        port: clientSettings.port,
        db: clientSettings.db,
      });
    }
  });

  Model.beforeRemote('**', async ctx => {
    try {
      // get all find methods and search first in cache
      if (
        (ctx.method.name.indexOf('find') !== -1 ||
          ctx.method.name.indexOf('__get') !== -1 ||
          ctx.method.name.indexOf('get') !== -1) &&
        redisClient.connected
      ) {
        console.log(
          '[CACHE] beforeRemote get:req',
          ctx.req.query,
          ctx.req.params,
        );
        let modelName = null;
        // const modelName = `${ctx.method.sharedClass.name}-${ctx.method.name}`;
        if (ctx.method.name.startsWith('__get')) {
          const methodParts = ctx.method.name.split('__');
          console.log('[CACHE] beforeRemote get:req', methodParts);

          modelName = methodParts[2];
        } else {
          modelName = `${ctx.method.sharedClass.name}`;
        }

        const cacheExpire = ctx.req.query.cache || '120';
        console.log('[CACHE] beforeRemote get:req', modelName);
        let cacheValue = {};
        let id = null;
        if (ctx.req.params && ctx.req.params.id) {
          id = ctx.req.params.id;
        } else if (ctx.req.query.filter) {
          const whereFilter = JSON.parse(ctx.req.query.filter);
          if (whereFilter && whereFilter.id) id = whereFilter.where.id;
        }
        if (id && id !== null) {
          console.log('[CACHE] beforeRemote get:id', id);
          cacheValue = await redisClient.hgetAsync(modelName, id).then(res => {
            if (res && res !== null) return JSON.parse(res);
            return {};
          });
        } else {
          // const cacheKey = `${modelName}-${new Buffer(
          //   `${JSON.stringify(ctx.req.params)}${JSON.stringify(ctx.req.query)}`,
          // ).toString('base64')}`;
          const rawCacheValue = await redisClient.hgetallAsync(modelName);
          console.log('[CACHE] beforeRemote get:rawCacheValue', rawCacheValue);

          if (!rawCacheValue || rawCacheValue === null) {
            return ctx;
          }
          const keys = Object.keys(rawCacheValue);
          cacheValue = await keys.forEach(key =>
            JSON.parse(rawCacheValue[key]),
          );
        }
        if (cacheValue && cacheValue !== null) {
          ctx.result = cacheValue;
          // ctx.res.setHeader("Cache-Hit", true);
          // const data = await ttlAsync(cacheKey);
          // console.log("[CACHE] beforeRemote:res1", data);
          // if (data) {
          //   ctx.res.setHeader("Cache-TTL", data);
          //   const expires = new Date();
          //   expires.setSeconds(expires.getSeconds() + Number(data));
          //   ctx.res.setHeader("Expires", expires);
          // }
          return ctx;
          // return ctx.done((error) => {
          //   if (error) return error;
          //   return;
          // });
        }
        console.log('[CACHE] beforeRemote get:found cache', cacheValue);

        ctx.res.setHeader('Cache-Hit', false);
        ctx.res.setHeader('Cache-TTL', cacheExpire);
        const expires = new Date();
        expires.setSeconds(expires.getSeconds() + Number(cacheExpire));
        ctx.res.setHeader('Expires', expires);
        return ctx;
      }
      return ctx;
    } catch (error) {
      console.log('[CACHE] beforeRemote get:err', error);
      return error;
    }
  });

  Model.afterRemote('**', async (ctx, res) => {
    try {
      // get all find methods and search first in cache - if not exist save in cache
      if (
        (ctx.method.name.indexOf('find') !== -1 ||
          ctx.method.name.indexOf('__get') !== -1 ||
          ctx.method.name.indexOf('get') !== -1) &&
        redisClient.connected
      ) {
        //  console.log("[CACHE] afterRemote get:req", res);
        console.log(
          '[CACHE] afterRemote get:req',
          ctx.req.query,
          ctx.req.params,
        );
        let modelName;
        if (ctx.method.name.startsWith('__get')) {
          const methodParts = ctx.method.name.split('__');
          modelName = methodParts[2];
        } else {
          modelName = `${ctx.method.sharedClass.name}`;
        }
        const cacheExpire = ctx.req.query.cache || '120';
        let id = null;
        let cacheValue = null;
        if (ctx.req.params && ctx.req.params.id) {
          id = ctx.req.params.id;
        } else if (ctx.req.query.filter) {
          const whereFilter = JSON.parse(ctx.req.query.filter);
          if (whereFilter && whereFilter.id) id = whereFilter.where.id;
        } else if (res && res.id) {
          id = res.id;
        }
        console.log('[CACHE] afterRemote get:id', id);

        if (id && id !== null) {
          cacheValue = await redisClient.hgetAsync(modelName, id);
          if (!cacheValue || cacheValue === null) {
            cacheValue = JSON.stringify(res);
            await redisClient.hsetAsync(modelName, id, cacheValue);
            await redisClient.expireAsync(modelName, Number(cacheExpire));
          }
          ctx.result = cacheValue;
          return ctx;
        }
        // const cacheKey = `${modelName}-${new Buffer(
        //   `${JSON.stringify(ctx.req.params)}${JSON.stringify(ctx.req.query)}`,
        // ).toString('base64')}`;
        cacheValue = await redisClient.hgetallAsync(modelName);
        console.log('[CACHE] afterRemote get:cacheValue', cacheValue);
        if (!cacheValue || cacheValue === null) {
          if (
            typeof res === 'object' &&
            res instanceof Array &&
            res.length > 1
          ) {
            cacheValue = {};
            await res.forEach(instance => {
              cacheValue[instance.id] = JSON.stringify(instance);
              // await redisClient.hsetAsync(modelName, instance.id, JSON.stringify(instance));
              return cacheValue;
            });
            await redisClient.hmsetAsync(modelName, cacheValue);
            await redisClient.expireAsync(modelName, Number(cacheExpire));
          } else {
            console.log('[CACHE] afterRemote create cache', typeof res);
            cacheValue = JSON.stringify(res);
            // const keys = Object.keys(res);
            // await keys.forEach(key => {
            //   cacheValue[key] = JSON.stringify(res[key]);
            //   return cacheValue;
            // });
            // await redisClient.hmsetAsync(modelName, cacheValue);
            // await redisClient.expireAsync(modelName, Number(cacheExpire));
            // await redisClient.hsetAsync(modelName, res.id, cacheValue);
            // await redisClient.expireAsync(modelName, Number(cacheExpire));
          }
          console.log('[CACHE] afterRemote created cache', cacheValue);
        }

        // const keys = Object.keys(cacheValue);
        // result = await keys.map(key => {
        //   return JSON.parse(cacheValue[key]);;
        // });
        //  ctx.result = result;
        return ctx;
      }
      return ctx;
    } catch (error) {
      console.log('[CACHE] afterRemote get:err', error);
      return error;
    }
  });

  Model.observe('after save', async ctx => {
    try {
      if (redisClient.connected) {
        const cacheExpire = 120;
        if (ctx.instance) {
          console.log('Saved %s#%s', ctx.Model.modelName, ctx.instance.id);
          //  console.log("[CACHE] afterSave:req", ctx);
          const modelName = `${ctx.Model.modelName}`;
          //  const cacheKey = `${modelName}-*`;
          await redisClient.hsetAsync(
            modelName,
            ctx.instance.id,
            JSON.stringify(ctx.instance),
          );
          await redisClient.expireAsync(modelName, cacheExpire);
        } else {
          console.log(
            'Updated %s matching %j',
            ctx.Model.pluralModelName,
            ctx.where,
          );
          //  await redisClient.hmsetAsync(ctx.Model.pluralModelName, cacheValue);
          //  await redisClient.expireAsync(modelName, cacheExpire);
        }
        return ctx;
      }
      return ctx;
    } catch (error) {
      console.log('[CACHE] afterSave:err', error);
      return error;
    }
  });

  Model.observe('after delete', async ctx => {
    try {
      if (redisClient.connected && ctx.where) {
        console.log(
          'Deleted %s matching %j',
          ctx.Model.pluralModelName,
          ctx.where,
        );
        const modelName = `${ctx.Model.definition.name}`;
        //  const cacheKey = `${modelName}-*`;
        let cacheValue;
        if (ctx.where.id) {
          // cacheKey = `${model}-${Buffer.from(
          //   `${JSON.stringify({id})}`,
          //   'utf-8',
          // ).toString('base64')}`;
          cacheValue = await redisClient.hgetAsync(modelName, ctx.where);
          if (cacheValue && cacheValue !== null) {
            await redisClient.hdelAsync(modelName, ctx.where);
          }
        } else {
          cacheValue = await redisClient.hgetAllAsync(modelName);
          if (cacheValue && cacheValue !== null) {
            const keys = await redisClient.hkeysAsync(modelName);
            await redisClient.hdelAsync(modelName, keys);
          }
        }
        return ctx;
      }
      return ctx;
    } catch (error) {
      console.log('[CACHE] afterDelete:err', error);
      return error;
    }
  });
};
