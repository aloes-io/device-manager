import logger from '../services/logger';

export default async function autoUpdate(app) {
  try {
    const db = app.datasources.db;
    await db.autoupdate();
    logger.publish(2, 'loopback', 'boot:autoUpdate:res', 'success');
    return true;
  } catch (error) {
    logger.publish(2, 'loopback', 'boot:autoUpdate:err', error);
    throw error;
  }
}
