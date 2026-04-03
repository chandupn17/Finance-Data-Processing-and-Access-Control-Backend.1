const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function baseWhere() {
  return { deletedAt: null };
}

function scopeForRole(authUser) {
  if (authUser.role === 'ADMIN') {
    return {};
  }
  return { userId: authUser.id };
}

async function summary(authUser) {
  const where = { ...baseWhere(), ...scopeForRole(authUser) };

  // Aggregating at DB layer to avoid loading full record set into memory (O(1) work vs O(n) in JS).
  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.financialRecord.aggregate({
      where: { ...where, type: 'INCOME' },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.financialRecord.aggregate({
      where: { ...where, type: 'EXPENSE' },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const totalIncome = incomeAgg._sum.amount ?? 0;
  const totalExpense = expenseAgg._sum.amount ?? 0;

  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    counts: {
      income: incomeAgg._count._all,
      expense: expenseAgg._count._all,
    },
  };
}

async function byCategory(authUser) {
  const where = { ...baseWhere(), ...scopeForRole(authUser) };

  // groupBy pushes GROUP BY + SUM to SQLite so we never materialize all rows in Node.
  const grouped = await prisma.financialRecord.groupBy({
    by: ['category', 'type'],
    where,
    _sum: { amount: true },
    _count: { _all: true },
    orderBy: [{ category: 'asc' }, { type: 'asc' }],
  });

  return grouped.map((g) => ({
    category: g.category,
    type: g.type,
    totalAmount: g._sum.amount ?? 0,
    count: g._count._all,
  }));
}

async function trends(authUser, period) {
  // Raw SQL keeps date bucketing and aggregation in SQLite; Prisma groupBy cannot truncate dates per bucket.
  // Format string must be a SQL literal — binding it as a parameter yields NULL buckets on SQLite with Prisma.
  const isWeekly = period === 'weekly';

  // Prisma persists DateTime on SQLite as INTEGER unix milliseconds — normalize before strftime.
  const rows =
    authUser.role === 'ADMIN'
      ? isWeekly
        ? await prisma.$queryRaw`
            SELECT
              strftime('%Y-W%W', datetime("date" / 1000.0, 'unixepoch')) AS period,
              "type",
              SUM("amount") AS total,
              COUNT(*) AS cnt
            FROM "FinancialRecord"
            WHERE "deletedAt" IS NULL
            GROUP BY period, "type"
            ORDER BY period ASC, "type" ASC
          `
        : await prisma.$queryRaw`
            SELECT
              strftime('%Y-%m', datetime("date" / 1000.0, 'unixepoch')) AS period,
              "type",
              SUM("amount") AS total,
              COUNT(*) AS cnt
            FROM "FinancialRecord"
            WHERE "deletedAt" IS NULL
            GROUP BY period, "type"
            ORDER BY period ASC, "type" ASC
          `
      : isWeekly
        ? await prisma.$queryRaw`
            SELECT
              strftime('%Y-W%W', datetime("date" / 1000.0, 'unixepoch')) AS period,
              "type",
              SUM("amount") AS total,
              COUNT(*) AS cnt
            FROM "FinancialRecord"
            WHERE "deletedAt" IS NULL AND "userId" = ${authUser.id}
            GROUP BY period, "type"
            ORDER BY period ASC, "type" ASC
          `
        : await prisma.$queryRaw`
            SELECT
              strftime('%Y-%m', datetime("date" / 1000.0, 'unixepoch')) AS period,
              "type",
              SUM("amount") AS total,
              COUNT(*) AS cnt
            FROM "FinancialRecord"
            WHERE "deletedAt" IS NULL AND "userId" = ${authUser.id}
            GROUP BY period, "type"
            ORDER BY period ASC, "type" ASC
          `;

  // Prisma/SQLite can surface BIGINT for aggregates; coerce so Express JSON responses never throw.
  return rows.map((row) => ({
    period: row.period,
    type: row.type,
    total: Number(row.total),
    count: Number(row.cnt),
  }));
}

async function recent(authUser, limit = 10) {
  const where = { ...baseWhere(), ...scopeForRole(authUser) };

  return prisma.financialRecord.findMany({
    where,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      amount: true,
      type: true,
      category: true,
      date: true,
      notes: true,
      createdAt: true,
      userId: true,
    },
  });
}

module.exports = {
  summary,
  byCategory,
  trends,
  recent,
};
