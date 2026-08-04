// Barrel types: kết hợp @seeding/contracts + các shape chỉ tồn tại ở tầng API (mapper).

import type {
  DataSourceResponse,
  ImportBatchResponse,
  OrgRole,
} from "@seeding/contracts";

export * from "@seeding/contracts";

export type { OrgRole } from "@seeding/contracts";

export interface AuthContext {
  organizationId: string;
  userId: string;
  role: OrgRole;
  email?: string;
  fullName?: string;
}

export class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

// ── Processing Job (chưa có trong contracts) ──

export interface ProcessingJobResponse {
  id: string;
  analysisSessionId: string;
  dataSourceId: string | null;
  importBatchId: string | null;
  jobType: string;
  bullmqJobId: string | null;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
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

// ── AI Analysis (chưa có trong contracts) ──

export interface FeedbackAnalysisResponse {
  id: string;
  feedbackId: string;
  runNo: number;
  status: string;
  sentiment: string | null;
  sentimentScore: number | null;
  topics: string[];
  painPoints: string[];
  questions: string[];
  priority: number | null;
  confidence: number | null;
  evidence: Array<{ text: string; relevance: number }>;
  aiModel: string | null;
  promptVersion: string | null;
  errorMessage: string | null;
  analyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Review Crawl (chưa có trong contracts) ──

export interface TriggerReviewCrawlResponse {
  idempotent: boolean;
  dataSourceId: string;
  jobId: string;
  jobStatus: string;
  crawl: {
    dataSourceId: string;
    businessLocationId: string;
    name: string;
    status: string;
  };
}

// ── Data Source list: API trả mảng trực tiếp (không phân trang) ──

export type DataSourceListResponse = DataSourceResponse[];

// ── Import batch list: API trả mảng trực tiếp ──

export type ImportBatchListResponse = ImportBatchResponse[];

export type {
  AnalysisSessionListItemResponse,
  AnalysisSessionDetailResponse,
  AnalysisSessionListResponse,
  BusinessListItemResponse,
  BusinessDetailResponse,
  BusinessListResponse,
  BusinessLocationResponse,
  FeedbackListItemResponse,
  FeedbackListResponse,
  InsightListItemResponse,
  InsightListResponse,
  InsightResponse,
  StrategyVersionListItemResponse,
  StrategyVersionListResponse,
  StrategyVersionResponse,
  StrategyResponse,
  PaginatedResponse,
  IamBootstrapResponse,
  IamMeResponse,
} from "@seeding/contracts";
