import dotenv from 'dotenv';
import nodeCleanup from 'node-cleanup';
import app from './services/server';
import logger from './services/logger';

app.on('started', () => {
  const baseUrl = app.get('url').replace(/\/$/, '');
  logger.publish(4, 'loopback', 'Setup', `Browse ${process.env.NODE_NAME} API @: ${baseUrl}`);
  if (app.get('loopback-component-explorer')) {
    const explorerPath = app.get('loopback-component-explorer').mountPath;
    logger.publish(4, 'loopback', 'Setup', `Explore REST API @: ${baseUrl}${explorerPath}`);
  }
  //  process.send('ready');
});

app.on('stopped', async signal => {
  try {
    await app.stop(signal);
    logger.publish(4, 'loopback', 'stop', signal);
    return true;
  } catch (error) {
    return error;
  }
});

const boot = async () => {
  try {
    const result = dotenv.config();
    if (result.error) {
      throw result.error;
    }
    const config = {
      ...result.parsed,
      appRootDir: __dirname,
      // File Extensions for jest (strongloop/loopback#3204)
      scriptExtensions: ['.js', '.json', '.node', '.ejs'],
    };
    const state = await app.init(config);
    logger.publish(4, 'loopback', 'boot:res', state);
    return state;
  } catch (error) {
    logger.publish(4, 'loopback', 'boot:error', error);
    return error;
  }
};

boot();

/**
 * Watch for interrupt signal
 * @fires module:app.stopped
 */
nodeCleanup((exitCode, signal) => {
  try {
    if (signal && signal !== null) {
      logger.publish(4, 'process', 'exit:req', { exitCode, signal, pid: process.pid });
      app.emit('stopped', signal);
      setTimeout(() => process.kill(process.pid, signal), 3000);
      nodeCleanup.uninstall();
      return false;
    }
    return true;
  } catch (error) {
    logger.publish(4, 'process', 'exit:err', error);
    //  setTimeout(() => process.exit(1), 3000);
    setTimeout(() => process.kill(process.pid, signal), 3000);
    return error;
  }
});

export default app;
