import dotenv from 'dotenv';
import nodeCleanup from 'node-cleanup';
import app from './services/server';
import logger from './services/logger';

/**
 * Initialize application and services
 * @param {string} [processId] - process id
 * @fires module:Server.start
 */
const boot = async processId => {
  try {
    const result = dotenv.config();
    if (result.error) {
      throw result.error;
    }
    const config = {
      ...result.parsed,
      processId,
      appRootDir: __dirname,
      // File Extensions for jest (strongloop/loopback#3204)
      scriptExtensions: ['.js', '.json', '.node', '.ejs'],
    };
    logger.publish(2, 'loopback', 'boot:res', processId);
    return app.emit('start', config);
  } catch (error) {
    logger.publish(1, 'loopback', 'boot:error', error);
    throw error;
  }
};

/**
 * Watch for interrupt signal
 * @fires module:Server.stop
 */
nodeCleanup((exitCode, signal) => {
  try {
    if (signal && signal !== null) {
      logger.publish(1, 'process', 'exit:req', { exitCode, signal, pid: process.pid });
      app.emit('stop', signal);
      setTimeout(() => process.kill(process.pid, signal), 3000);
      nodeCleanup.uninstall();
      return false;
    }
    return true;
  } catch (error) {
    logger.publish(1, 'process', 'exit:err', error);
    //  setTimeout(() => process.exit(1), 3000);
    process.kill(process.pid, signal);
    throw error;
  }
});

if (!process.env.CLUSTER_MODE || process.env.CLUSTER_MODE === 'false') {
  logger.publish(1, 'process', 'init:single', { pid: process.pid });
  boot(0);
} else {
  logger.publish(1, 'process', 'init:cluster', { pid: process.pid });

  process.on('message', packet => {
    console.log('PROCESS PACKET ', packet);
    if (typeof packet.id === 'number' && packet.data.ready) {
      boot(packet.id);
      process.send({
        type: 'process:msg',
        data: {
          isStarted: true,
        },
      });
    }
  });

  process.send({
    type: 'process:msg',
    data: {
      isStarted: false,
    },
  });
}

export default app;
