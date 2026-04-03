const { ApiError } = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  } else if (err.statusCode >= 400 && err.statusCode < 600) {
    statusCode = err.statusCode;
    message = err.message || 'Request failed';
    code = err.code || 'ERROR';
  }

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
  });
}

module.exports = { errorHandler };
