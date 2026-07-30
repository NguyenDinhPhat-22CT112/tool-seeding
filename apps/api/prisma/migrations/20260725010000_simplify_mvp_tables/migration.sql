-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'REQUEST_REVISION';

-- DropForeignKey
ALTER TABLE "import_row_errors" DROP CONSTRAINT "import_row_errors_importBatchId_fkey";

-- DropForeignKey
ALTER TABLE "insight_approvals" DROP CONSTRAINT "insight_approvals_insightId_fkey";

-- DropForeignKey
ALTER TABLE "insight_approvals" DROP CONSTRAINT "insight_approvals_reviewedById_fkey";

-- DropForeignKey
ALTER TABLE "strategy_approvals" DROP CONSTRAINT "strategy_approvals_approvedById_fkey";

-- DropForeignKey
ALTER TABLE "strategy_approvals" DROP CONSTRAINT "strategy_approvals_strategyVersionId_fkey";

-- AlterTable
ALTER TABLE "import_batches" ADD COLUMN     "validationSummary" JSONB;

-- AlterTable
ALTER TABLE "insights" ADD COLUMN     "reviewComment" TEXT;

-- AlterTable
ALTER TABLE "strategy_versions" ADD COLUMN     "reviewComment" TEXT;

-- DropTable
DROP TABLE "import_row_errors";

-- DropTable
DROP TABLE "insight_approvals";

-- DropTable
DROP TABLE "strategy_approvals";

-- DropEnum
DROP TYPE "InsightApprovalAction";

-- DropEnum
DROP TYPE "StrategyApprovalAction";
