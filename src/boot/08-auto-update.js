import logger from '../services/logger';
import utils from '../lib/utils';

export default function autoUpdate(app) {
  if (utils.isMasterProcess(process.env)) {
    const db = app.datasources.db;
    db.autoupdate((error) => {
      logger.publish(2, 'loopback', 'boot:autoUpdate:res', error);
    });
  }
}
