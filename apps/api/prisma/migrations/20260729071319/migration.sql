-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "analysisSessionId" TEXT,
    "organizationId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_usage_logs_analysisSessionId_idx" ON "ai_usage_logs"("analysisSessionId");

-- CreateIndex
CREATE INDEX "ai_usage_logs_organizationId_idx" ON "ai_usage_logs"("organizationId");

-- CreateIndex
CREATE INDEX "ai_usage_logs_provider_model_idx" ON "ai_usage_logs"("provider", "model");

-- CreateIndex
CREATE INDEX "ai_usage_logs_requestedAt_idx" ON "ai_usage_logs"("requestedAt");
