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

function monthlyPeriodKey(date) {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** ISO week label similar to dashboard expectations (year + week number). */
function weeklyPeriodKey(date) {
  const d = new Date(date);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((t - yearStart) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function aggregateTrends(rows, period) {
  const bucket = period === 'weekly' ? weeklyPeriodKey : monthlyPeriodKey;
  const map = new Map();

  for (const row of rows) {
    const p = bucket(row.date);
    const key = `${p}\0${row.type}`;
    const cur = map.get(key) || { period: p, type: row.type, total: 0, count: 0 };
    cur.total += row.amount;
    cur.count += 1;
    map.set(key, cur);
  }

  const out = Array.from(map.values());
  out.sort((a, b) => {
    const c = a.period.localeCompare(b.period);
    if (c !== 0) return c;
    return String(a.type).localeCompare(String(b.type));
  });

  return out.map((r) => ({
    period: r.period,
    type: r.type,
    total: r.total,
    count: r.count,
  }));
}

async function summary(authUser) {
  const where = { ...baseWhere(), ...scopeForRole(authUser) };

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
  const where = { ...baseWhere(), ...scopeForRole(authUser) };

  const rows = await prisma.financialRecord.findMany({
    where,
    select: { date: true, type: true, amount: true },
  });

  return aggregateTrends(rows, period);
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
