const authService = require('../services/auth.service');
const { asyncHandler } = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.validatedBody);
  res.status(201).json({
    success: true,
    data: { user, token },
    message: 'Registration successful',
  });
});

const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.validatedBody);
  res.json({
    success: true,
    data: { user, token },
    message: 'Login successful',
  });
});

module.exports = {
  register,
  login,
};
