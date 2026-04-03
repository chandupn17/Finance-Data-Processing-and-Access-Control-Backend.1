const userService = require('../services/user.service');
const { asyncHandler } = require('../utils/asyncHandler');

const listUsers = asyncHandler(async (req, res) => {
  const users = await userService.listUsers();
  res.json({
    success: true,
    data: users,
    message: 'Users retrieved',
  });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.json({
    success: true,
    data: user,
    message: 'User retrieved',
  });
});

const patchRole = asyncHandler(async (req, res) => {
  const user = await userService.updateUserRole(req.params.id, req.validatedBody.role);
  res.json({
    success: true,
    data: user,
    message: 'User role updated',
  });
});

const patchStatus = asyncHandler(async (req, res) => {
  const user = await userService.updateUserStatus(req.params.id, req.validatedBody.isActive);
  res.json({
    success: true,
    data: user,
    message: 'User status updated',
  });
});

module.exports = {
  listUsers,
  getUser,
  patchRole,
  patchStatus,
};
