-- AlterTable
ALTER TABLE "strategy_versions" ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

-- CreateIndex
CREATE INDEX "strategy_versions_reviewedById_idx" ON "strategy_versions"("reviewedById");

-- AddForeignKey
ALTER TABLE "strategy_versions" ADD CONSTRAINT "strategy_versions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
