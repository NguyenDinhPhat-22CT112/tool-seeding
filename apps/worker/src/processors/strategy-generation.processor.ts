import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { AiAnalysisService } from "../services/ai-analysis.service";
import { JobRepositoryService } from "../services/job-repository.service";
import { globalFileLogger } from "../common/file-logger";

@Injectable()
export class StrategyGenerationProcessor {
  private readonly logger = new Logger(StrategyGenerationProcessor.name);

  constructor(
    private readonly aiAnalysis: AiAnalysisService,
    private readonly jobRepo: JobRepositoryService,
  ) {
    this.logger.log("StrategyGenerationProcessor initialized");
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

    await globalFileLogger.log("INFO", "StrategyGenerationProcessor.process called", {
      processingJobId,
      analysisSessionId,
      organizationId,
      bullmqJobId: job.id,
    });

    this.logger.log({ processingJobId, analysisSessionId }, "AI strategy generation started");

    await this.jobRepo.markRunning(processingJobId, job.id!);

    const session = await this.jobRepo.findSession(analysisSessionId);
    if (!session) {
      await this.jobRepo.markFailed(processingJobId, "Session not found");
      return;
    }

    const insights = await this.jobRepo.findApprovedInsights(analysisSessionId);
    if (insights.length === 0) {
      await this.jobRepo.markFailed(processingJobId, "No approved insights found");
      return;
    }

    const callStarted = Date.now();
    try {
      const result = await this.aiAnalysis.generateStrategy({
        businessName: session.business.name,
        objective: session.objective,
        insights: insights.map((ins) => ({
          id: ins.id,
          title: ins.title,
          description: ins.description,
          priority: ins.priority,
          confidence: ins.confidence,
          frequencyPct: ins.frequencyPct,
          status: ins.status,
        })),
      });

      const durationMs = Date.now() - callStarted;

      const created = await this.jobRepo.createStrategyFromGeneration({
        analysisSessionId,
        output: result.output,
        aiModel: result.model,
        promptVersion: result.promptVersion,
        insightIds: insights.map((ins) => ins.id),
      });

      await this.jobRepo.createUsageLog({
        analysisSessionId,
        organizationId,
        jobType: "STRATEGY_GENERATION",
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
      await this.jobRepo.transitionSession(analysisSessionId, "INSIGHT_REVIEW", "STRATEGY_BUILDING");

      await globalFileLogger.log("INFO", "StrategyGenerationProcessor completed", {
        processingJobId,
        strategyVersionId: created,
        durationMs,
      });
      this.logger.log({ processingJobId, strategyVersionId: created, durationMs }, "AI strategy generation completed");
    } catch (err) {
      const message = (err as Error).message;
      await this.jobRepo.markFailed(processingJobId, message);
      await this.jobRepo.createUsageLog({
        analysisSessionId,
        organizationId,
        jobType: "STRATEGY_GENERATION",
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
      this.logger.error({ processingJobId, error: message }, "AI strategy generation failed");
    }
  }
}
