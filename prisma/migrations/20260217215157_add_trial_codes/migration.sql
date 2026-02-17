-- CreateTable
CREATE TABLE "TrialCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "note" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "redeemedBy" TEXT,
    "redeemedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "TrialCode_code_key" ON "TrialCode"("code");

-- CreateIndex
CREATE INDEX "TrialCode_code_idx" ON "TrialCode"("code");
