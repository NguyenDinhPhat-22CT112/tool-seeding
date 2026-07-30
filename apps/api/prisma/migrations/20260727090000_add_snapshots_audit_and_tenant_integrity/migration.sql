-- This migration adds immutable snapshots, review history, versioned feedback
-- analyses, scoped processing jobs, and DB-level session consistency.
--
-- Required relation columns are introduced as nullable first, backfilled from
-- existing parent relations, and changed to NOT NULL only after consistency
-- checks have passed.

-- CreateEnum
CREATE TYPE "InsightReviewAction" AS ENUM (
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'EDITED',
    'REANALYSIS_REQUESTED',
    'MERGED',
    'SPLIT',
    'ARCHIVED'
);

-- Previous application code used deletedAt as part of "deactivate". The new
-- lifecycle keeps inactive businesses visible and reserves deletedAt for an
-- actual delete operation.
UPDATE "businesses"
SET "deletedAt" = NULL
WHERE "isActive" = false
  AND "deletedAt" IS NOT NULL;

-- PreflightChecks
-- Fail with an explicit message before replacing the existing foreign keys.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "customer_feedbacks" AS feedback
        JOIN "customer_feedbacks" AS original
          ON original."id" = feedback."duplicateOfId"
        WHERE feedback."analysisSessionId" <> original."analysisSessionId"
    ) THEN
        RAISE EXCEPTION
            'Cannot migrate: duplicate feedback links exist across analysis sessions';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "insight_evidences" AS evidence
        JOIN "insights" AS insight
          ON insight."id" = evidence."insightId"
        JOIN "customer_feedbacks" AS feedback
          ON feedback."id" = evidence."feedbackId"
        WHERE insight."analysisSessionId" <> feedback."analysisSessionId"
    ) THEN
        RAISE EXCEPTION
            'Cannot migrate: insight evidence links exist across analysis sessions';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "strategy_insights" AS link
        JOIN "strategy_versions" AS version
          ON version."id" = link."strategyVersionId"
        JOIN "strategies" AS strategy
          ON strategy."id" = version."strategyId"
        JOIN "insights" AS insight
          ON insight."id" = link."insightId"
        WHERE strategy."analysisSessionId" <> insight."analysisSessionId"
    ) THEN
        RAISE EXCEPTION
            'Cannot migrate: strategy insight links exist across analysis sessions';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "strategies" AS strategy
        JOIN "strategy_versions" AS version
          ON version."id" = strategy."currentVersionId"
        WHERE version."strategyId" <> strategy."id"
    ) THEN
        RAISE EXCEPTION
            'Cannot migrate: currentVersionId points to a version of another strategy';
    END IF;
END
$$;

-- AlterTable: AnalysisSession snapshots and lifecycle timestamps
ALTER TABLE "analysis_sessions"
ADD COLUMN "businessSnapshot" JSONB,
ADD COLUMN "businessSnapshotAt" TIMESTAMP(3),
ADD COLUMN "completedAt" TIMESTAMP(3);

-- Backfill snapshots for sessions that have already left DRAFT.
UPDATE "analysis_sessions" AS session
SET
    "businessSnapshot" = jsonb_build_object(
        'businessId', business."id",
        'name', business."name",
        'industry', business."industry",
        'description', business."description",
        'website', business."website",
        'address', business."address",
        'phone', business."phone",
        'email', business."email",
        'products', business."products",
        'services', business."services",
        'targetAudience', business."targetAudience",
        'competitors', business."competitors",
        'strengths', business."strengths",
        'brandVoice', business."brandVoice",
        'allowedTopics', business."allowedTopics",
        'bannedTopics', business."bannedTopics",
        'extraNotes', business."extraNotes",
        'sourceUpdatedAt', business."updatedAt"
    ),
    "businessSnapshotAt" = CURRENT_TIMESTAMP
FROM "businesses" AS business
WHERE session."businessId" = business."id"
  AND session."status" <> 'DRAFT'
  AND session."businessSnapshot" IS NULL;

-- Existing COMPLETED rows do not have the exact transition timestamp. updatedAt
-- is the safest available approximation and keeps the limitation explicit.
UPDATE "analysis_sessions"
SET "completedAt" = "updatedAt"
WHERE "status" = 'COMPLETED'
  AND "completedAt" IS NULL;

ALTER TABLE "analysis_sessions"
ADD CONSTRAINT "analysis_sessions_business_snapshot_check"
CHECK (
    ("businessSnapshot" IS NULL AND "businessSnapshotAt" IS NULL)
    OR
    ("businessSnapshot" IS NOT NULL AND "businessSnapshotAt" IS NOT NULL)
);

-- AlterTable: version FeedbackAnalysis instead of overwriting a 1:1 row
ALTER TABLE "feedback_analyses"
ADD COLUMN "runNo" INTEGER;

WITH numbered_runs AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "feedbackId"
            ORDER BY "createdAt", "id"
        )::INTEGER AS "runNo"
    FROM "feedback_analyses"
)
UPDATE "feedback_analyses" AS analysis
SET "runNo" = numbered_runs."runNo"
FROM numbered_runs
WHERE analysis."id" = numbered_runs."id";

ALTER TABLE "feedback_analyses"
ALTER COLUMN "runNo" SET NOT NULL;

ALTER TABLE "feedback_analyses"
ADD CONSTRAINT "feedback_analyses_run_no_check"
CHECK ("runNo" >= 1);

DROP INDEX "feedback_analyses_feedbackId_key";

-- AlterTable: add explicit scopes to ProcessingJob
ALTER TABLE "processing_jobs"
ADD COLUMN "dataSourceId" TEXT,
ADD COLUMN "importBatchId" TEXT;

ALTER TABLE "processing_jobs"
ADD CONSTRAINT "processing_jobs_import_batch_scope_check"
CHECK ("importBatchId" IS NULL OR "dataSourceId" IS NOT NULL);

-- AlterTable: session key for InsightEvidence
ALTER TABLE "insight_evidences"
ADD COLUMN "analysisSessionId" TEXT;

UPDATE "insight_evidences" AS evidence
SET "analysisSessionId" = insight."analysisSessionId"
FROM "insights" AS insight
WHERE insight."id" = evidence."insightId";

ALTER TABLE "insight_evidences"
ALTER COLUMN "analysisSessionId" SET NOT NULL;

-- AlterTable: denormalize session keys needed for strategy composite FKs
ALTER TABLE "strategy_versions"
ADD COLUMN "analysisSessionId" TEXT;

UPDATE "strategy_versions" AS version
SET "analysisSessionId" = strategy."analysisSessionId"
FROM "strategies" AS strategy
WHERE strategy."id" = version."strategyId";

ALTER TABLE "strategy_versions"
ALTER COLUMN "analysisSessionId" SET NOT NULL;

ALTER TABLE "strategy_insights"
ADD COLUMN "analysisSessionId" TEXT,
ADD COLUMN "insightSnapshot" JSONB,
ADD COLUMN "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "strategy_insights" AS link
SET
    "analysisSessionId" = version."analysisSessionId",
    "insightSnapshot" = jsonb_build_object(
        'id', insight."id",
        'title', insight."title",
        'description', insight."description",
        'origin', insight."origin",
        'priority', insight."priority",
        'confidence', insight."confidence",
        'frequencyCount', insight."frequencyCount",
        'frequencyPct', insight."frequencyPct",
        'status', insight."status",
        'reviewedAt', insight."reviewedAt",
        'updatedAt', insight."updatedAt"
    )
FROM "strategy_versions" AS version, "insights" AS insight
WHERE version."id" = link."strategyVersionId"
  AND insight."id" = link."insightId";

ALTER TABLE "strategy_insights"
ALTER COLUMN "analysisSessionId" SET NOT NULL,
ALTER COLUMN "insightSnapshot" SET NOT NULL;

-- CreateTable: append-only Insight review history
CREATE TABLE "insight_review_logs" (
    "id" TEXT NOT NULL,
    "analysisSessionId" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,
    "action" "InsightReviewAction" NOT NULL,
    "fromStatus" "InsightStatus",
    "toStatus" "InsightStatus",
    "actorId" TEXT,
    "comment" TEXT,
    "beforeData" JSONB,
    "afterData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insight_review_logs_pkey" PRIMARY KEY ("id")
);

-- Replace single-column foreign keys with session-safe composite keys
ALTER TABLE "customer_feedbacks"
DROP CONSTRAINT "customer_feedbacks_duplicateOfId_fkey";

ALTER TABLE "insight_evidences"
DROP CONSTRAINT "insight_evidences_feedbackId_fkey";

ALTER TABLE "insight_evidences"
DROP CONSTRAINT "insight_evidences_insightId_fkey";

ALTER TABLE "strategies"
DROP CONSTRAINT "strategies_currentVersionId_fkey";

ALTER TABLE "strategy_insights"
DROP CONSTRAINT "strategy_insights_insightId_fkey";

ALTER TABLE "strategy_insights"
DROP CONSTRAINT "strategy_insights_strategyVersionId_fkey";

ALTER TABLE "strategy_versions"
DROP CONSTRAINT "strategy_versions_strategyId_fkey";

-- CreateIndexes
CREATE UNIQUE INDEX "customer_feedbacks_id_analysisSessionId_key"
ON "customer_feedbacks"("id", "analysisSessionId");

CREATE INDEX "feedback_analyses_feedbackId_createdAt_idx"
ON "feedback_analyses"("feedbackId", "createdAt");

CREATE UNIQUE INDEX "feedback_analyses_feedbackId_runNo_key"
ON "feedback_analyses"("feedbackId", "runNo");

CREATE UNIQUE INDEX "import_batches_id_dataSourceId_key"
ON "import_batches"("id", "dataSourceId");

CREATE INDEX "insight_evidences_analysisSessionId_idx"
ON "insight_evidences"("analysisSessionId");

CREATE UNIQUE INDEX "insights_id_analysisSessionId_key"
ON "insights"("id", "analysisSessionId");

CREATE INDEX "insight_review_logs_insightId_createdAt_idx"
ON "insight_review_logs"("insightId", "createdAt");

CREATE INDEX "insight_review_logs_analysisSessionId_createdAt_idx"
ON "insight_review_logs"("analysisSessionId", "createdAt");

CREATE INDEX "processing_jobs_dataSourceId_status_idx"
ON "processing_jobs"("dataSourceId", "status");

CREATE INDEX "processing_jobs_importBatchId_status_idx"
ON "processing_jobs"("importBatchId", "status");

CREATE UNIQUE INDEX "strategies_currentVersionId_id_key"
ON "strategies"("currentVersionId", "id");

CREATE UNIQUE INDEX "strategies_id_analysisSessionId_key"
ON "strategies"("id", "analysisSessionId");

CREATE INDEX "strategy_insights_analysisSessionId_idx"
ON "strategy_insights"("analysisSessionId");

CREATE INDEX "strategy_versions_analysisSessionId_idx"
ON "strategy_versions"("analysisSessionId");

CREATE UNIQUE INDEX "strategy_versions_id_strategyId_key"
ON "strategy_versions"("id", "strategyId");

CREATE UNIQUE INDEX "strategy_versions_id_analysisSessionId_key"
ON "strategy_versions"("id", "analysisSessionId");

-- AddForeignKeys
ALTER TABLE "customer_feedbacks"
ADD CONSTRAINT "customer_feedbacks_duplicateOfId_analysisSessionId_fkey"
FOREIGN KEY ("duplicateOfId", "analysisSessionId")
REFERENCES "customer_feedbacks"("id", "analysisSessionId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "processing_jobs"
ADD CONSTRAINT "processing_jobs_dataSourceId_analysisSessionId_fkey"
FOREIGN KEY ("dataSourceId", "analysisSessionId")
REFERENCES "data_sources"("id", "analysisSessionId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "processing_jobs"
ADD CONSTRAINT "processing_jobs_importBatchId_dataSourceId_fkey"
FOREIGN KEY ("importBatchId", "dataSourceId")
REFERENCES "import_batches"("id", "dataSourceId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "insight_evidences"
ADD CONSTRAINT "insight_evidences_insightId_analysisSessionId_fkey"
FOREIGN KEY ("insightId", "analysisSessionId")
REFERENCES "insights"("id", "analysisSessionId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "insight_evidences"
ADD CONSTRAINT "insight_evidences_feedbackId_analysisSessionId_fkey"
FOREIGN KEY ("feedbackId", "analysisSessionId")
REFERENCES "customer_feedbacks"("id", "analysisSessionId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "insight_review_logs"
ADD CONSTRAINT "insight_review_logs_insightId_analysisSessionId_fkey"
FOREIGN KEY ("insightId", "analysisSessionId")
REFERENCES "insights"("id", "analysisSessionId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "strategies"
ADD CONSTRAINT "strategies_currentVersionId_id_fkey"
FOREIGN KEY ("currentVersionId", "id")
REFERENCES "strategy_versions"("id", "strategyId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "strategy_versions"
ADD CONSTRAINT "strategy_versions_strategyId_analysisSessionId_fkey"
FOREIGN KEY ("strategyId", "analysisSessionId")
REFERENCES "strategies"("id", "analysisSessionId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "strategy_insights"
ADD CONSTRAINT "strategy_insights_strategyVersionId_analysisSessionId_fkey"
FOREIGN KEY ("strategyVersionId", "analysisSessionId")
REFERENCES "strategy_versions"("id", "analysisSessionId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "strategy_insights"
ADD CONSTRAINT "strategy_insights_insightId_analysisSessionId_fkey"
FOREIGN KEY ("insightId", "analysisSessionId")
REFERENCES "insights"("id", "analysisSessionId")
ON DELETE RESTRICT ON UPDATE CASCADE;
