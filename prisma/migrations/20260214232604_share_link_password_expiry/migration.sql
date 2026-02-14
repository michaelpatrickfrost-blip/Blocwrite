-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShareLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "readerName" TEXT,
    "recipientEmail" TEXT,
    "passwordHash" TEXT,
    "expiryDays" INTEGER NOT NULL DEFAULT 7,
    "expiresAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ShareLink" ("createdAt", "expiresAt", "id", "novelId", "ownerEmail", "readerName", "status", "token") SELECT "createdAt", "expiresAt", "id", "novelId", "ownerEmail", "readerName", "status", "token" FROM "ShareLink";
DROP TABLE "ShareLink";
ALTER TABLE "new_ShareLink" RENAME TO "ShareLink";
CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");
CREATE INDEX "ShareLink_ownerEmail_idx" ON "ShareLink"("ownerEmail");
CREATE INDEX "ShareLink_token_idx" ON "ShareLink"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
