-- DropForeignKey
ALTER TABLE "analysis_sessions" DROP CONSTRAINT "analysis_sessions_createdById_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actorId_fkey";

-- DropForeignKey
ALTER TABLE "businesses" DROP CONSTRAINT "businesses_createdById_fkey";

-- DropForeignKey
ALTER TABLE "data_sources" DROP CONSTRAINT "data_sources_createdById_fkey";

-- DropForeignKey
ALTER TABLE "import_batches" DROP CONSTRAINT "import_batches_createdById_fkey";

-- DropForeignKey
ALTER TABLE "insights" DROP CONSTRAINT "insights_createdById_fkey";

-- DropForeignKey
ALTER TABLE "insights" DROP CONSTRAINT "insights_reviewedById_fkey";

-- DropForeignKey
ALTER TABLE "processing_jobs" DROP CONSTRAINT "processing_jobs_createdById_fkey";

-- DropForeignKey
ALTER TABLE "strategies" DROP CONSTRAINT "strategies_createdById_fkey";

-- DropForeignKey
ALTER TABLE "strategy_versions" DROP CONSTRAINT "strategy_versions_approvedById_fkey";

-- DropForeignKey
ALTER TABLE "strategy_versions" DROP CONSTRAINT "strategy_versions_editedById_fkey";

-- DropForeignKey
ALTER TABLE "strategy_versions" DROP CONSTRAINT "strategy_versions_reviewedById_fkey";

-- DropIndex
DROP INDEX "analysis_sessions_createdById_idx";

-- DropIndex
DROP INDEX "businesses_createdById_idx";

-- DropIndex
DROP INDEX "data_sources_createdById_idx";

-- DropIndex
DROP INDEX "import_batches_createdById_idx";

-- DropIndex
DROP INDEX "insights_createdById_idx";

-- DropIndex
DROP INDEX "insights_reviewedById_idx";

-- DropIndex
DROP INDEX "processing_jobs_createdById_idx";

-- DropIndex
DROP INDEX "strategies_createdById_idx";

-- DropIndex
DROP INDEX "strategy_versions_approvedById_idx";

-- DropIndex
DROP INDEX "strategy_versions_editedById_idx";

-- DropIndex
DROP INDEX "strategy_versions_reviewedById_idx";

-- AlterTable
ALTER TABLE "analysis_sessions" RENAME COLUMN "createdById" TO "createdBy";
ALTER TABLE "analysis_sessions" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "analysis_sessions" ALTER COLUMN "createdBy" SET DEFAULT 'SYSTEM';

-- AlterTable
ALTER TABLE "businesses" RENAME COLUMN "createdById" TO "createdBy";
ALTER TABLE "businesses" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "businesses" ALTER COLUMN "createdBy" SET DEFAULT 'SYSTEM';

-- AlterTable
ALTER TABLE "data_sources" RENAME COLUMN "createdById" TO "createdBy";
ALTER TABLE "data_sources" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "data_sources" ALTER COLUMN "createdBy" SET DEFAULT 'SYSTEM';

-- AlterTable
ALTER TABLE "import_batches" RENAME COLUMN "createdById" TO "createdBy";
ALTER TABLE "import_batches" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "import_batches" ALTER COLUMN "createdBy" SET DEFAULT 'SYSTEM';

-- AlterTable
ALTER TABLE "insights" RENAME COLUMN "createdById" TO "createdBy";
ALTER TABLE "insights" RENAME COLUMN "reviewedById" TO "reviewedBy";
ALTER TABLE "insights" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "insights" ALTER COLUMN "createdBy" SET DEFAULT 'SYSTEM';

-- AlterTable
ALTER TABLE "processing_jobs" RENAME COLUMN "createdById" TO "createdBy";
ALTER TABLE "processing_jobs" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "processing_jobs" ALTER COLUMN "createdBy" SET DEFAULT 'SYSTEM';

-- AlterTable
ALTER TABLE "strategies" RENAME COLUMN "createdById" TO "createdBy";
ALTER TABLE "strategies" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "strategies" ALTER COLUMN "createdBy" SET DEFAULT 'SYSTEM';

-- AlterTable
ALTER TABLE "strategy_versions" RENAME COLUMN "approvedById" TO "approvedBy";
ALTER TABLE "strategy_versions" RENAME COLUMN "editedById" TO "editedBy";
ALTER TABLE "strategy_versions" RENAME COLUMN "reviewedById" TO "reviewedBy";

-- DropTable
DROP TABLE "audit_logs";

-- DropEnum
DROP TYPE "AuditAction";
