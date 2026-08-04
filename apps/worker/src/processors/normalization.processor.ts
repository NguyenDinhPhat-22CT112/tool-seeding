import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue, Job } from "bullmq";
import { createHash } from "node:crypto";
import { JobRepositoryService } from "../services/job-repository.service";
import { globalFileLogger } from "../common/file-logger";

const DATA_PROCESSING_QUEUE = "data-processing";
const CHECK_CANCELLATION_EVERY = 10;

@Injectable()
export class NormalizationProcessor {
  private readonly logger = new Logger(NormalizationProcessor.name);

  constructor(
    @InjectQueue(DATA_PROCESSING_QUEUE)
    private readonly queue: Queue,
    private readonly jobRepo: JobRepositoryService,
  ) {
    this.logger.log("NormalizationProcessor initialized");
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

    const { processingJobId, analysisSessionId, organizationId, pipelineId } = data;
    const startedAt = Date.now();

    await globalFileLogger.log("INFO", "NormalizationProcessor.process called", {
      processingJobId,
      analysisSessionId,
      organizationId,
      jobType: data.jobType,
      bullmqJobId: job.id,
    });

    this.logger.log({ processingJobId, analysisSessionId }, "Normalization started");

    await this.jobRepo.markRunning(processingJobId, job.id!);

    const feedbacks = await this.jobRepo.findFeedbacksByStatus(analysisSessionId, ["RAW"]);

    const total = feedbacks.length;
    this.logger.log({ total, analysisSessionId }, "Normalizing feedbacks");

    for (const [i, fb] of feedbacks.entries()) {
      const content = fb.rawContent;
      const normalized = content.trim().normalize("NFC").replace(/\s+/g, " ");
      const contentHash = createHash("sha256").update(normalized).digest("hex");

      await this.jobRepo.normalizeFeedback(fb.id, normalized, contentHash);

      if (i % CHECK_CANCELLATION_EVERY === 0) {
        const cancelled = await this.jobRepo.checkCancelled(processingJobId);
        if (cancelled) {
          this.logger.warn({ processingJobId }, "Normalization cancelled by user");
          return;
        }
      }

      if (i % 10 === 0 || i === total - 1) {
        const progress = total > 0 ? Math.round(((i + 1) / total) * 100) : 100;
        await job.updateProgress(progress);
      }
    }

    await this.jobRepo.markCompleted(processingJobId);
    await this.enqueueNext(analysisSessionId, organizationId, pipelineId!, "DEDUPLICATION");

    const durationMs = Date.now() - startedAt;
    await globalFileLogger.log("INFO", "NormalizationProcessor completed", {
      processingJobId,
      total,
      durationMs,
    });

    this.logger.log({
      processingJobId, total, durationMs,
    }, "Normalization completed");
  }

  private async enqueueNext(
    analysisSessionId: string,
    organizationId: string,
    pipelineId: string,
    nextJobType: string,
  ): Promise<void> {
    const nextJob = await this.jobRepo.findPipelineJob(analysisSessionId, pipelineId, nextJobType);

    if (!nextJob) {
      this.logger.warn({ analysisSessionId, nextJobType }, "Next pipeline job not found");
      return;
    }

    await this.queue.add(nextJobType, {
      version: 1,
      processingJobId: nextJob.id,
      analysisSessionId,
      organizationId,
      jobType: nextJobType,
      pipelineId,
    }, { jobId: nextJob.id });

    this.logger.log({ nextJobId: nextJob.id, nextJobType }, "Enqueued next pipeline job");
  }
}
