/*
  Warnings:

  - Made the column `role` on table `Character` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Character" ALTER COLUMN "role" SET NOT NULL;
