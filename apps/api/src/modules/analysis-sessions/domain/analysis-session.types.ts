import type {
  AnalysisSessionStatus,
  BusinessProfileSnapshot,
  PaginatedResponse,
} from "@seeding/contracts";

export type { AnalysisSessionStatus, BusinessProfileSnapshot };

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
  // status KHÔNG có ở đây — luôn là DRAFT do repository/DB default quyết định,
  // client không được truyền (đúng mục 3.1: "Client không được tự truyền trạng thái lúc tạo").
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
}

export type StartDataCollectionResult =
  | { outcome: "UPDATED"; session: AnalysisSessionEntity }
  | { outcome: "SESSION_NOT_FOUND" }
  | { outcome: "BUSINESS_NOT_FOUND" }
  | { outcome: "BUSINESS_INACTIVE" }
  | { outcome: "INVALID_STATE"; currentStatus: AnalysisSessionStatus }
  | { outcome: "CONCURRENT_CHANGE" };

export type CreateAnalysisSessionResult =
  | { outcome: "CREATED"; session: AnalysisSessionEntity }
  | { outcome: "BUSINESS_NOT_FOUND" }
  | { outcome: "BUSINESS_INACTIVE" };

export interface AnalysisSessionRepository {
  create(data: CreateAnalysisSessionData): Promise<CreateAnalysisSessionResult>;

  findByIdInOrg(id: string, organizationId: string): Promise<AnalysisSessionEntity | null>;

  updateFields(
    id: string,
    organizationId: string,
    data: UpdateAnalysisSessionData,
  ): Promise<AnalysisSessionEntity | null>;

  startDataCollection(
    id: string,
    organizationId: string,
  ): Promise<StartDataCollectionResult>;

  /**
   * Chuyển trạng thái — tách riêng khỏi updateFields để không bao giờ vô tình
   * cho phép PATCH thường đổi status (đúng nguyên tắc mục 4).
   * `expectedCurrentStatus` dùng làm optimistic lock: nếu status hiện tại trong DB
   * khác với giá trị này (bị race condition từ request khác), update sẽ thất bại.
   */
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

}

export const ANALYSIS_SESSION_REPOSITORY = Symbol("ANALYSIS_SESSION_REPOSITORY");
