/*
  Warnings:

  - You are about to drop the column `description` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `model` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `systemPrompt` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `temperature` on the `Character` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Character" DROP COLUMN "description",
DROP COLUMN "model",
DROP COLUMN "systemPrompt",
DROP COLUMN "temperature",
ADD COLUMN     "expertise" TEXT,
ADD COLUMN     "goal" TEXT,
ADD COLUMN     "personality" TEXT,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "speakingStyle" TEXT;
