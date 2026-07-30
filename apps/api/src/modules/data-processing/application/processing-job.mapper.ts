import { ProcessingJobEntity } from "../domain/processing-job.types";

export interface ProcessingJobResponse {
  id: string;
  analysisSessionId: string;
  dataSourceId: string | null;
  importBatchId: string | null;
  jobType: ProcessingJobEntity["jobType"];
  bullmqJobId: string | null;
  status: ProcessingJobEntity["status"];
  progress: number;
  totalItems: number | null;
  processedItems: number | null;
  failedItems: number | null;
  payload: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TriggerProcessResponse {
  pipelineId: string;
  idempotent: boolean;
  jobs: ProcessingJobResponse[];
}

export class ProcessingJobMapper {
  static toResponse(entity: ProcessingJobEntity): ProcessingJobResponse {
    return {
      id: entity.id,
      analysisSessionId: entity.analysisSessionId,
      dataSourceId: entity.dataSourceId,
      importBatchId: entity.importBatchId,
      jobType: entity.jobType,
      bullmqJobId: entity.bullmqJobId,
      status: entity.status,
      progress: entity.progress,
      totalItems: entity.totalItems,
      processedItems: entity.processedItems,
      failedItems: entity.failedItems,
      payload: entity.payload,
      errorMessage: entity.errorMessage,
      startedAt: entity.startedAt?.toISOString() ?? null,
      completedAt: entity.completedAt?.toISOString() ?? null,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
