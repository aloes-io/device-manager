module.exports = function(options) {
  return function logError(err, req, res, next) {
    //  const socket = app.io;
    if (options.enabled) {
      //  socket.emit('logs', 'test');
      console.log("[ERROR]", err);
      next(err);
    }
    next();
  };
};
