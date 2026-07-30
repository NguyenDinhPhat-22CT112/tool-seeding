import pino from "pino";

export type JobLogEvent =
  | "job.started"
  | "job.progress"
  | "job.completed"
  | "job.failed";

export interface JobLogContext {
  jobId: string;
  bullmqJobId?: string;
  jobType: string;
  sessionId?: string;
  organizationId?: string;
}

export interface JobLogFields extends JobLogContext {
  event: JobLogEvent;
  progress?: number;
  processedItems?: number;
  totalItems?: number;
  duration?: number;
  error?: string;
}

const isProduction = process.env.NODE_ENV === "production";

const baseLogger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  transport: isProduction
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, singleLine: true } },
});

/** Helper log cho worker processors — tự inject jobId, sessionId, organizationId (A3). */
export class JobLogger {
  private readonly logger: pino.Logger;

  constructor(private readonly context: JobLogContext) {
    this.logger = baseLogger.child({
      jobId: context.jobId,
      bullmqJobId: context.bullmqJobId,
      jobType: context.jobType,
      sessionId: context.sessionId,
      organizationId: context.organizationId,
    });
  }

  info(fields: Omit<JobLogFields, keyof JobLogContext>): void {
    this.logger.info(fields);
  }

  warn(fields: Omit<JobLogFields, keyof JobLogContext> & { message?: string }): void {
    this.logger.warn(fields);
  }

  error(fields: Omit<JobLogFields, keyof JobLogContext> & { message?: string }): void {
    this.logger.error(fields);
  }
}
