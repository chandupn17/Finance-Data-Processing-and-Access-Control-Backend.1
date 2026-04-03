const { ApiError } = require('../utils/ApiError');

const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'Forbidden: insufficient permissions', 'FORBIDDEN');
    }
    next();
  };

module.exports = { requireRole };
