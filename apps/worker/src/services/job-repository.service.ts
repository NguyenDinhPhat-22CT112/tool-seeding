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

  // ── Review Crawl ──

  async findCrawlJob(processingJobId: string) {
    return this.prisma.processingJob.findUnique({
      where: { id: processingJobId },
      select: {
        id: true,
        analysisSessionId: true,
        dataSourceId: true,
        payload: true,
      },
    });
  }

  async findDataSource(dataSourceId: string) {
    return this.prisma.dataSource.findUnique({
      where: { id: dataSourceId },
      select: {
        id: true,
        analysisSessionId: true,
        businessId: true,
        businessLocationId: true,
      },
    });
  }

  /**
   * Ghi review đã crawl vào CustomerFeedback (RAW) và tăng totalRecords/validRecords
   * trên DataSource trong CÙNG transaction — atomic, không thể lệch count với dữ liệu.
   * Skip duplicates theo @@unique([dataSourceId, externalId]).
   */
  async insertCrawledReviews(data: {
    analysisSessionId: string;
    dataSourceId: string;
    reviews: Array<{
      externalId: string;
      rawContent: string;
      contentHash: string;
      reviewerName: string | null;
      rating: number | null;
      publishedAt: Date | null;
    }>;
  }): Promise<number> {
    let inserted = 0;
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.customerFeedback.createMany({
        data: data.reviews.map((review) => ({
          analysisSessionId: data.analysisSessionId,
          dataSourceId: data.dataSourceId,
          externalId: review.externalId,
          contentHash: review.contentHash,
          rawContent: review.rawContent,
          reviewerName: review.reviewerName,
          rating: review.rating,
          publishedAt: review.publishedAt,
          processingStatus: "RAW",
        })),
        skipDuplicates: true,
      });
      inserted = result.count;
      if (inserted > 0) {
        await tx.dataSource.update({
          where: { id: data.dataSourceId },
          data: {
            totalRecords: { increment: inserted },
            validRecords: { increment: inserted },
          },
        });
      }
    });
    return inserted;
  }

  async markDataSourceStatus(dataSourceId: string, status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"): Promise<void> {
    await this.prisma.dataSource.update({
      where: { id: dataSourceId },
      data: { status },
    });
  }

  async updateCrawlJobPayload(processingJobId: string, payload: Record<string, unknown>): Promise<void> {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
    await this.prisma.processingJob.update({
      where: { id: processingJobId },
      data: { payload: payload as any },
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
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

  async findFeedbacksToAnalyze(analysisSessionId: string, limit?: number | null) {
    return this.prisma.customerFeedback.findMany({
      where: {
        analysisSessionId,
        processingStatus: { in: ["RAW", "NORMALIZED"] },
        duplicateOfId: null,
      },
      orderBy: { createdAt: "asc" },
      ...(limit && limit > 0 ? { take: Math.floor(limit) } : {}),
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

  // ── Insight Generation ──

  async findCompletedAnalyses(analysisSessionId: string) {
    return this.prisma.feedbackAnalysis.findMany({
      where: {
        feedback: { analysisSessionId },
        status: "COMPLETED",
      },
      include: { feedback: true },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Lưu insights do AI sinh: tạo Insight + InsightEvidence (nếu có feedbackId
   * khớp trong session) trong CÙNG transaction.
   */
  async createInsightsFromGeneration(data: {
    analysisSessionId: string;
    insights: Array<{
      title: string;
      description: string;
      priority: number;
      confidence: number;
      origin?: "OBSERVED" | "INFERRED" | "ASSUMED";
      frequencyCount?: number;
      frequencyPct?: number;
      evidence?: Array<{ feedbackId: string; excerpt: string; relevance: number }>;
    }>;
    aiModel: string;
    promptVersion: string;
    createdBy?: string;
  }): Promise<number> {
    const session = await this.prisma.analysisSession.findUnique({
      where: { id: data.analysisSessionId },
      select: { id: true },
    });
    if (!session) return 0;

    let count = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const ins of data.insights) {
        const created = await tx.insight.create({
          data: {
            analysisSessionId: data.analysisSessionId,
            title: ins.title,
            description: ins.description,
            origin: ins.origin ?? "INFERRED",
            priority: ins.priority,
            confidence: ins.confidence,
            frequencyCount: ins.frequencyCount ?? 0,
            frequencyPct: ins.frequencyPct ?? 0,
            status: "WAITING_REVIEW",
            createdBy: data.createdBy ?? "SYSTEM",
          },
        });
        count++;

        const evidence = (ins.evidence ?? []).filter((e) => e.feedbackId && e.excerpt);
        for (const ev of evidence) {
          const fb = await tx.customerFeedback.findUnique({
            where: { id: ev.feedbackId, analysisSessionId: data.analysisSessionId },
            select: { id: true },
          });
          if (!fb) continue;
          await tx.insightEvidence.create({
            data: {
              analysisSessionId: data.analysisSessionId,
              insightId: created.id,
              feedbackId: ev.feedbackId,
              excerpt: ev.excerpt,
              relevance: ev.relevance,
            },
          });
        }
      }
    });
    return count;
  }

  // ── Strategy Generation ──

  async findApprovedInsights(analysisSessionId: string) {
    return this.prisma.insight.findMany({
      where: { analysisSessionId, status: "APPROVED", archivedAt: null },
      orderBy: { priority: "desc" },
    });
  }

  /**
   * Lưu chiến lược do AI sinh: nếu session CHƯA có container Strategy thì tạo mới
   * (Strategy + StrategyVersion versionNo=1); nếu đã có thì đánh mọi version đang
   * "sống" (chưa ARCHIVED) thành SUPERSEDED rồi tạo version mới với versionNo = max+1
   * và trỏ currentVersionId sang version mới. Tạo StrategyInsight cho từng insight
   * đã duyệt, trong CÙNG transaction.
   */
  async createStrategyFromGeneration(data: {
    analysisSessionId: string;
    output: {
      context?: string | null;
      objectives: string[];
      targetSegments: Array<{ segment: string; description: string }>;
      priorityProblems: string[];
      mainMessages: string[];
      responsePrinciples: string[];
      contentThemes: Array<{ theme: string; description: string; examples?: string }>;
      risks: string[];
      kpis: Array<{ metric: string; target: string }>;
    };
    aiModel: string;
    promptVersion: string;
    insightIds: string[];
  }): Promise<string> {
    const session = await this.prisma.analysisSession.findUnique({
      where: { id: data.analysisSessionId },
      select: { id: true, business: { select: { name: true } } },
    });
    if (!session) throw new Error("Session not found");

    let versionId = "";
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.strategy.findFirst({
        where: { analysisSessionId: data.analysisSessionId },
      });

      let strategyId = existing?.id;
      let versionNo = 1;
      if (existing) {
        const aggregate = await tx.strategyVersion.aggregate({
          where: { strategyId: existing.id },
          _max: { versionNo: true },
        });
        versionNo = (aggregate._max.versionNo ?? 0) + 1;
        await tx.strategyVersion.updateMany({
          where: { strategyId: existing.id, status: { not: "ARCHIVED" } },
          data: { status: "SUPERSEDED" },
        });
      } else {
        const strategy = await tx.strategy.create({
          data: {
            analysisSessionId: data.analysisSessionId,
            name: `Chiến lược ${session.business.name}`,
            createdBy: "SYSTEM",
          },
        });
        strategyId = strategy.id;
      }

      const version = await tx.strategyVersion.create({
        data: {
          strategyId: strategyId!,
          analysisSessionId: data.analysisSessionId,
          versionNo,
          status: "AI_DRAFT",
          context: data.output.context ?? null,
          objectives: data.output.objectives ?? [],
          targetSegments: data.output.targetSegments ?? [],
          priorityProblems: data.output.priorityProblems ?? [],
          mainMessages: data.output.mainMessages ?? [],
          responsePrinciples: data.output.responsePrinciples ?? [],
          contentThemes: data.output.contentThemes ?? [],
          risks: data.output.risks ?? [],
          kpis: data.output.kpis ?? [],
          aiModel: data.aiModel,
          promptVersion: data.promptVersion,
        },
      });
      versionId = version.id;

      await tx.strategy.update({
        where: { id: strategyId! },
        data: { currentVersionId: version.id },
      });

      let orderIndex = 0;
      for (const insightId of data.insightIds) {
        const insight = await tx.insight.findUnique({
          where: { id: insightId, analysisSessionId: data.analysisSessionId },
          select: { id: true, title: true, description: true, priority: true, confidence: true },
        });
        if (!insight) continue;
        await tx.strategyInsight.create({
          data: {
            analysisSessionId: data.analysisSessionId,
            strategyVersionId: version.id,
            insightId: insight.id,
            insightSnapshot: {
              title: insight.title,
              description: insight.description,
              priority: insight.priority,
              confidence: insight.confidence,
            },
            orderIndex: orderIndex++,
          },
        });
      }
    });
    return versionId;
  }

  // ── Content Generation ──

  /** Load session + chiến lược version + hồ sơ doanh nghiệp để render prompt content. */
  async findContentGenerationContext(aiGenerationId: string) {
    return this.prisma.aIGeneration.findUnique({
      where: { id: aiGenerationId },
      include: {
        promptTemplate: true,
        strategyVersion: true,
        content: {
          include: { currentVersion: true },
        },
        analysisSession: {
          include: {
            business: true,
          },
        },
      },
    });
  }

  /** Ghi kết quả AI candidates vào AIGeneration (COMPLETED) + lưu promptRendered/model. */
  async completeAIGeneration(data: {
    aiGenerationId: string;
    promptRendered: string;
    aiProvider: string;
    aiModel: string;
    promptVersion: string;
    candidates: Array<{ variantIndex: number; title: string; body: string }>;
    rawResponse: unknown;
  }): Promise<void> {
    await this.prisma.aIGeneration.update({
      where: { id: data.aiGenerationId },
      data: {
        status: "COMPLETED",
        promptRendered: data.promptRendered,
        aiProvider: data.aiProvider,
        aiModel: data.aiModel,
        promptVersion: data.promptVersion,
        candidates: data.candidates,
        rawResponse: data.rawResponse as object,
      },
    });
  }

  async markAIGenerationFailed(aiGenerationId: string): Promise<void> {
    await this.prisma.aIGeneration.update({
      where: { id: aiGenerationId },
      data: { status: "FAILED" },
    });
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

  async updateProgress(id: string, progress: number): Promise<void> {
    await this.prisma.processingJob.update({
      where: { id },
      data: { progress },
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
