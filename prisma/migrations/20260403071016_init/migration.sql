-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FinancialRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "notes" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "FinancialRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "FinancialRecord_userId_idx" ON "FinancialRecord"("userId");

-- CreateIndex
CREATE INDEX "FinancialRecord_type_idx" ON "FinancialRecord"("type");

-- CreateIndex
CREATE INDEX "FinancialRecord_category_idx" ON "FinancialRecord"("category");

-- CreateIndex
CREATE INDEX "FinancialRecord_date_idx" ON "FinancialRecord"("date");

-- CreateIndex
CREATE INDEX "FinancialRecord_deletedAt_idx" ON "FinancialRecord"("deletedAt");
