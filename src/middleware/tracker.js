import logger from '../services/logger';

module.exports = function (options) {
  return function tracker(req, res, next) {
    if (options.enabled) {
      logger.publish(4, 'tracker', 'Request tracking middleware triggered on', req.url);
      // filter out url containing explorer, let in those containing a known model name
      const start = process.hrtime();
      res.once('finish', () => {
        const diff = process.hrtime(start);
        const ms = diff[0] * 1e3 + diff[1] * 1e-6;
        logger.publish(4, 'tracker', 'Response', `processing time is ${ms} ms`);
      });
      next();
    } else {
      next();
    }
  };
};
