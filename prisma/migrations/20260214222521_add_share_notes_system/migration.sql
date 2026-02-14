-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "readerName" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SharedChapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shareLinkId" TEXT NOT NULL,
    "chapterTitle" TEXT NOT NULL,
    "chapterContent" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "SharedChapter_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "ShareLink" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Annotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sharedChapterId" TEXT NOT NULL,
    "selectedText" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'comment',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Annotation_sharedChapterId_fkey" FOREIGN KEY ("sharedChapterId") REFERENCES "SharedChapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");

-- CreateIndex
CREATE INDEX "ShareLink_ownerEmail_idx" ON "ShareLink"("ownerEmail");

-- CreateIndex
CREATE INDEX "ShareLink_token_idx" ON "ShareLink"("token");

-- CreateIndex
CREATE INDEX "SharedChapter_shareLinkId_idx" ON "SharedChapter"("shareLinkId");

-- CreateIndex
CREATE INDEX "Annotation_sharedChapterId_idx" ON "Annotation"("sharedChapterId");
