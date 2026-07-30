/** Tên queue BullMQ — phải khớp giữa API (producer) và worker (consumer). */
export const QUEUE_NAMES = {
  DATA_PROCESSING: "data-processing",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** Tên job trong queue data-processing. */
export const JOB_NAMES = {
  DATA_NORMALIZATION: "DATA_NORMALIZATION",
  DEDUPLICATION: "DEDUPLICATION",
  AI_FEEDBACK_ANALYSIS: "AI_FEEDBACK_ANALYSIS",
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

export const JOB_PAYLOAD_VERSION = 1 as const;

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 200,
};
