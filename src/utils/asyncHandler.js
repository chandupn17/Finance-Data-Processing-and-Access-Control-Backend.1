/**
 * Wraps async Express handlers so rejections are forwarded to error middleware.
 */
function asyncHandler(fn) {
  return function asyncHandlerWrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
