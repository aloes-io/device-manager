import localtunnel from 'localtunnel';
import logger from './logger';

/**
 * @module Tunnel
 */
const tunnel = {};

/**
 * Setup tunnel to forward http to https tunnel server
 * @method module:Tunnel.start
 * @param {object} app - Loopback app
 * @returns {object} app.tunnel
 */
tunnel.start = async app => {
  try {
    logger.publish(2, 'tunnel', 'Start', app.tunnel.url);

    // localtunnel events
    //  app.tunnel.on('error', async err => {
    //  console.log('nodered', 'tunnel:err', err);
    ///  return app.tunnel.close();
    //  });

    app.tunnel.on('close', () => {
      logger.publish(2, 'tunnel', 'closed', app.tunnel.url);
      // setTimeout restart tunnel
    });

    return app.tunnel;
  } catch (error) {
    logger.publish(2, 'tunnel', 'Start:err', error);
    return error;
  }
};

/**
 * Stop tunnel functions
 * @method module:Tunnel.stop
 * @param {object} app - Loopback app
 * @returns {boolean}
 */
tunnel.stop = async app => {
  try {
    logger.publish(2, 'tunnel', 'stop', `${process.env.TUNNEL_URL}`);
    //  app.set('url', app.get('originUrl'));
    app.tunnel.close();
    return true;
  } catch (error) {
    logger.publish(2, 'tunnel', 'stop:err', error);
    return error;
  }
};

/**
 * Init Tunnel client with localtunnel
 * @method module:Tunnel.init
 * @param {object} app - Loopback app
 * @param {object} conf - Env varirables
 * @returns {function} tunnel.start
 * @throws {error} tunnel error
 */
tunnel.init = async (app, conf) => {
  try {
    const options = { host: conf.TUNNEL_URL, subdomain: `${conf.NODE_NAME}-${conf.NODE_ENV}` };
    logger.publish(2, 'tunnel', 'init', options);
    if (app.tunnel && app.tunnel.url) {
      return app.tunnel;
      //  app.tunnel.close();
    }

    return localtunnel(conf.PORT, options, (err, res) => {
      if (err) throw err;
      app.tunnel = res;
      //  logger.publish(2, 'tunnel', 'open', res.url);
      // if (res.url) {
      //   if (res.url.search(options.subdomain) === -1) {
      //     //  console.log('tunnel', 'wrong url', res.url);
      //     return app.tunnel.close();
      //   }
      //   app.set('url', res.url);
      // }
      return tunnel.start(app);
    });
  } catch (error) {
    logger.publish(2, 'tunnel', 'init:err', error);
    return error;
  }
};

export default tunnel;
