/*
  Warnings:

  - Added the required column `systemPrompt` to the `Character` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "systemPrompt" TEXT NOT NULL;
