class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status
   * @param {string} message - Human-readable message
   * @param {string} [code='ERROR'] - Stable machine-readable code for clients
   */
  constructor(statusCode, message, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { ApiError };
