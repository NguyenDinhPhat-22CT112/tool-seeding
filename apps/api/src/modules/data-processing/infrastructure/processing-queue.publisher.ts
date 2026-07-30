import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { JOB_NAMES, JOB_PAYLOAD_VERSION, QUEUE_NAMES } from "../../../shared/queues/queue.constants";
import type { EnqueueJobInput, ProcessingQueuePayload } from "../../../shared/queues/queue.types";
import type { JobType } from "../domain/processing-job.types";

const JOB_TYPE_TO_NAME: Record<string, string> = {
  DATA_NORMALIZATION: JOB_NAMES.DATA_NORMALIZATION,
  DEDUPLICATION: JOB_NAMES.DEDUPLICATION,
  AI_FEEDBACK_ANALYSIS: JOB_NAMES.AI_FEEDBACK_ANALYSIS,
};

@Injectable()
export class ProcessingQueuePublisher {
  constructor(
    @InjectQueue(QUEUE_NAMES.DATA_PROCESSING)
    private readonly queue: Queue<ProcessingQueuePayload>,
  ) {}

  async enqueue(input: EnqueueJobInput & { jobType: JobType }): Promise<string> {
    const jobName = JOB_TYPE_TO_NAME[input.jobType];
    if (!jobName) {
      throw new Error(`Unsupported job type for queue: ${input.jobType}`);
    }

    const payload: ProcessingQueuePayload = {
      version: JOB_PAYLOAD_VERSION,
      processingJobId: input.processingJobId,
      analysisSessionId: input.analysisSessionId,
      organizationId: input.organizationId,
      jobType: jobName as ProcessingQueuePayload["jobType"],
      pipelineId: input.pipelineId ?? null,
      triggeredBy: input.triggeredBy ?? null,
    };

    const job = await this.queue.add(jobName, payload, {
      jobId: input.processingJobId,
    });
    return job.id ?? input.processingJobId;
  }

  async remove(processingJobId: string): Promise<void> {
    const job = await this.queue.getJob(processingJobId);
    if (job) {
      const state = await job.getState();
      if (state === "waiting" || state === "delayed") {
        await job.remove();
      }
    }
  }
}
