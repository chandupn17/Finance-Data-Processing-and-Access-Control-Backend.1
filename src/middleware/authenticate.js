const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { ApiError } = require('../utils/ApiError');

const prisma = new PrismaClient();

/**
 * Verifies JWT and attaches req.user.
 * Role embedded in JWT payload to avoid extra DB lookup per request (see auth.service).
 * We still verify the user exists and is active to honor account suspension without revoking tokens.
 */
async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication required', 'UNAUTHORIZED'));
  }

  const token = header.slice('Bearer '.length).trim();
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(new ApiError(401, 'Invalid or expired token', 'UNAUTHORIZED'));
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  if (!user) {
    return next(new ApiError(401, 'User not found', 'UNAUTHORIZED'));
  }
  if (!user.isActive) {
    return next(new ApiError(403, 'Account is inactive', 'FORBIDDEN'));
  }

  req.user = user;
  next();
}

module.exports = { authenticate };
