-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "enrichedExpertise" TEXT,
ADD COLUMN     "enrichedGoal" TEXT,
ADD COLUMN     "enrichedPersonality" TEXT,
ADD COLUMN     "enrichedSpeakingStyle" TEXT,
ADD COLUMN     "lastEnrichedAt" TIMESTAMP(3);
