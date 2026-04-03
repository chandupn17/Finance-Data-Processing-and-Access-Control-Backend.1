const { PrismaClient } = require('@prisma/client');
const { ApiError } = require('../utils/ApiError');

const prisma = new PrismaClient();

function userPublicSelect() {
  return {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    createdAt: true,
  };
}

async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: userPublicSelect(),
  });
}

async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userPublicSelect(),
  });
  if (!user) {
    throw new ApiError(404, 'User not found', 'NOT_FOUND');
  }
  return user;
}

async function updateUserRole(id, role) {
  await getUserById(id);
  return prisma.user.update({
    where: { id },
    data: { role },
    select: userPublicSelect(),
  });
}

async function updateUserStatus(id, isActive) {
  await getUserById(id);
  return prisma.user.update({
    where: { id },
    data: { isActive },
    select: userPublicSelect(),
  });
}

module.exports = {
  listUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
};
