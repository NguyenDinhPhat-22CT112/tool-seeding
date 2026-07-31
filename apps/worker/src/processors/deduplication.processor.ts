import { Processor, WorkerHost } from "@nestjs/bullmq";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue, Job } from "bullmq";
import { JobRepositoryService } from "../services/job-repository.service";

const DATA_PROCESSING_QUEUE = "data-processing";
const CHECK_CANCELLATION_EVERY = 10;

@Injectable()
@Processor(DATA_PROCESSING_QUEUE)
export class DeduplicationProcessor extends WorkerHost {
  private readonly logger = new Logger(DeduplicationProcessor.name);

  constructor(
    @InjectQueue(DATA_PROCESSING_QUEUE)
    private readonly queue: Queue,
    private readonly jobRepo: JobRepositoryService,
  ) {
    super();
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

    this.logger.log({ processingJobId, analysisSessionId }, "Deduplication started");

    await this.jobRepo.markRunning(processingJobId, job.id!);

    const feedbacks = await this.jobRepo.findNonDuplicateNormalizedFeedbacks(analysisSessionId);

    const groups = new Map<string, typeof feedbacks>();
    for (const fb of feedbacks) {
      const hash = fb.contentHash!;
      if (!groups.has(hash)) groups.set(hash, []);
      groups.get(hash)!.push(fb);
    }

    let duplicatesFound = 0;
    const total = groups.size;
    let processed = 0;

    for (const [, group] of groups) {
      processed++;
      if (group.length <= 1) continue;

      const original = group[0]!;
      for (let j = 1; j < group.length; j++) {
        const dup = group[j]!;
        await this.jobRepo.markDuplicate(dup.id, original.id);
        duplicatesFound++;
      }

      if (processed % CHECK_CANCELLATION_EVERY === 0) {
        const cancelled = await this.jobRepo.checkCancelled(processingJobId);
        if (cancelled) {
          this.logger.warn({ processingJobId }, "Deduplication cancelled by user");
          return;
        }
      }

      if (processed % 10 === 0 || processed === total) {
        await job.updateProgress(Math.round((processed / total) * 100));
      }
    }

    await this.jobRepo.markCompleted(processingJobId);
    await this.enqueueNext(analysisSessionId, organizationId, pipelineId!, "AI_FEEDBACK_ANALYSIS");

    this.logger.log({
      processingJobId, totalGroups: total, duplicatesFound, durationMs: Date.now() - startedAt,
    }, "Deduplication completed");
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
