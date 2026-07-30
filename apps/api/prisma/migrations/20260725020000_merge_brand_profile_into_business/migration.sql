-- DropForeignKey
ALTER TABLE "brand_profiles" DROP CONSTRAINT "brand_profiles_businessId_fkey";

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "allowedTopics" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "bannedTopics" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "brandVoice" TEXT,
ADD COLUMN     "competitors" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "extraNotes" TEXT,
ADD COLUMN     "products" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "services" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "strengths" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "targetAudience" JSONB NOT NULL DEFAULT '[]';

-- MigrateData
UPDATE "businesses" AS business
SET
    "products" = profile."products",
    "services" = profile."services",
    "targetAudience" = profile."targetAudience",
    "competitors" = profile."competitors",
    "strengths" = profile."strengths",
    "brandVoice" = profile."brandVoice",
    "allowedTopics" = profile."allowedTopics",
    "bannedTopics" = profile."bannedTopics",
    "extraNotes" = profile."extraNotes",
    "updatedAt" = GREATEST(business."updatedAt", profile."updatedAt")
FROM "brand_profiles" AS profile
WHERE profile."businessId" = business."id";

-- DropTable
DROP TABLE "brand_profiles";
