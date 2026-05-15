/*
  Warnings:

  - You are about to drop the `Source` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('youtube', 'pdf', 'doc', 'image', 'text');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('processing', 'completed', 'failed');

-- DropForeignKey
ALTER TABLE "Source" DROP CONSTRAINT "Source_notebookId_fkey";

-- DropTable
DROP TABLE "Source";

-- CreateTable
CREATE TABLE "SourceChunk" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" JSONB NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedSource" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "thumbnail" TEXT,
    "metadata" JSONB,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'processing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractedSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotebookSource" (
    "id" TEXT NOT NULL,
    "notebookId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotebookSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SourceChunk_sourceId_idx" ON "SourceChunk"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ExtractedSource_sourceKey_key" ON "ExtractedSource"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "NotebookSource_notebookId_sourceId_key" ON "NotebookSource"("notebookId", "sourceId");

-- AddForeignKey
ALTER TABLE "SourceChunk" ADD CONSTRAINT "SourceChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ExtractedSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotebookSource" ADD CONSTRAINT "NotebookSource_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotebookSource" ADD CONSTRAINT "NotebookSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ExtractedSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
