import { Injectable } from "@nestjs/common";
import { PrismaService } from "@seeding/database";
import type { FeedbackProcessingStatus } from "@seeding/contracts";

@Injectable()
export class JobRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Session ──

  async findSession(sessionId: string) {
    return this.prisma.analysisSession.findUnique({
      where: { id: sessionId },
      include: { business: true },
    });
  }

  async transitionSession(
    sessionId: string,
    fromStatus: string,
    toStatus: string,
  ): Promise<boolean> {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
    const where: any = { id: sessionId, status: fromStatus };
    const data: any = { status: toStatus };
    const result = await this.prisma.analysisSession.updateMany({ where, data });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
    return result.count > 0;
  }

  // ── Feedback ──

  async findFeedbacksByStatus(
    analysisSessionId: string,
    statuses: FeedbackProcessingStatus[],
  ) {
    return this.prisma.customerFeedback.findMany({
      where: { analysisSessionId, processingStatus: { in: statuses } },
    });
  }

  async findFeedbacksToAnalyze(analysisSessionId: string) {
    return this.prisma.customerFeedback.findMany({
      where: {
        analysisSessionId,
        processingStatus: { in: ["RAW", "NORMALIZED"] },
        duplicateOfId: null,
      },
    });
  }

  async findNonDuplicateNormalizedFeedbacks(analysisSessionId: string) {
    return this.prisma.customerFeedback.findMany({
      where: {
        analysisSessionId,
        processingStatus: "NORMALIZED",
        contentHash: { not: null },
        duplicateOfId: null,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async normalizeFeedback(
    id: string,
    normalizedContent: string,
    contentHash: string,
  ): Promise<void> {
    await this.prisma.customerFeedback.update({
      where: { id },
      data: { normalizedContent, contentHash, processingStatus: "NORMALIZED" },
    });
  }

  async markDuplicate(id: string, originalId: string): Promise<void> {
    await this.prisma.customerFeedback.update({
      where: { id },
      data: { processingStatus: "DUPLICATE", duplicateOfId: originalId },
    });
  }

  // ── Analysis ──

  async nextRunNo(feedbackId: string): Promise<number> {
    const last = await this.prisma.feedbackAnalysis.findFirst({
      where: { feedbackId },
      orderBy: { runNo: "desc" },
      select: { runNo: true },
    });
    return (last?.runNo ?? 0) + 1;
  }

  async createAnalysis(data: {
    feedbackId: string;
    runNo: number;
    status: "COMPLETED" | "FAILED" | "PENDING" | "PROCESSING" | "NEEDS_RETRY";
    sentiment?: string | null;
    sentimentScore?: number | null;
    topics?: string[];
    painPoints?: string[];
    questions?: string[];
    priority?: number | null;
    confidence?: number | null;
    evidence?: Array<{ text: string; relevance: number }>;
    aiModel?: string | null;
    promptVersion?: string | null;
    rawResponse?: unknown;
    errorMessage?: string | null;
    analyzedAt?: Date | null;
  }) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    return this.prisma.feedbackAnalysis.create({ data: data as any });
  }

  // ── Usage Logging ──

  async createUsageLog(data: {
    analysisSessionId: string | null;
    organizationId: string;
    jobType: string;
    provider: string;
    model: string;
    promptVersion: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
    durationMs: number;
    status: string;
    errorMessage?: string | null;
    requestedAt: Date;
    completedAt: Date | null;
  }) {
    return this.prisma.aIUsageLog.create({ data });
  }

  // ── Processing Job ──

  async markRunning(id: string, bullmqJobId: string): Promise<void> {
    await this.prisma.processingJob.update({
      where: { id },
      data: { status: "RUNNING", bullmqJobId, startedAt: new Date() },
    });
  }

  async markCompleted(id: string): Promise<void> {
    await this.prisma.processingJob.update({
      where: { id },
      data: { status: "COMPLETED", progress: 100, completedAt: new Date() },
    });
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.prisma.processingJob.update({
      where: { id },
      data: { status: "FAILED", errorMessage, completedAt: new Date() },
    });
  }

  async checkCancelled(id: string): Promise<boolean> {
    const row = await this.prisma.processingJob.findUnique({
      where: { id },
      select: { status: true },
    });
    return row?.status === "CANCELLED";
  }

  async findPipelineJob(
    analysisSessionId: string,
    pipelineId: string,
    jobType: string,
  ) {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
    const where: any = {
      analysisSessionId,
      jobType: jobType,
      payload: { path: ["pipelineId"], equals: pipelineId },
    };
    const result = this.prisma.processingJob.findFirst({ where });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
    return result;
  }
}
