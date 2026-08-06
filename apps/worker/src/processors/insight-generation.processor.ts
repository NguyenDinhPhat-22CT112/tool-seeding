import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { AiAnalysisService } from "../services/ai-analysis.service";
import { JobRepositoryService } from "../services/job-repository.service";
import { globalFileLogger } from "../common/file-logger";

const CHECK_CANCELLATION_EVERY = 5;
const MAX_CONTENT_CHARS = 300;

@Injectable()
export class InsightGenerationProcessor {
  private readonly logger = new Logger(InsightGenerationProcessor.name);

  constructor(
    private readonly aiAnalysis: AiAnalysisService,
    private readonly jobRepo: JobRepositoryService,
  ) {
    this.logger.log("InsightGenerationProcessor initialized");
  }

  async process(job: Job): Promise<void> {
    const data = job.data as {
      version: number;
      processingJobId: string;
      analysisSessionId: string;
      organizationId: string;
      jobType: string;
      pipelineId?: string | null;
    };

    const { processingJobId, analysisSessionId, organizationId } = data;
    const startedAt = Date.now();

    await globalFileLogger.log("INFO", "InsightGenerationProcessor.process called", {
      processingJobId,
      analysisSessionId,
      organizationId,
      bullmqJobId: job.id,
    });

    this.logger.log({ processingJobId, analysisSessionId }, "AI insight generation started");

    await this.jobRepo.markRunning(processingJobId, job.id!);

    const session = await this.jobRepo.findSession(analysisSessionId);
    if (!session) {
      await this.jobRepo.markFailed(processingJobId, "Session not found");
      return;
    }

    const analyses = await this.jobRepo.findCompletedAnalyses(analysisSessionId);
    if (analyses.length === 0) {
      await this.jobRepo.markFailed(processingJobId, "No completed feedback analyses found");
      return;
    }

    const callStarted = Date.now();
    try {
      const result = await this.aiAnalysis.generateInsights({
        businessName: session.business.name,
        industry: session.business.industry,
        objective: session.objective,
        analyses: analyses.map((a) => ({
          feedbackId: a.feedbackId,
          content: (a.feedback.normalizedContent ?? a.feedback.rawContent).slice(0, MAX_CONTENT_CHARS),
          sentiment: a.sentiment,
          sentimentScore: a.sentimentScore,
          topics: (a.topics as string[]) ?? [],
          painPoints: (a.painPoints as string[]) ?? [],
          questions: (a.questions as string[]) ?? [],
          priority: a.priority,
          confidence: a.confidence,
        })),
      });

      const durationMs = Date.now() - callStarted;

      const created = await this.jobRepo.createInsightsFromGeneration({
        analysisSessionId,
        insights: result.output.insights,
        aiModel: result.model,
        promptVersion: result.promptVersion,
        createdBy: "SYSTEM",
      });

      await this.jobRepo.createUsageLog({
        analysisSessionId,
        organizationId,
        jobType: "INSIGHT_GENERATION",
        provider: result.provider,
        model: result.model,
        promptVersion: result.promptVersion,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
        estimatedCost: 0,
        durationMs,
        status: "success",
        requestedAt: new Date(callStarted),
        completedAt: new Date(),
      });

      await this.jobRepo.markCompleted(processingJobId);
      await this.jobRepo.transitionSession(analysisSessionId, "ANALYZING", "INSIGHT_REVIEW");

      await globalFileLogger.log("INFO", "InsightGenerationProcessor completed", {
        processingJobId,
        insightCount: created,
        durationMs,
      });
      this.logger.log({ processingJobId, insightCount: created, durationMs }, "AI insight generation completed");
    } catch (err) {
      const message = (err as Error).message;
      await this.jobRepo.markFailed(processingJobId, message);
      await this.jobRepo.createUsageLog({
        analysisSessionId,
        organizationId,
        jobType: "INSIGHT_GENERATION",
        provider: "unknown",
        model: "unknown",
        promptVersion: "v1",
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        durationMs: Date.now() - callStarted,
        status: "failed",
        errorMessage: message,
        requestedAt: new Date(callStarted),
        completedAt: new Date(),
      });
      this.logger.error({ processingJobId, error: message }, "AI insight generation failed");
    }
  }
}
