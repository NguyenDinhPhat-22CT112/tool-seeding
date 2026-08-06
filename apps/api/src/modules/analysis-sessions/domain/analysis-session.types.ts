import type { Prisma } from "@seeding/database";
import type {
  AnalysisSessionStatus,
  BusinessProfileSnapshot,
  PaginatedResponse,
} from "@seeding/contracts";

export type { AnalysisSessionStatus, BusinessProfileSnapshot };

/** Nguồn chân lý duy nhất cho các giá trị trạng thái session — tránh magic string. */
export const ANALYSIS_SESSION_STATUS = {
  DRAFT: "DRAFT",
  DATA_COLLECTION: "DATA_COLLECTION",
  PROCESSING: "PROCESSING",
  ANALYZING: "ANALYZING",
  INSIGHT_REVIEW: "INSIGHT_REVIEW",
  STRATEGY_BUILDING: "STRATEGY_BUILDING",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
} as const satisfies Record<string, AnalysisSessionStatus>;

export interface AnalysisSessionEntity {
  id: string;
  organizationId: string;
  businessId: string;
  name: string;
  objective: string | null;
  focusProduct: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  status: AnalysisSessionStatus;
  businessSnapshot: BusinessProfileSnapshot | null;
  businessSnapshotAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  archivedAt: Date | null;
}

export type CreateAnalysisSessionData = {
  organizationId: string;
  businessId: string;
  name: string;
  objective: string | null;
  focusProduct: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  createdBy: string | null;
};

/** Chỉ các field phạm vi/mô tả — KHÔNG bao giờ chứa `status` (phải qua command riêng). */
export type UpdateAnalysisSessionData = Partial<{
  name: string;
  objective: string | null;
  focusProduct: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
}>;

export interface ListAnalysisSessionsFilter {
  organizationId: string;
  businessId?: string;
  status?: AnalysisSessionStatus;
  createdFrom?: Date;
  createdTo?: Date;
  keyword?: string;
  createdBy?: string;
  page: number;
  pageSize: number;
}

export type Paginated<T> = PaginatedResponse<T>;

/** Item trong danh sách — entity kèm feedbackCount để tránh N+1 query (BUS-09). */
export interface AnalysisSessionListRecord {
  session: AnalysisSessionEntity;
  feedbackCount: number;
  businessName: string;
}

export interface AnalysisSessionRepository {
  create(
    data: CreateAnalysisSessionData,
    tx?: Prisma.TransactionClient,
  ): Promise<AnalysisSessionEntity>;

  findByIdInOrg(id: string, organizationId: string): Promise<AnalysisSessionEntity | null>;

  updateFields(
    id: string,
    organizationId: string,
    data: UpdateAnalysisSessionData,
  ): Promise<AnalysisSessionEntity | null>;

  findByIdWithLock(
    id: string,
    organizationId: string,
    tx: Prisma.TransactionClient,
  ): Promise<AnalysisSessionEntity | null>;

  transitionFromDraft(
    id: string,
    organizationId: string,
    nextStatus: AnalysisSessionStatus,
    snapshot: BusinessProfileSnapshot,
    tx: Prisma.TransactionClient,
  ): Promise<AnalysisSessionEntity | null>;

  lockAndFindBusiness(
    businessId: string,
    organizationId: string,
    tx: Prisma.TransactionClient,
  ): Promise<{ isActive: boolean } | null>;

  transitionStatus(
    id: string,
    organizationId: string,
    expectedCurrentStatus: AnalysisSessionStatus,
    nextStatus: AnalysisSessionStatus,
    extra?: {
      archivedAt?: Date | null;
      completedAt?: Date | null;
    },
  ): Promise<AnalysisSessionEntity | null>;

  list(filter: ListAnalysisSessionsFilter): Promise<Paginated<AnalysisSessionListRecord>>;

  countFeedbacks(sessionId: string, organizationId: string): Promise<number>;

  businessExistsInOrg(businessId: string, organizationId: string): Promise<boolean>;

  /** Xóa vĩnh viễn session + cascade sạch toàn bộ dữ liệu con (insight, feedback, strategy, ...). */
  hardDelete(
    id: string,
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;
}

export const ANALYSIS_SESSION_REPOSITORY = Symbol("ANALYSIS_SESSION_REPOSITORY");
