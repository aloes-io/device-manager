import logger from '../services/logger';
import utils from '../services/utils';

export default function autoUpdate(app) {
  // if (process.env.CLUSTER_MODE) {
  //   if (process.env.PROCESS_ID !== '0') return null;
  //   if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
  // }
  if (utils.isMasterProcess(process.env)) {
    const db = app.datasources.db;
    db.autoupdate(error => {
      logger.publish(2, 'loopback', 'boot:autoUpdate:res', error);
    });
  }
}
