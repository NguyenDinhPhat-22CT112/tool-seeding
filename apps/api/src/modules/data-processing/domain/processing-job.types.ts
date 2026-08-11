import type { PaginatedResponse } from "@seeding/contracts";

export type JobType =
  | "DATA_NORMALIZATION"
  | "DEDUPLICATION"
  | "AI_FEEDBACK_ANALYSIS"
  | "REVIEW_CRAWLING"
  | "INSIGHT_GENERATION"
  | "STRATEGY_GENERATION"
  | "CONTENT_GENERATION";

export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export const PIPELINE_JOB_TYPES: JobType[] = [
  "DATA_NORMALIZATION",
  "DEDUPLICATION",
  "AI_FEEDBACK_ANALYSIS",
];

export interface ProcessingJobEntity {
  id: string;
  analysisSessionId: string;
  dataSourceId: string | null;
  importBatchId: string | null;
  jobType: JobType;
  bullmqJobId: string | null;
  status: JobStatus;
  progress: number;
  totalItems: number | null;
  processedItems: number | null;
  failedItems: number | null;
  payload: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateProcessingJobData = {
  analysisSessionId: string;
  jobType: JobType;
  dataSourceId?: string | null;
  importBatchId?: string | null;
  payload?: Record<string, unknown> | null;
  createdBy?: string | null;
  totalItems?: number | null;
};

export interface ListProcessingJobsFilter {
  analysisSessionId?: string;
  organizationId: string;
  status?: JobStatus;
  jobType?: JobType;
  page: number;
  pageSize: number;
}

export type Paginated<T> = PaginatedResponse<T>;

export interface ProcessingJobRepository {
  create(data: CreateProcessingJobData): Promise<ProcessingJobEntity>;

  findByIdInOrg(id: string, organizationId: string): Promise<ProcessingJobEntity | null>;

  findActiveBySession(
    analysisSessionId: string,
    organizationId: string,
    jobTypes?: JobType[],
  ): Promise<ProcessingJobEntity | null>;

  findActivePipelineJobs(
    analysisSessionId: string,
    organizationId: string,
  ): Promise<ProcessingJobEntity[]>;

  findByPipelineAndType(
    pipelineId: string,
    jobType: JobType,
  ): Promise<ProcessingJobEntity | null>;

  list(filter: ListProcessingJobsFilter): Promise<Paginated<ProcessingJobEntity>>;

  markRunning(id: string, bullmqJobId: string): Promise<ProcessingJobEntity | null>;

  updateProgress(
    id: string,
    progress: number,
    processedItems?: number | null,
    failedItems?: number | null,
  ): Promise<ProcessingJobEntity | null>;

  markCompleted(id: string): Promise<ProcessingJobEntity | null>;

  markFailed(id: string, errorMessage: string): Promise<ProcessingJobEntity | null>;

  markCancelled(id: string): Promise<ProcessingJobEntity | null>;

  resetForRetry(id: string): Promise<ProcessingJobEntity | null>;
}

export const PROCESSING_JOB_REPOSITORY = Symbol("PROCESSING_JOB_REPOSITORY");

/** Chuẩn hóa nội dung feedback — logic thuần domain. */
export function normalizeFeedbackContent(raw: string): string {
  return raw.trim().normalize("NFC").replace(/\s+/g, " ");
}
