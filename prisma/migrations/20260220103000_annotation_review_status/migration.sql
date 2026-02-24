-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_SharedChapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shareLinkId" TEXT NOT NULL,
    "sourceChapterId" TEXT,
    "chapterTitle" TEXT NOT NULL,
    "chapterContent" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "SharedChapter_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "ShareLink" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SharedChapter" ("id", "shareLinkId", "chapterTitle", "chapterContent", "order")
SELECT "id", "shareLinkId", "chapterTitle", "chapterContent", "order" FROM "SharedChapter";
DROP TABLE "SharedChapter";
ALTER TABLE "new_SharedChapter" RENAME TO "SharedChapter";
CREATE INDEX "SharedChapter_shareLinkId_idx" ON "SharedChapter"("shareLinkId");

CREATE TABLE "new_Annotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sharedChapterId" TEXT NOT NULL,
    "selectedText" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'comment',
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "reviewedAt" DATETIME,
    "reviewerAction" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Annotation_sharedChapterId_fkey" FOREIGN KEY ("sharedChapterId") REFERENCES "SharedChapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Annotation" ("id", "sharedChapterId", "selectedText", "startOffset", "endOffset", "note", "type", "createdAt", "reviewStatus")
SELECT "id", "sharedChapterId", "selectedText", "startOffset", "endOffset", "note", "type", "createdAt", 'pending' FROM "Annotation";
DROP TABLE "Annotation";
ALTER TABLE "new_Annotation" RENAME TO "Annotation";
CREATE INDEX "Annotation_sharedChapterId_idx" ON "Annotation"("sharedChapterId");
CREATE INDEX "Annotation_reviewStatus_idx" ON "Annotation"("reviewStatus");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
