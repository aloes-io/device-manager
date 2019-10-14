import logger from '../services/logger';

export default async function autoUpdate(app) {
  try {
    if (process.env.CLUSTER_MODE) {
      if (process.env.PROCESS_ID !== '0') return null;
      if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
    }
    const db = app.datasources.db;
    await db.autoupdate();
    logger.publish(2, 'loopback', 'boot:autoUpdate:res', 'success');
    return true;
  } catch (error) {
    logger.publish(2, 'loopback', 'boot:autoUpdate:err', error);
    throw error;
  }
}
