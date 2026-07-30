import type { JobName } from "./queue.constants";

/** Payload chuẩn cho mọi job xử lý dữ liệu — có version để migrate an toàn. */
export interface ProcessingQueuePayload {
  version: 1;
  processingJobId: string;
  analysisSessionId: string;
  organizationId: string;
  jobType: JobName;
  pipelineId?: string | null;
  triggeredBy?: string | null;
}

export interface EnqueueJobInput {
  processingJobId: string;
  analysisSessionId: string;
  organizationId: string;
  jobType: JobName;
  pipelineId?: string | null;
  triggeredBy?: string | null;
}
