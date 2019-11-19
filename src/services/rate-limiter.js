/* Copyright 2019 Edouard Maleix, read LICENSE */

/* eslint-disable global-require */
/* eslint-disable import/no-mutable-exports */
import logger from '../services/logger';

/**
 * @module rateLimiter
 */
const moduleName = 'rateLimiter';
const maxWrongAttemptsByIPperDay = 100;
const maxConsecutiveFailsByUsernameAndIP = 10;
let limiterSlowBruteByIP, limiterConsecutiveFailsByUsernameAndIP;

if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
  const Redis = require('ioredis');
  const { RateLimiterRedis } = require('rate-limiter-flexible');

  const redisClient = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    db: process.env.REDIS_RATE_LIMITER,
    password: process.env.REDIS_PASS,
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

  limiterSlowBruteByIP = new RateLimiterRedis({
    redis: redisClient,
    keyPrefix: 'login_fail_ip_per_day',
    points: maxWrongAttemptsByIPperDay,
    duration: 60 * 60 * 24,
    blockDuration: 60 * 60 * 24, // Block for 1 day, if 100 wrong attempts per day
    // inmemoryBlockOnConsumed: 301, // If IP consume >= 301 points per minute
    // inmemoryBlockDuration: 60, // Block it for a minute in memory, so no requests go to Redis
    // insuranceLimiter: rateLimiterMemory,
  });

  limiterConsecutiveFailsByUsernameAndIP = new RateLimiterRedis({
    redis: redisClient,
    keyPrefix: 'login_fail_consecutive_username_and_ip',
    points: maxConsecutiveFailsByUsernameAndIP,
    duration: 60 * 60 * 24 * 90, // Store number for 90 days since first fail
    blockDuration: 60 * 60 * 24 * 365 * 20, // Block for infinity after consecutive fails
  });
} else {
  const { RateLimiterMemory } = require('rate-limiter-flexible');

  limiterSlowBruteByIP = new RateLimiterMemory({
    keyPrefix: 'login_fail_ip_per_day',
    points: maxWrongAttemptsByIPperDay,
    duration: 60 * 60 * 24,
    blockDuration: 60 * 60 * 24, // Block for 1 day, if 100 wrong attempts per day
  });

  limiterConsecutiveFailsByUsernameAndIP = new RateLimiterMemory({
    keyPrefix: 'login_fail_consecutive_username_and_ip',
    points: maxConsecutiveFailsByUsernameAndIP,
    duration: 60 * 60 * 24 * 90, // Store number for 90 days since first fail
    blockDuration: 60 * 60 * 24 * 365 * 20, // Block for infinity after consecutive fails
  });
}

const getUsernameIPkey = (username, ip) => `${username}_${ip}`;

/**
 * Rate limit user access by Ip and/or username
 *
 * optionnally use a clientId to limit reconnections
 *
 * @method module:rateLimiter~authLimiter
 * @param {string} username
 * @param {string} ip
 * @param {string} [clientId]
 * @returns {object} retrySecs, userIpLimit, ipLimit, usernameIPkey
 */
const authLimiter = async (username, ip) => {
  let usernameIPkey = null;
  try {
    if (!username || !ip) throw new Error('INVALID_INPUTS');
    usernameIPkey = getUsernameIPkey(username, ip);
    const [resUsernameAndIP, resSlowByIP] = await Promise.all([
      limiterConsecutiveFailsByUsernameAndIP.get(usernameIPkey),
      limiterSlowBruteByIP.get(ip),
    ]);
    logger.publish(3, `${moduleName}`, 'authLimiter:req', {
      ip,
      username,
    });
    let retrySecs = 0;
    // Check if IP or Username + IP is already blocked
    if (resSlowByIP !== null && resSlowByIP.consumedPoints > maxWrongAttemptsByIPperDay) {
      logger.publish(3, `${moduleName}`, 'authLimiter:res', {
        ip,
        ipLimiter: resSlowByIP.consumedPoints,
      });
      retrySecs = Math.round(resSlowByIP.msBeforeNext / 1000) || 1;
    } else if (
      resUsernameAndIP !== null &&
      resUsernameAndIP.consumedPoints > maxConsecutiveFailsByUsernameAndIP
    ) {
      logger.publish(3, `${moduleName}`, 'authLimiter:res', {
        ip: resUsernameAndIP,
        userIpLimiter: resUsernameAndIP.consumedPoints,
      });
      retrySecs = Math.round(resUsernameAndIP.msBeforeNext / 1000) || 1;
    }
    return { retrySecs, userIpLimit: resUsernameAndIP, ipLimit: resSlowByIP, usernameIPkey };
  } catch (error) {
    logger.publish(2, `${moduleName}`, 'authLimiter:err', error);
    return { retrySecs: 5, userIpLimit: null, ipLimit: null, usernameIPkey };
  }
};

export {
  authLimiter,
  getUsernameIPkey,
  limiterSlowBruteByIP as ipLimiter,
  limiterConsecutiveFailsByUsernameAndIP as userIpLimiter,
};
