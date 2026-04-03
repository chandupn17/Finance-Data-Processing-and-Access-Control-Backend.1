const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function addMonths(base, deltaMonths) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + deltaMonths);
  return d;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

async function main() {
  await prisma.financialRecord.deleteMany();
  await prisma.user.deleteMany();

  const [adminHash, analystHash, viewerHash] = await Promise.all([
    bcrypt.hash('Admin@123', 10),
    bcrypt.hash('Analyst@123', 10),
    bcrypt.hash('Viewer@123', 10),
  ]);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@test.com',
      password: adminHash,
      role: 'ADMIN',
    },
  });

  const analyst = await prisma.user.create({
    data: {
      name: 'Analyst User',
      email: 'analyst@test.com',
      password: analystHash,
      role: 'ANALYST',
    },
  });

  const viewer = await prisma.user.create({
    data: {
      name: 'Viewer User',
      email: 'viewer@test.com',
      password: viewerHash,
      role: 'VIEWER',
    },
  });

  const categoriesIncome = ['Salary', 'Freelance', 'Interest', 'Refund'];
  const categoriesExpense = ['Rent', 'Utilities', 'Software', 'Travel', 'Meals'];

  const now = new Date();
  const records = [];

  const owners = [admin, analyst, viewer];

  for (let i = 0; i < 20; i += 1) {
    const owner = owners[i % owners.length];
    const isIncome = i % 3 !== 0;
    const type = isIncome ? 'INCOME' : 'EXPENSE';
    const categoryPool = isIncome ? categoriesIncome : categoriesExpense;
    const category = categoryPool[i % categoryPool.length];
    const monthsAgo = Math.floor(randomBetween(0, 6));
    const dayJitter = Math.floor(randomBetween(0, 27));
    const date = addMonths(now, -monthsAgo);
    date.setDate(dayJitter);

    const amount = Math.round(randomBetween(isIncome ? 800 : 40, isIncome ? 6500 : 900) * 100) / 100;

    records.push({
      userId: owner.id,
      type,
      category,
      amount,
      date,
      notes: isIncome ? `Seed income — ${category}` : `Seed expense — ${category}`,
    });
  }

  await prisma.financialRecord.createMany({ data: records });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
