import type { Prisma } from "@seeding/database";
import type {
  InsightOrigin,
  InsightReviewAction,
  InsightStatus,
  PaginatedResponse,
} from "@seeding/contracts";

export type { InsightOrigin, InsightReviewAction, InsightStatus };

/** Nguồn chân lý duy nhất cho các giá trị trạng thái insight — tránh magic string. */
export const INSIGHT_STATUS = {
  DRAFT: "DRAFT",
  WAITING_REVIEW: "WAITING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  NEEDS_REANALYSIS: "NEEDS_REANALYSIS",
  ARCHIVED: "ARCHIVED",
} as const satisfies Record<string, InsightStatus>;

export const INSIGHT_ORIGIN = {
  OBSERVED: "OBSERVED",
  INFERRED: "INFERRED",
  ASSUMED: "ASSUMED",
} as const satisfies Record<string, InsightOrigin>;

export const INSIGHT_REVIEW_ACTION = {
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EDITED: "EDITED",
  REANALYSIS_REQUESTED: "REANALYSIS_REQUESTED",
  MERGED: "MERGED",
  SPLIT: "SPLIT",
  ARCHIVED: "ARCHIVED",
} as const satisfies Record<string, InsightReviewAction>;

export interface InsightEvidenceEntity {
  id: string;
  analysisSessionId: string;
  insightId: string;
  feedbackId: string;
  excerpt: string | null;
  relevance: number | null;
  createdAt: Date;
}

export interface InsightReviewLogEntity {
  id: string;
  analysisSessionId: string;
  insightId: string;
  action: InsightReviewAction;
  fromStatus: InsightStatus | null;
  toStatus: InsightStatus | null;
  actorId: string | null;
  comment: string | null;
  createdAt: Date;
}

export interface InsightEntity {
  id: string;
  analysisSessionId: string;
  title: string;
  description: string;
  origin: InsightOrigin;
  priority: number;
  confidence: number;
  frequencyCount: number;
  frequencyPct: number;
  status: InsightStatus;
  isFlagged: boolean;
  parentInsightId: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewComment: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

/** Insight đầy đủ kèm evidence + review logs — dùng cho chi tiết (tránh N+1 ở mapper). */
export interface InsightDetailEntity extends InsightEntity {
  evidences: InsightEvidenceEntity[];
  reviewLogs: InsightReviewLogEntity[];
}

/** Item trong danh sách — entity kèm evidenceCount để tránh N+1 query. */
export interface InsightListRecord {
  insight: InsightEntity;
  evidenceCount: number;
}

export type CreateInsightData = {
  analysisSessionId: string;
  title: string;
  description: string;
  origin: InsightOrigin;
  priority: number;
  confidence: number;
  frequencyCount: number;
  frequencyPct: number;
  status: InsightStatus;
  isFlagged: boolean;
  parentInsightId?: string | null;
  createdBy: string;
};

export type CreateEvidenceData = {
  analysisSessionId: string;
  insightId: string;
  feedbackId: string;
  excerpt: string | null;
  relevance: number | null;
};

/** Chỉ các field mô tả/nội dung — KHÔNG bao giờ chứa `status` (phải qua command riêng). */
export type UpdateInsightData = Partial<{
  title: string;
  description: string;
  origin: InsightOrigin;
  priority: number;
  confidence: number;
  isFlagged: boolean;
}>;

export interface ListInsightsFilter {
  analysisSessionId: string;
  status?: InsightStatus;
  origin?: InsightOrigin;
  isFlagged?: boolean;
  search?: string;
  includeArchived?: boolean;
  page: number;
  pageSize: number;
}

export type Paginated<T> = PaginatedResponse<T>;

export interface InsightTransitionOptions {
  expectedStatus: InsightStatus;
  nextStatus: InsightStatus;
  action: InsightReviewAction;
  actorId: string | null;
  comment?: string | null;
  archivedAt?: Date;
}

export interface InsightRepository {
  create(data: CreateInsightData, tx?: Prisma.TransactionClient): Promise<InsightEntity>;

  findByIdInSession(
    id: string,
    analysisSessionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<InsightEntity | null>;

  findDetailByIdInSession(
    id: string,
    analysisSessionId: string,
  ): Promise<InsightDetailEntity | null>;

  findManyByIdsInSession(ids: string[], analysisSessionId: string): Promise<InsightEntity[]>;

  listEvidencesForInsights(
    insightIds: string[],
    analysisSessionId: string,
  ): Promise<InsightEvidenceEntity[]>;

  list(filter: ListInsightsFilter): Promise<Paginated<InsightListRecord>>;

  updateFields(
    id: string,
    analysisSessionId: string,
    data: UpdateInsightData,
    tx?: Prisma.TransactionClient,
  ): Promise<InsightEntity | null>;

  /** Đổi trạng thái + ghi review log trong cùng transaction (optimistic theo expectedStatus). */
  transition(
    id: string,
    analysisSessionId: string,
    opts: InsightTransitionOptions,
    tx?: Prisma.TransactionClient,
  ): Promise<InsightEntity | null>;

  /** Archive đồng loạt + ghi review log — dùng khi merge/split (nguồn bị đóng). */
  archiveByIds(
    ids: string[],
    analysisSessionId: string,
    parentId: string | null,
    action: InsightReviewAction,
    actorId: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;

  createEvidences(items: CreateEvidenceData[], tx?: Prisma.TransactionClient): Promise<void>;

  appendReviewLog(
    log: {
      analysisSessionId: string;
      insightId: string;
      action: InsightReviewAction;
      fromStatus: InsightStatus | null;
      toStatus: InsightStatus | null;
      actorId: string | null;
      comment: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void>;

  /** Xóa vĩnh viễn insight (cascade evidences, review logs, strategy links). */
  hardDelete(
    id: string,
    analysisSessionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;
}

export const INSIGHT_REPOSITORY = Symbol("INSIGHT_REPOSITORY");
