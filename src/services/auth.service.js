const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { ApiError } = require('../utils/ApiError');

const prisma = new PrismaClient();

function signToken(user) {
  // Role embedded in JWT payload to avoid extra DB lookup per request (validate in middleware if needed).
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

async function register({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, 'Email already registered', 'CONFLICT');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      role: 'VIEWER',
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const token = signToken(user);
  return { user, token };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(401, 'Invalid credentials', 'UNAUTHORIZED');
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    throw new ApiError(401, 'Invalid credentials', 'UNAUTHORIZED');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is inactive', 'FORBIDDEN');
  }

  const publicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
  const token = signToken(publicUser);
  return { user: publicUser, token };
}

module.exports = {
  register,
  login,
};
