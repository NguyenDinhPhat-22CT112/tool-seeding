-- CreateEnum
CREATE TYPE "BotPlatform" AS ENUM ('GOOGLE_MAPS');

-- CreateEnum
CREATE TYPE "BotStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "BotAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "BotTaskType" AS ENUM ('REVIEW_SEEDING');

-- CreateEnum
CREATE TYPE "BotTaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContentOrigin" AS ENUM ('AI_GENERATED', 'HUMAN_WRITTEN');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'WAITING_APPROVAL', 'NEEDS_REVISION', 'APPROVED', 'LOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentVersionSource" AS ENUM ('HUMAN_EDIT', 'AI_GENERATE', 'AI_REWRITE');

-- CreateEnum
CREATE TYPE "AIGenerationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "PromptPurpose" AS ENUM ('GENERATE', 'REWRITE');

-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'CONTENT_GENERATION';

-- CreateTable
CREATE TABLE "seeding_contents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "analysisSessionId" TEXT NOT NULL,
    "strategyVersionId" TEXT NOT NULL,
    "origin" "ContentOrigin" NOT NULL DEFAULT 'AI_GENERATED',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "platform" TEXT NOT NULL DEFAULT 'google_maps',
    "contentType" TEXT NOT NULL DEFAULT 'review_reply',
    "title" TEXT NOT NULL,
    "currentVersionId" TEXT,
    "contentHash" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "createdBy" TEXT DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "seeding_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_versions" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "contentTheme" TEXT,
    "source" "ContentVersionSource" NOT NULL,
    "aiGenerationId" TEXT,
    "editReason" TEXT,
    "editedBy" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_generations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "analysisSessionId" TEXT NOT NULL,
    "strategyVersionId" TEXT NOT NULL,
    "contentId" TEXT,
    "promptTemplateId" TEXT NOT NULL,
    "promptRendered" TEXT NOT NULL,
    "promptVersion" TEXT,
    "aiProvider" TEXT NOT NULL,
    "aiModel" TEXT NOT NULL,
    "parameters" JSONB NOT NULL DEFAULT '{}',
    "candidates" JSONB NOT NULL DEFAULT '[]',
    "selectedCandidateIndex" INTEGER,
    "status" "AIGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "rawResponse" JSONB,
    "requestedBy" TEXT DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT,
    "contentType" TEXT NOT NULL,
    "purpose" "PromptPurpose" NOT NULL,
    "templateBody" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seeding_bots" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "brandVoice" TEXT,
    "maturityLevel" INTEGER NOT NULL DEFAULT 1,
    "status" "BotStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdBy" TEXT DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "seeding_bots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seeding_bot_accounts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "platform" "BotPlatform" NOT NULL DEFAULT 'GOOGLE_MAPS',
    "accountLabel" TEXT NOT NULL,
    "profileUrl" TEXT,
    "avatarUrl" TEXT,
    "accountStatus" "BotAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "accountCreatedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seeding_bot_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seeding_bot_locations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "businessLocationId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seeding_bot_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seeding_bot_tasks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "botAccountId" TEXT,
    "businessId" TEXT NOT NULL,
    "businessLocationId" TEXT NOT NULL,
    "analysisSessionId" TEXT,
    "strategyVersionId" TEXT,
    "taskType" "BotTaskType" NOT NULL DEFAULT 'REVIEW_SEEDING',
    "status" "BotTaskStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "content" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "externalRef" TEXT,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "notes" TEXT,
    "createdBy" TEXT DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seeding_bot_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seeding_bot_activity_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "botAccountId" TEXT,
    "taskId" TEXT,
    "action" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seeding_bot_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seeding_contents_currentVersionId_key" ON "seeding_contents"("currentVersionId");

-- CreateIndex
CREATE INDEX "seeding_contents_organizationId_idx" ON "seeding_contents"("organizationId");

-- CreateIndex
CREATE INDEX "seeding_contents_contentHash_idx" ON "seeding_contents"("contentHash");

-- CreateIndex
CREATE INDEX "seeding_contents_analysisSessionId_status_idx" ON "seeding_contents"("analysisSessionId", "status");

-- CreateIndex
CREATE INDEX "seeding_contents_strategyVersionId_idx" ON "seeding_contents"("strategyVersionId");

-- CreateIndex
CREATE INDEX "seeding_contents_origin_idx" ON "seeding_contents"("origin");

-- CreateIndex
CREATE UNIQUE INDEX "seeding_contents_currentVersionId_id_key" ON "seeding_contents"("currentVersionId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "seeding_contents_id_organizationId_key" ON "seeding_contents"("id", "organizationId");

-- CreateIndex
CREATE INDEX "content_versions_contentId_idx" ON "content_versions"("contentId");

-- CreateIndex
CREATE INDEX "content_versions_aiGenerationId_idx" ON "content_versions"("aiGenerationId");

-- CreateIndex
CREATE UNIQUE INDEX "content_versions_contentId_versionNumber_key" ON "content_versions"("contentId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "content_versions_id_contentId_key" ON "content_versions"("id", "contentId");

-- CreateIndex
CREATE INDEX "ai_generations_organizationId_idx" ON "ai_generations"("organizationId");

-- CreateIndex
CREATE INDEX "ai_generations_analysisSessionId_idx" ON "ai_generations"("analysisSessionId");

-- CreateIndex
CREATE INDEX "ai_generations_strategyVersionId_idx" ON "ai_generations"("strategyVersionId");

-- CreateIndex
CREATE INDEX "ai_generations_promptTemplateId_idx" ON "ai_generations"("promptTemplateId");

-- CreateIndex
CREATE INDEX "ai_generations_status_idx" ON "ai_generations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_generations_id_organizationId_key" ON "ai_generations"("id", "organizationId");

-- CreateIndex
CREATE INDEX "prompt_templates_platform_contentType_purpose_idx" ON "prompt_templates"("platform", "contentType", "purpose");

-- CreateIndex
CREATE INDEX "prompt_templates_isActive_idx" ON "prompt_templates"("isActive");

-- CreateIndex
CREATE INDEX "seeding_bots_organizationId_idx" ON "seeding_bots"("organizationId");

-- CreateIndex
CREATE INDEX "seeding_bots_status_idx" ON "seeding_bots"("status");

-- CreateIndex
CREATE UNIQUE INDEX "seeding_bots_id_organizationId_key" ON "seeding_bots"("id", "organizationId");

-- CreateIndex
CREATE INDEX "seeding_bot_accounts_organizationId_idx" ON "seeding_bot_accounts"("organizationId");

-- CreateIndex
CREATE INDEX "seeding_bot_accounts_botId_idx" ON "seeding_bot_accounts"("botId");

-- CreateIndex
CREATE UNIQUE INDEX "seeding_bot_accounts_botId_platform_accountLabel_key" ON "seeding_bot_accounts"("botId", "platform", "accountLabel");

-- CreateIndex
CREATE UNIQUE INDEX "seeding_bot_accounts_id_organizationId_key" ON "seeding_bot_accounts"("id", "organizationId");

-- CreateIndex
CREATE INDEX "seeding_bot_locations_organizationId_idx" ON "seeding_bot_locations"("organizationId");

-- CreateIndex
CREATE INDEX "seeding_bot_locations_businessId_idx" ON "seeding_bot_locations"("businessId");

-- CreateIndex
CREATE INDEX "seeding_bot_locations_businessLocationId_idx" ON "seeding_bot_locations"("businessLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "seeding_bot_locations_botId_businessLocationId_key" ON "seeding_bot_locations"("botId", "businessLocationId");

-- CreateIndex
CREATE INDEX "seeding_bot_tasks_organizationId_idx" ON "seeding_bot_tasks"("organizationId");

-- CreateIndex
CREATE INDEX "seeding_bot_tasks_botId_idx" ON "seeding_bot_tasks"("botId");

-- CreateIndex
CREATE INDEX "seeding_bot_tasks_botAccountId_idx" ON "seeding_bot_tasks"("botAccountId");

-- CreateIndex
CREATE INDEX "seeding_bot_tasks_status_idx" ON "seeding_bot_tasks"("status");

-- CreateIndex
CREATE INDEX "seeding_bot_tasks_analysisSessionId_idx" ON "seeding_bot_tasks"("analysisSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "seeding_bot_tasks_id_organizationId_key" ON "seeding_bot_tasks"("id", "organizationId");

-- CreateIndex
CREATE INDEX "seeding_bot_activity_logs_organizationId_idx" ON "seeding_bot_activity_logs"("organizationId");

-- CreateIndex
CREATE INDEX "seeding_bot_activity_logs_botId_idx" ON "seeding_bot_activity_logs"("botId");

-- CreateIndex
CREATE INDEX "seeding_bot_activity_logs_taskId_idx" ON "seeding_bot_activity_logs"("taskId");

-- CreateIndex
CREATE INDEX "seeding_bot_activity_logs_createdAt_idx" ON "seeding_bot_activity_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "seeding_contents" ADD CONSTRAINT "seeding_contents_analysisSessionId_fkey" FOREIGN KEY ("analysisSessionId") REFERENCES "analysis_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeding_contents" ADD CONSTRAINT "seeding_contents_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeding_contents" ADD CONSTRAINT "seeding_contents_currentVersionId_id_fkey" FOREIGN KEY ("currentVersionId", "id") REFERENCES "content_versions"("id", "contentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "seeding_contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_aiGenerationId_fkey" FOREIGN KEY ("aiGenerationId") REFERENCES "ai_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_analysisSessionId_fkey" FOREIGN KEY ("analysisSessionId") REFERENCES "analysis_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "prompt_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "seeding_contents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeding_bots" ADD CONSTRAINT "seeding_bots_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeding_bot_accounts" ADD CONSTRAINT "seeding_bot_accounts_botId_organizationId_fkey" FOREIGN KEY ("botId", "organizationId") REFERENCES "seeding_bots"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeding_bot_locations" ADD CONSTRAINT "seeding_bot_locations_botId_organizationId_fkey" FOREIGN KEY ("botId", "organizationId") REFERENCES "seeding_bots"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeding_bot_locations" ADD CONSTRAINT "seeding_bot_locations_businessLocationId_businessId_fkey" FOREIGN KEY ("businessLocationId", "businessId") REFERENCES "business_locations"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeding_bot_tasks" ADD CONSTRAINT "seeding_bot_tasks_botId_fkey" FOREIGN KEY ("botId") REFERENCES "seeding_bots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeding_bot_tasks" ADD CONSTRAINT "seeding_bot_tasks_botAccountId_fkey" FOREIGN KEY ("botAccountId") REFERENCES "seeding_bot_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeding_bot_tasks" ADD CONSTRAINT "seeding_bot_tasks_businessLocationId_fkey" FOREIGN KEY ("businessLocationId") REFERENCES "business_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeding_bot_tasks" ADD CONSTRAINT "seeding_bot_tasks_analysisSessionId_fkey" FOREIGN KEY ("analysisSessionId") REFERENCES "analysis_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeding_bot_tasks" ADD CONSTRAINT "seeding_bot_tasks_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeding_bot_activity_logs" ADD CONSTRAINT "seeding_bot_activity_logs_botId_fkey" FOREIGN KEY ("botId") REFERENCES "seeding_bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeding_bot_activity_logs" ADD CONSTRAINT "seeding_bot_activity_logs_botAccountId_fkey" FOREIGN KEY ("botAccountId") REFERENCES "seeding_bot_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeding_bot_activity_logs" ADD CONSTRAINT "seeding_bot_activity_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "seeding_bot_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
