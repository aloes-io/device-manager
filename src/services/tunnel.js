import dotenv from 'dotenv';
import localtunnel from 'localtunnel';
import nodeCleanup from 'node-cleanup';

const tunnel = {};

const createTunnel = async options =>
  new Promise((resolve, reject) => {
    localtunnel(options.port, options, (err, res) => (err ? reject(err) : resolve(res)));
  });

const initTunnel = async () => {
  try {
    const result = dotenv.config();
    if (result.error) {
      throw result.error;
    }
    if (result.parsed.TUNNEL_HOST) {
      const host = result.parsed.TUNNEL_SECURE
        ? `https://${result.parsed.TUNNEL_HOST}`
        : `http://${result.parsed.TUNNEL_HOST}`;
      const options = {
        port: Number(result.parsed.HTTP_SERVER_PORT),
        host,
        subdomain: `${result.parsed.NODE_NAME}-${result.parsed.NODE_ENV}`,
      };
      console.log('Start tunnel', options);

      tunnel.instance = await createTunnel(options);
      console.log('Tunnel started', tunnel.instance.url);

      tunnel.instance.on('close', () => {
        console.log('Tunnel closed', tunnel.instance.url);
      });

      tunnel.instance.on('error', err => {
        console.log('Tunnel err', err);
      });

      return tunnel;
    }
    return null;
  } catch (error) {
    return error;
  }
};

setTimeout(() => initTunnel(), 2500);

nodeCleanup((exitCode, signal) => {
  try {
    if (signal && signal !== null) {
      if (tunnel && tunnel.instance) {
        console.log('Stop tunnel');
        tunnel.instance.stop();
      }
      setTimeout(() => process.kill(process.pid, signal), 2500);
      nodeCleanup.uninstall();
      return false;
    }
    return true;
  } catch (error) {
    setTimeout(() => process.kill(process.pid, signal), 2500);
    return error;
  }
});

export default tunnel;
