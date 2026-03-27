/*
  Warnings:

  - Added the required column `notebookId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "notebookId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Notebook" ADD COLUMN     "characterId" TEXT;

-- CreateIndex
CREATE INDEX "Message_notebookId_createdAt_idx" ON "Message"("notebookId", "createdAt");

-- AddForeignKey
ALTER TABLE "Notebook" ADD CONSTRAINT "Notebook_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
