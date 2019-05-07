import localtunnel from 'localtunnel';
import logger from './logger';

const tunnel = {};

tunnel.stop = app => {
  app.set('url', app.get('originUrl'));
  return app.tunnel.close();
};

tunnel.init = async (app, conf) => {
  try {
    const options = { host: conf.TUNNEL_URL, subdomain: `${conf.NODE_NAME}-${conf.NODE_ENV}` };
    if (app.tunnel && app.tunnel.url) {
      return app.tunnel;
      //  app.tunnel.close();
    }

    // localtunnel(conf.port, options, (err, res) => {
    //   if (err) throw err;
    //   app.tunnel = res;
    //   logger.publish(2, 'tunnel', 'open', app.tunnel);
    //   app.set('url', app.tunnel.url);

    //   return tunnel;
    // });

    localtunnel(conf.PORT, options, (err, res) => {
      if (err) throw err;
      app.tunnel = res;
      logger.publish(2, 'tunnel', 'open', res.url);
      if (res.url) {
        if (res.url.search(options.subdomain) === -1) {
          //  console.log('tunnel', 'wrong url', res.url);
          return app.tunnel.close();
        }
        app.set('url', res.url);
      }
      return app.tunnel;
    });

    // localtunnel events
    //  app.tunnel.on('error', async err => {
    //  console.log('nodered', 'tunnel:err', err);
    ///  return app.tunnel.close();
    //  });

    app.tunnel.on('close', () => {
      logger.publish(2, 'tunnel', 'close', app.tunnel.url);
      // setTimeout restart tunnel
    });
    return app.tunnel;
  } catch (error) {
    return error;
  }
};

export default tunnel;
