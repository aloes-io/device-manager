module.exports = function(options) {
  return function tracker(req, res, next) {
    if (options.enabled) {
      console.log(
        "[TRACKER] Request tracking middleware triggered on %s",
        req.url,
      );
      // filter out url containing explorer, let in those containing a known model name
      const start = process.hrtime();
      res.once("finish", () => {
        const diff = process.hrtime(start);
        const ms = diff[0] * 1e3 + diff[1] * 1e-6;
        console.log("[TRACKER] The request processing time is %d ms.", ms);
        return true;
      });
      next();
    } else {
      next();
    }
  };
};
