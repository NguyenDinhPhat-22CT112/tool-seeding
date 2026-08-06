import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { AiAnalysisService } from "../services/ai-analysis.service";
import { JobRepositoryService } from "../services/job-repository.service";
import { globalFileLogger } from "../common/file-logger";

const CHECK_CANCELLATION_EVERY = 5;

@Injectable()
export class FeedbackAnalysisProcessor {
  private readonly logger = new Logger(FeedbackAnalysisProcessor.name);

  constructor(
    private readonly aiAnalysis: AiAnalysisService,
    private readonly jobRepo: JobRepositoryService,
  ) {
    this.logger.log("FeedbackAnalysisProcessor initialized");
  }

  async process(job: Job): Promise<void> {
    const data = job.data as {
      version: number;
      processingJobId: string;
      analysisSessionId: string;
      organizationId: string;
      jobType: string;
      pipelineId?: string | null;
      sampleLimit?: number | null;
    };

    const { processingJobId, analysisSessionId, organizationId } = data;
    const startedAt = Date.now();

    await globalFileLogger.log("INFO", "FeedbackAnalysisProcessor.process called", {
      processingJobId,
      analysisSessionId,
      organizationId,
      jobType: data.jobType,
      bullmqJobId: job.id,
    });

    this.logger.log({ processingJobId, analysisSessionId }, "AI feedback analysis started");

    await this.jobRepo.markRunning(processingJobId, job.id!);

    const session = await this.jobRepo.findSession(analysisSessionId);
    if (!session) {
      await this.jobRepo.markFailed(processingJobId, "Session not found");
      return;
    }

    const feedbacks = await this.jobRepo.findFeedbacksToAnalyze(
      analysisSessionId,
      data.sampleLimit,
    );

    const total = feedbacks.length;
    this.logger.log({ total, analysisSessionId }, "Analyzing feedbacks with AI");

    let processedCount = 0;
    let failedCount = 0;

    for (const [i, fb] of feedbacks.entries()) {
      const callStarted = Date.now();
      const content = fb.normalizedContent ?? fb.rawContent;

      try {
        const result = await this.aiAnalysis.analyzeFeedback({
          feedbackId: fb.id,
          content,
          businessName: session.business.name,
          industry: session.business.industry,
          objective: session.objective,
        });

        const runNo = await this.jobRepo.nextRunNo(fb.id);
        const durationMs = Date.now() - callStarted;

        await this.jobRepo.createAnalysis({
          feedbackId: fb.id,
          runNo,
          status: "COMPLETED",
          sentiment: result.output.sentiment,
          sentimentScore: result.output.sentimentScore ?? null,
          topics: result.output.topics,
          painPoints: result.output.painPoints,
          questions: result.output.questions,
          priority: result.output.priority,
          confidence: result.output.confidence,
          evidence: result.output.evidence,
          aiModel: result.model,
          promptVersion: result.promptVersion,
          rawResponse: result.rawResponse ?? undefined,
          analyzedAt: new Date(),
        });

        await this.jobRepo.createUsageLog({
          analysisSessionId,
          organizationId,
          jobType: "AI_FEEDBACK_ANALYSIS",
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

        processedCount++;
      } catch (err) {
        failedCount++;
        this.logger.warn({ feedbackId: fb.id, error: (err as Error).message }, "AI analysis failed for feedback");

        const runNo = await this.jobRepo.nextRunNo(fb.id);
        await this.jobRepo.createAnalysis({
          feedbackId: fb.id,
          runNo,
          status: "FAILED",
          errorMessage: (err as Error).message,
        });
      }

      if (i % CHECK_CANCELLATION_EVERY === 0) {
        const cancelled = await this.jobRepo.checkCancelled(processingJobId);
        if (cancelled) {
          this.logger.warn({ processingJobId }, "AI analysis cancelled by user");
          return;
        }
      }

      if (i % 10 === 0 || i === total - 1) {
        const progress = total > 0 ? Math.round(((i + 1) / total) * 100) : 100;
        await job.updateProgress(progress);
        await this.jobRepo.updateProgress(processingJobId, progress);
      }
    }

    await this.jobRepo.markCompleted(processingJobId);
    await this.jobRepo.transitionSession(analysisSessionId, "PROCESSING", "ANALYZING");

    const durationMs = Date.now() - startedAt;
    await globalFileLogger.log("INFO", "FeedbackAnalysisProcessor completed", {
      processingJobId,
      total,
      processedCount,
      failedCount,
      durationMs,
    });

    this.logger.log({
      processingJobId, total, processedCount, failedCount, durationMs,
    }, "AI feedback analysis completed");
  }
}
