-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('ORG_ADMIN', 'ANALYST', 'INSIGHT_REVIEWER', 'STRATEGY_MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('MANUAL', 'EXCEL', 'CSV', 'GOOGLE_MAPS');

-- CreateEnum
CREATE TYPE "DataSourceStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('UPLOADING', 'MAPPING', 'VALIDATING', 'IMPORTING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FeedbackProcessingStatus" AS ENUM ('RAW', 'NORMALIZED', 'DUPLICATE', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'NEEDS_RETRY');

-- CreateEnum
CREATE TYPE "InsightStatus" AS ENUM ('DRAFT', 'WAITING_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_REANALYSIS', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InsightOrigin" AS ENUM ('OBSERVED', 'INFERRED', 'ASSUMED');

-- CreateEnum
CREATE TYPE "StrategyVersionStatus" AS ENUM ('AI_DRAFT', 'DRAFT', 'WAITING_APPROVAL', 'NEEDS_REVISION', 'APPROVED', 'LOCKED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AnalysisSessionStatus" AS ENUM ('DRAFT', 'DATA_COLLECTION', 'PROCESSING', 'ANALYZING', 'INSIGHT_REVIEW', 'STRATEGY_BUILDING', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('DATA_NORMALIZATION', 'DEDUPLICATION', 'AI_FEEDBACK_ANALYSIS', 'INSIGHT_GENERATION', 'STRATEGY_GENERATION');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InsightApprovalAction" AS ENUM ('APPROVED', 'REJECTED', 'NEEDS_REANALYSIS');

-- CreateEnum
CREATE TYPE "StrategyApprovalAction" AS ENUM ('APPROVED', 'REJECTED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOCK', 'ARCHIVE', 'MERGE', 'SPLIT', 'REANALYZE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "description" TEXT,
    "website" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_locations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "googlePlaceId" TEXT,
    "googleLocationId" TEXT,
    "mapsUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_profiles" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "products" JSONB NOT NULL DEFAULT '[]',
    "services" JSONB NOT NULL DEFAULT '[]',
    "targetAudience" JSONB NOT NULL DEFAULT '[]',
    "competitors" JSONB NOT NULL DEFAULT '[]',
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "brandVoice" TEXT,
    "allowedTopics" JSONB NOT NULL DEFAULT '[]',
    "bannedTopics" JSONB NOT NULL DEFAULT '[]',
    "extraNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_sessions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT,
    "focusProduct" TEXT,
    "dateFrom" TIMESTAMP(3),
    "dateTo" TIMESTAMP(3),
    "status" "AnalysisSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "analysis_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_sources" (
    "id" TEXT NOT NULL,
    "analysisSessionId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "businessLocationId" TEXT,
    "name" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "status" "DataSourceStatus" NOT NULL DEFAULT 'PENDING',
    "totalRecords" INTEGER,
    "validRecords" INTEGER,
    "errorRecords" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_feedbacks" (
    "id" TEXT NOT NULL,
    "analysisSessionId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "externalId" TEXT,
    "contentHash" TEXT,
    "rawContent" TEXT NOT NULL,
    "normalizedContent" TEXT,
    "reviewerName" TEXT,
    "rating" INTEGER,
    "language" TEXT,
    "sourceUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "notes" TEXT,
    "processingStatus" "FeedbackProcessingStatus" NOT NULL DEFAULT 'RAW',
    "duplicateOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_analyses" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "sentiment" "Sentiment",
    "sentimentScore" DOUBLE PRECISION,
    "topics" JSONB NOT NULL DEFAULT '[]',
    "painPoints" JSONB NOT NULL DEFAULT '[]',
    "questions" JSONB NOT NULL DEFAULT '[]',
    "priority" INTEGER,
    "confidence" DOUBLE PRECISION,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "aiModel" TEXT,
    "promptVersion" TEXT,
    "rawResponse" JSONB,
    "errorMessage" TEXT,
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_jobs" (
    "id" TEXT NOT NULL,
    "analysisSessionId" TEXT NOT NULL,
    "jobType" "JobType" NOT NULL,
    "bullmqJobId" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "totalItems" INTEGER,
    "processedItems" INTEGER,
    "failedItems" INTEGER,
    "payload" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileStorageKey" TEXT NOT NULL,
    "fileChecksum" TEXT,
    "mimeType" TEXT,
    "columnMapping" JSONB,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'UPLOADING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "errorFileKey" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_row_errors" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "errorCode" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_row_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insights" (
    "id" TEXT NOT NULL,
    "analysisSessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "origin" "InsightOrigin" NOT NULL DEFAULT 'INFERRED',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "frequencyCount" INTEGER NOT NULL DEFAULT 0,
    "frequencyPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "InsightStatus" NOT NULL DEFAULT 'DRAFT',
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "parentInsightId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insight_evidences" (
    "id" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "excerpt" TEXT,
    "relevance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insight_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insight_approvals" (
    "id" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,
    "action" "InsightApprovalAction" NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insight_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategies" (
    "id" TEXT NOT NULL,
    "analysisSessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currentVersionId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_versions" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "status" "StrategyVersionStatus" NOT NULL DEFAULT 'AI_DRAFT',
    "context" TEXT,
    "objectives" JSONB NOT NULL DEFAULT '[]',
    "targetSegments" JSONB NOT NULL DEFAULT '[]',
    "priorityProblems" JSONB NOT NULL DEFAULT '[]',
    "mainMessages" JSONB NOT NULL DEFAULT '[]',
    "responsePrinciples" JSONB NOT NULL DEFAULT '[]',
    "contentThemes" JSONB NOT NULL DEFAULT '[]',
    "risks" JSONB NOT NULL DEFAULT '[]',
    "kpis" JSONB NOT NULL DEFAULT '[]',
    "additionalNotes" TEXT,
    "aiModel" TEXT,
    "promptVersion" TEXT,
    "editedById" TEXT,
    "editReason" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_insights" (
    "id" TEXT NOT NULL,
    "strategyVersionId" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "strategy_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_approvals" (
    "id" TEXT NOT NULL,
    "strategyVersionId" TEXT NOT NULL,
    "action" "StrategyApprovalAction" NOT NULL,
    "approvedById" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "analysisSessionId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeData" JSONB,
    "afterData" JSONB,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organization_members_organizationId_idx" ON "organization_members"("organizationId");

-- CreateIndex
CREATE INDEX "organization_members_userId_idx" ON "organization_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organizationId_userId_key" ON "organization_members"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "businesses_organizationId_idx" ON "businesses"("organizationId");

-- CreateIndex
CREATE INDEX "businesses_createdById_idx" ON "businesses"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_id_organizationId_key" ON "businesses"("id", "organizationId");

-- CreateIndex
CREATE INDEX "business_locations_businessId_idx" ON "business_locations"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "business_locations_businessId_googlePlaceId_key" ON "business_locations"("businessId", "googlePlaceId");

-- CreateIndex
CREATE UNIQUE INDEX "business_locations_id_businessId_key" ON "business_locations"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "brand_profiles_businessId_key" ON "brand_profiles"("businessId");

-- CreateIndex
CREATE INDEX "analysis_sessions_organizationId_idx" ON "analysis_sessions"("organizationId");

-- CreateIndex
CREATE INDEX "analysis_sessions_businessId_idx" ON "analysis_sessions"("businessId");

-- CreateIndex
CREATE INDEX "analysis_sessions_createdById_idx" ON "analysis_sessions"("createdById");

-- CreateIndex
CREATE INDEX "analysis_sessions_status_idx" ON "analysis_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_sessions_id_businessId_key" ON "analysis_sessions"("id", "businessId");

-- CreateIndex
CREATE INDEX "data_sources_analysisSessionId_idx" ON "data_sources"("analysisSessionId");

-- CreateIndex
CREATE INDEX "data_sources_businessId_idx" ON "data_sources"("businessId");

-- CreateIndex
CREATE INDEX "data_sources_businessLocationId_idx" ON "data_sources"("businessLocationId");

-- CreateIndex
CREATE INDEX "data_sources_createdById_idx" ON "data_sources"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "data_sources_id_analysisSessionId_key" ON "data_sources"("id", "analysisSessionId");

-- CreateIndex
CREATE INDEX "customer_feedbacks_analysisSessionId_idx" ON "customer_feedbacks"("analysisSessionId");

-- CreateIndex
CREATE INDEX "customer_feedbacks_analysisSessionId_contentHash_idx" ON "customer_feedbacks"("analysisSessionId", "contentHash");

-- CreateIndex
CREATE INDEX "customer_feedbacks_dataSourceId_idx" ON "customer_feedbacks"("dataSourceId");

-- CreateIndex
CREATE INDEX "customer_feedbacks_duplicateOfId_idx" ON "customer_feedbacks"("duplicateOfId");

-- CreateIndex
CREATE INDEX "customer_feedbacks_processingStatus_idx" ON "customer_feedbacks"("processingStatus");

-- CreateIndex
CREATE INDEX "customer_feedbacks_publishedAt_idx" ON "customer_feedbacks"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_feedbacks_dataSourceId_externalId_key" ON "customer_feedbacks"("dataSourceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_analyses_feedbackId_key" ON "feedback_analyses"("feedbackId");

-- CreateIndex
CREATE INDEX "feedback_analyses_status_idx" ON "feedback_analyses"("status");

-- CreateIndex
CREATE INDEX "processing_jobs_analysisSessionId_idx" ON "processing_jobs"("analysisSessionId");

-- CreateIndex
CREATE INDEX "processing_jobs_createdById_idx" ON "processing_jobs"("createdById");

-- CreateIndex
CREATE INDEX "processing_jobs_status_idx" ON "processing_jobs"("status");

-- CreateIndex
CREATE INDEX "processing_jobs_jobType_idx" ON "processing_jobs"("jobType");

-- CreateIndex
CREATE INDEX "import_batches_dataSourceId_idx" ON "import_batches"("dataSourceId");

-- CreateIndex
CREATE INDEX "import_batches_createdById_idx" ON "import_batches"("createdById");

-- CreateIndex
CREATE INDEX "import_batches_dataSourceId_fileChecksum_idx" ON "import_batches"("dataSourceId", "fileChecksum");

-- CreateIndex
CREATE INDEX "import_row_errors_importBatchId_idx" ON "import_row_errors"("importBatchId");

-- CreateIndex
CREATE INDEX "insights_analysisSessionId_idx" ON "insights"("analysisSessionId");

-- CreateIndex
CREATE INDEX "insights_createdById_idx" ON "insights"("createdById");

-- CreateIndex
CREATE INDEX "insights_reviewedById_idx" ON "insights"("reviewedById");

-- CreateIndex
CREATE INDEX "insights_status_idx" ON "insights"("status");

-- CreateIndex
CREATE INDEX "insight_evidences_insightId_idx" ON "insight_evidences"("insightId");

-- CreateIndex
CREATE UNIQUE INDEX "insight_evidences_insightId_feedbackId_key" ON "insight_evidences"("insightId", "feedbackId");

-- CreateIndex
CREATE INDEX "insight_approvals_insightId_idx" ON "insight_approvals"("insightId");

-- CreateIndex
CREATE INDEX "insight_approvals_reviewedById_idx" ON "insight_approvals"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "strategies_currentVersionId_key" ON "strategies"("currentVersionId");

-- CreateIndex
CREATE INDEX "strategies_analysisSessionId_idx" ON "strategies"("analysisSessionId");

-- CreateIndex
CREATE INDEX "strategies_createdById_idx" ON "strategies"("createdById");

-- CreateIndex
CREATE INDEX "strategy_versions_editedById_idx" ON "strategy_versions"("editedById");

-- CreateIndex
CREATE INDEX "strategy_versions_approvedById_idx" ON "strategy_versions"("approvedById");

-- CreateIndex
CREATE INDEX "strategy_versions_strategyId_status_idx" ON "strategy_versions"("strategyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "strategy_versions_strategyId_versionNo_key" ON "strategy_versions"("strategyId", "versionNo");

-- CreateIndex
CREATE INDEX "strategy_insights_strategyVersionId_idx" ON "strategy_insights"("strategyVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "strategy_insights_strategyVersionId_insightId_key" ON "strategy_insights"("strategyVersionId", "insightId");

-- CreateIndex
CREATE INDEX "strategy_approvals_strategyVersionId_idx" ON "strategy_approvals"("strategyVersionId");

-- CreateIndex
CREATE INDEX "strategy_approvals_approvedById_idx" ON "strategy_approvals"("approvedById");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "audit_logs_analysisSessionId_idx" ON "audit_logs"("analysisSessionId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_sessions" ADD CONSTRAINT "analysis_sessions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_sessions" ADD CONSTRAINT "analysis_sessions_businessId_organizationId_fkey" FOREIGN KEY ("businessId", "organizationId") REFERENCES "businesses"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_sessions" ADD CONSTRAINT "analysis_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_analysisSessionId_businessId_fkey" FOREIGN KEY ("analysisSessionId", "businessId") REFERENCES "analysis_sessions"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_businessLocationId_businessId_fkey" FOREIGN KEY ("businessLocationId", "businessId") REFERENCES "business_locations"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_feedbacks" ADD CONSTRAINT "customer_feedbacks_analysisSessionId_fkey" FOREIGN KEY ("analysisSessionId") REFERENCES "analysis_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_feedbacks" ADD CONSTRAINT "customer_feedbacks_dataSourceId_analysisSessionId_fkey" FOREIGN KEY ("dataSourceId", "analysisSessionId") REFERENCES "data_sources"("id", "analysisSessionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_feedbacks" ADD CONSTRAINT "customer_feedbacks_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "customer_feedbacks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_analyses" ADD CONSTRAINT "feedback_analyses_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "customer_feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_analysisSessionId_fkey" FOREIGN KEY ("analysisSessionId") REFERENCES "analysis_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "data_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_row_errors" ADD CONSTRAINT "import_row_errors_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insights" ADD CONSTRAINT "insights_analysisSessionId_fkey" FOREIGN KEY ("analysisSessionId") REFERENCES "analysis_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insights" ADD CONSTRAINT "insights_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insights" ADD CONSTRAINT "insights_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insights" ADD CONSTRAINT "insights_parentInsightId_fkey" FOREIGN KEY ("parentInsightId") REFERENCES "insights"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_evidences" ADD CONSTRAINT "insight_evidences_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "insights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_evidences" ADD CONSTRAINT "insight_evidences_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "customer_feedbacks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_approvals" ADD CONSTRAINT "insight_approvals_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "insights"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_approvals" ADD CONSTRAINT "insight_approvals_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_analysisSessionId_fkey" FOREIGN KEY ("analysisSessionId") REFERENCES "analysis_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "strategy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_versions" ADD CONSTRAINT "strategy_versions_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_versions" ADD CONSTRAINT "strategy_versions_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_versions" ADD CONSTRAINT "strategy_versions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_insights" ADD CONSTRAINT "strategy_insights_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_insights" ADD CONSTRAINT "strategy_insights_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "insights"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_approvals" ADD CONSTRAINT "strategy_approvals_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_approvals" ADD CONSTRAINT "strategy_approvals_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "analysis_sessions"
ADD CONSTRAINT "analysis_sessions_date_range_check"
CHECK ("dateFrom" IS NULL OR "dateTo" IS NULL OR "dateFrom" <= "dateTo");

-- AddCheckConstraint
ALTER TABLE "customer_feedbacks"
ADD CONSTRAINT "customer_feedbacks_rating_check"
CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5);

-- AddCheckConstraint
ALTER TABLE "feedback_analyses"
ADD CONSTRAINT "feedback_analyses_sentiment_score_check"
CHECK ("sentimentScore" IS NULL OR "sentimentScore" BETWEEN -1 AND 1);

-- AddCheckConstraint
ALTER TABLE "feedback_analyses"
ADD CONSTRAINT "feedback_analyses_confidence_check"
CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 1);

-- AddCheckConstraint
ALTER TABLE "feedback_analyses"
ADD CONSTRAINT "feedback_analyses_priority_check"
CHECK ("priority" IS NULL OR "priority" BETWEEN 1 AND 5);

-- AddCheckConstraint
ALTER TABLE "processing_jobs"
ADD CONSTRAINT "processing_jobs_progress_check"
CHECK ("progress" BETWEEN 0 AND 100);

-- AddCheckConstraint
ALTER TABLE "processing_jobs"
ADD CONSTRAINT "processing_jobs_processed_items_check"
CHECK ("processedItems" IS NULL OR "totalItems" IS NULL OR "processedItems" <= "totalItems");

-- AddCheckConstraint
ALTER TABLE "import_batches"
ADD CONSTRAINT "import_batches_imported_rows_check"
CHECK ("importedRows" <= "validRows");

-- AddCheckConstraint
ALTER TABLE "insights"
ADD CONSTRAINT "insights_confidence_check"
CHECK ("confidence" BETWEEN 0 AND 1);

-- AddCheckConstraint
ALTER TABLE "insights"
ADD CONSTRAINT "insights_priority_check"
CHECK ("priority" BETWEEN 1 AND 5);

-- AddCheckConstraint
ALTER TABLE "insights"
ADD CONSTRAINT "insights_frequency_pct_check"
CHECK ("frequencyPct" BETWEEN 0 AND 100);
