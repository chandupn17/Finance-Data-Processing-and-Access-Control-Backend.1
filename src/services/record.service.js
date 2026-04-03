const { PrismaClient } = require('@prisma/client');
const { ApiError } = require('../utils/ApiError');

const prisma = new PrismaClient();

/**
 * Soft delete preserves audit trail — hard delete is irreversible for compliance and support.
 * Every read path must filter deletedAt: null so inactive rows never surface in dashboards or lists.
 */
function baseWhere() {
  return { deletedAt: null };
}

function scopeForUser(authUser) {
  if (authUser.role === 'ADMIN') {
    return {};
  }
  return { userId: authUser.id };
}

async function listRecords(authUser, filters) {
  const { type, category, from, to, page, limit } = filters;

  const where = {
    ...baseWhere(),
    ...scopeForUser(authUser),
    ...(type ? { type } : {}),
    ...(category ? { category: { contains: category } } : {}),
    ...((from || to) && {
      date: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    }),
  };

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.financialRecord.findMany({
      where,
      orderBy: { date: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        amount: true,
        type: true,
        category: true,
        date: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
    }),
    prisma.financialRecord.count({ where }),
  ]);

  return { items, pagination: { page, limit, total } };
}

async function getRecordById(authUser, id) {
  const where = {
    id,
    ...baseWhere(),
    ...scopeForUser(authUser),
  };

  const record = await prisma.financialRecord.findFirst({ where });
  if (!record) {
    throw new ApiError(404, 'Record not found', 'NOT_FOUND');
  }
  return record;
}

async function createRecord(authUser, data) {
  let targetUserId = authUser.id;
  if (data.userId) {
    if (authUser.role !== 'ADMIN') {
      throw new ApiError(403, 'Only admins may assign records to other users', 'FORBIDDEN');
    }
    const target = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!target) {
      throw new ApiError(400, 'Target user does not exist', 'BAD_REQUEST');
    }
    targetUserId = data.userId;
  }

  const { userId: _omit, ...rest } = data;
  return prisma.financialRecord.create({
    data: {
      ...rest,
      userId: targetUserId,
    },
  });
}

async function updateRecord(authUser, id, data) {
  const existing = await prisma.financialRecord.findFirst({
    where: { id, ...baseWhere() },
  });
  if (!existing) {
    throw new ApiError(404, 'Record not found', 'NOT_FOUND');
  }

  return prisma.financialRecord.update({
    where: { id },
    data,
  });
}

async function softDeleteRecord(authUser, id) {
  const existing = await prisma.financialRecord.findFirst({
    where: { id, ...baseWhere() },
  });
  if (!existing) {
    throw new ApiError(404, 'Record not found', 'NOT_FOUND');
  }

  await prisma.financialRecord.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

module.exports = {
  listRecords,
  getRecordById,
  createRecord,
  updateRecord,
  softDeleteRecord,
};
