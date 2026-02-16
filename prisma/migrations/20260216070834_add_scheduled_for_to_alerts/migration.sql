-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AdminAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL DEFAULT 15,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "scheduledFor" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AdminAlert" ("active", "createdAt", "durationSec", "id", "message") SELECT "active", "createdAt", "durationSec", "id", "message" FROM "AdminAlert";
DROP TABLE "AdminAlert";
ALTER TABLE "new_AdminAlert" RENAME TO "AdminAlert";
CREATE INDEX "AdminAlert_active_scheduledFor_idx" ON "AdminAlert"("active", "scheduledFor");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
