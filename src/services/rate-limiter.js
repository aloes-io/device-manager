/* Copyright 2020 Edouard Maleix, read LICENSE */

/* eslint-disable global-require */
/* eslint-disable import/no-mutable-exports */
import Redis from 'ioredis';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import logger from '../services/logger';
import envVariablesKeys from '../initial-data/variables-keys.json';

require('dotenv').config();

// todo use loopback datasource files
/**
 * @module rateLimiter
 */
let redisClient;
const moduleName = 'rateLimiter';
const maxWrongAttemptsByIPperDay = 100;
const maxConsecutiveFailsByUsernameAndIP = 15;

const config = {};
envVariablesKeys.forEach(key => {
  // eslint-disable-next-line security/detect-object-injection
  config[key] = process.env[key];
});

if (config.NODE_ENV !== 'development' && config.NODE_ENV !== 'test') {
  redisClient = new Redis({
    host: config.REDIS_HOST,
    port: Number(config.REDIS_PORT),
    db: config.REDIS_RATE_LIMITER,
    password: config.REDIS_PASS,
    // lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy(times) {
      // if (times > 3) {
      //   // This error will be caught by limiter and then insurance limiter is used in this case
      //   return new Error('Retry time exhausted');
      // }
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redisClient.on('error', err => {
    console.log('REDIS LIMITER ERR', err);
  });
}

const rateLimiter = {
  limits: [
    { ipLimiter: maxWrongAttemptsByIPperDay },
    { userIpLimiter: maxConsecutiveFailsByUsernameAndIP },
  ],
};

const getUsernameIPkey = (username, ip) => `${username}_${ip}`;

const ipLimiter = () => {
  if (config.NODE_ENV !== 'development' && config.NODE_ENV !== 'test') {
    // const insuranceLimiter = new RateLimiterMemory({
    //   points: 60, // maxWrongAttemptsByIPperDay / (config.HTTP_INSTANCES_COUNT + config.MQTT_INSTANCES_COUNT)
    //   duration: 60,
    // });
    return new RateLimiterRedis({
      redis: redisClient,
      keyPrefix: 'login_fail_ip_per_day',
      points: maxWrongAttemptsByIPperDay,
      duration: 60 * 60 * 24,
      blockDuration: 60 * 60 * 24, // Block for 1 day, if 100 wrong attempts per day
      // inmemoryBlockOnConsumed: 301, // If IP consume >= 301 points per minute
      // inmemoryBlockDuration: 60, // Block it for a minute in memory, so no requests go to Redis
      // insuranceLimiter,
    });
  }
  return new RateLimiterMemory({
    keyPrefix: 'login_fail_ip_per_day',
    points: maxWrongAttemptsByIPperDay,
    duration: 60 * 60 * 24,
    blockDuration: 60 * 60 * 24, // Block for 1 day, if 100 wrong attempts per day
  });
};

rateLimiter.ipLimiter = ipLimiter();

const userIpLimiter = () => {
  if (config.NODE_ENV !== 'development' && config.NODE_ENV !== 'test') {
    return new RateLimiterRedis({
      redis: redisClient,
      keyPrefix: 'login_fail_consecutive_username_and_ip',
      points: maxConsecutiveFailsByUsernameAndIP,
      // duration: 60 * 60 * 24 * 90, // Store number for 90 days since first fail
      // blockDuration: 60 * 60 * 24 * 365 * 20, // Block for infinity after consecutive fails
      duration: 60 * 60 * 24,
      blockDuration: 60 * 60 * 24, // Block for 1 day, if maxConsecutiveFailsByUsernameAndIP wrong attempts per day
    });
  }
  return new RateLimiterMemory({
    keyPrefix: 'login_fail_consecutive_username_and_ip',
    points: maxConsecutiveFailsByUsernameAndIP,
    duration: 60 * 60 * 24,
    blockDuration: 60 * 60 * 24,
  });
};

rateLimiter.userIpLimiter = userIpLimiter();

/**
 * Check if Rate limits exist by Ip and/or username
 *
 * optionnally use a clientId to limit reconnections
 *
 * @method module:rateLimiter.getAuthLimiter
 * @param {string} ip
 * @param {string} username
 * @param {string} [clientId]
 * @returns {Promise<object>} retrySecs, userIpLimit, ipLimit, usernameIPkey
 */
rateLimiter.getAuthLimiter = async (ip, username) => {
  let usernameIPkey = null;
  let limiter = null;
  let limiterType = null;
  try {
    // if (!rateLimiter.ipLimiter || !rateLimiter.userIpLimiter) {
    //   throw new Error('Rate limiter not ready');
    // }
    if (!username || !ip) {
      throw new Error('MISSING_IP_OR_USERNAME');
    }
    usernameIPkey = getUsernameIPkey(username, ip);
    const [resUsernameAndIP, resSlowByIP] = await Promise.all([
      rateLimiter.userIpLimiter.get(usernameIPkey),
      rateLimiter.ipLimiter.get(ip),
    ]);
    logger.publish(4, `${moduleName}`, 'authLimiter:req', {
      ip,
      username,
    });
    let retrySecs = 0;
    // Check if IP or Username + IP is already blocked
    if (resSlowByIP !== null && resSlowByIP.consumedPoints > maxWrongAttemptsByIPperDay) {
      limiter = resSlowByIP;
      limiterType = 'ipLimiter';
      retrySecs = Math.round(resSlowByIP.msBeforeNext / 1000) || 1;
    } else if (
      resUsernameAndIP !== null &&
      resUsernameAndIP.consumedPoints > maxConsecutiveFailsByUsernameAndIP
    ) {
      limiter = resUsernameAndIP;
      limiterType = 'userIpLimiter';
      retrySecs = Math.round(resUsernameAndIP.msBeforeNext / 1000) || 1;
    }
    logger.publish(4, `${moduleName}`, 'authLimiter:res', {
      ip,
      limiter,
      limiterType,
      retrySecs,
    });
    return { retrySecs, limiter, limiterType, usernameIPkey };
  } catch (error) {
    logger.publish(2, `${moduleName}`, 'authLimiter:err', error);
    return { retrySecs: 2, limiter, limiterType, usernameIPkey };
  }
};

/**
 * Consume 1 point from limiters on wrong attempt and block if limits are reached
 *
 * Count failed attempts by Username + IP only for registered users
 *
 * @method module:rateLimiter.setAuthLimiter
 * @param {string} ip
 * @param {string} username
 * @returns {Promise<object>}
 */
rateLimiter.setAuthLimiter = async (ip, username) => {
  const promises = [rateLimiter.ipLimiter.consume(ip)];
  if (username) {
    const usernameIPkey = getUsernameIPkey(username, ip);
    promises.push(rateLimiter.userIpLimiter.consume(usernameIPkey));
  }
  return Promise.all(promises);
};

/**
 * Reset exisiting limiters for user/ip on successful authorisation
 *
 * @method module:rateLimiter.cleanAuthLimiter
 * @param {string} ip
 * @param {string} username
 * @returns {Promise<boolean>}
 */
rateLimiter.cleanAuthLimiter = async (ip, username) => {
  // clean IPLimiter too ?
  if (username) {
    // if (limiterType === 'userIpLimit' && limiter.consumedPoints > 0) {
    const usernameIPkey = getUsernameIPkey(username, ip);
    await rateLimiter.userIpLimiter.delete(usernameIPkey);
    // }
  }
  return true;
};

export default rateLimiter;
