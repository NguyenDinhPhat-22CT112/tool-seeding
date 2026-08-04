import type { Prisma } from "@seeding/database";
import type {
  PaginatedResponse,
  StrategyContentTheme,
  StrategyKpi,
  StrategyTargetSegment,
  StrategyVersionStatus,
} from "@seeding/contracts";

export type {
  StrategyContentTheme,
  StrategyKpi,
  StrategyTargetSegment,
  StrategyVersionStatus,
};

export const STRATEGY_VERSION_STATUS = {
  AI_DRAFT: "AI_DRAFT",
  DRAFT: "DRAFT",
  WAITING_APPROVAL: "WAITING_APPROVAL",
  NEEDS_REVISION: "NEEDS_REVISION",
  APPROVED: "APPROVED",
  LOCKED: "LOCKED",
  SUPERSEDED: "SUPERSEDED",
  ARCHIVED: "ARCHIVED",
} as const satisfies Record<string, StrategyVersionStatus>;

export interface StrategyEntity {
  id: string;
  analysisSessionId: string;
  name: string;
  currentVersionId: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface StrategyVersionEntity {
  id: string;
  strategyId: string;
  analysisSessionId: string;
  versionNo: number;
  status: StrategyVersionStatus;
  context: string | null;
  objectives: string[];
  targetSegments: StrategyTargetSegment[];
  priorityProblems: string[];
  mainMessages: string[];
  responsePrinciples: string[];
  contentThemes: StrategyContentTheme[];
  risks: string[];
  kpis: StrategyKpi[];
  additionalNotes: string | null;
  aiModel: string | null;
  promptVersion: string | null;
  editedBy: string | null;
  editReason: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  reviewComment: string | null;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StrategyInsightLinkEntity {
  id: string;
  strategyVersionId: string;
  insightId: string;
  orderIndex: number;
  insightSnapshot: {
    title: string;
    description: string;
    priority: number;
    confidence: number;
  };
  linkedAt: Date;
}

/** Version đầy đủ kèm insight links — dùng cho chi tiết (tránh N+1). */
export interface StrategyVersionDetailEntity extends StrategyVersionEntity {
  insights: StrategyInsightLinkEntity[];
}

export interface StrategyVersionListRecord {
  version: StrategyVersionEntity;
}

/** Chỉ các field nội dung — KHÔNG bao giờ chứa `status` (phải qua command riêng). */
export type UpdateVersionContentData = Partial<{
  context: string | null;
  objectives: string[];
  targetSegments: StrategyTargetSegment[];
  priorityProblems: string[];
  mainMessages: string[];
  responsePrinciples: string[];
  contentThemes: StrategyContentTheme[];
  risks: string[];
  kpis: StrategyKpi[];
  additionalNotes: string | null;
  editReason: string | null;
  editedBy: string;
}>;

export interface ListStrategyVersionsFilter {
  strategyId: string;
  analysisSessionId: string;
  status?: StrategyVersionStatus;
  page: number;
  pageSize: number;
}

export interface VersionTransitionOptions {
  expectedStatus: StrategyVersionStatus;
  nextStatus: StrategyVersionStatus;
  fields?: Partial<{
    editedBy: string;
    editReason: string | null;
    reviewedBy: string;
    reviewedAt: Date;
    approvedBy: string;
    approvedAt: Date;
    reviewComment: string | null;
    lockedAt: Date;
  }>;
}

export interface CreateRevisionData {
  strategyId: string;
  analysisSessionId: string;
  currentVersionId: string;
  fromVersion: StrategyVersionDetailEntity;
  editedBy: string;
  editReason: string | null;
}

export type Paginated<T> = PaginatedResponse<T>;

export interface StrategyRepository {
  findBySession(analysisSessionId: string): Promise<StrategyEntity | null>;

  findByIdInSession(id: string, analysisSessionId: string): Promise<StrategyEntity | null>;

  findVersionDetailByIdInSession(
    id: string,
    analysisSessionId: string,
  ): Promise<StrategyVersionDetailEntity | null>;

  findCurrentVersionDetail(
    strategyId: string,
    analysisSessionId: string,
  ): Promise<StrategyVersionDetailEntity | null>;

  listVersions(
    filter: ListStrategyVersionsFilter,
  ): Promise<Paginated<StrategyVersionListRecord>>;

  updateVersionContent(
    id: string,
    analysisSessionId: string,
    data: UpdateVersionContentData,
    tx?: Prisma.TransactionClient,
  ): Promise<StrategyVersionEntity | null>;

  transitionVersion(
    id: string,
    analysisSessionId: string,
    opts: VersionTransitionOptions,
    tx?: Prisma.TransactionClient,
  ): Promise<StrategyVersionEntity | null>;

  /** Tạo version mới từ version hiện tại, đánh dấu version hiện tại SUPERSEDED, trỏ currentVersionId sang version mới. */
  createRevision(
    data: CreateRevisionData,
    tx?: Prisma.TransactionClient,
  ): Promise<StrategyVersionDetailEntity | null>;

  /** Cập nhật con trỏ currentVersionId của strategy (dùng khi archive version hiện tại). */
  repointCurrentVersion(
    strategyId: string,
    analysisSessionId: string,
    versionId: string | null,
  ): Promise<void>;

  countVersions(strategyId: string): Promise<number>;
}

export const STRATEGY_REPOSITORY = Symbol("STRATEGY_REPOSITORY");
