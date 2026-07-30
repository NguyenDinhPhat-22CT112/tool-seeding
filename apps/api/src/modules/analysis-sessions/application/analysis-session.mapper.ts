import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  AnalysisSessionDetailResponse as AnalysisSessionDetailContract,
  AnalysisSessionListItemResponse as AnalysisSessionListItemContract,
  AnalysisSessionListResponse as AnalysisSessionListContract,
  AnalysisSessionNextAction,
  AnalysisSessionProgress,
  BusinessProfileSnapshot,
} from "@seeding/contracts";
import {
  AnalysisSessionEntity,
  AnalysisSessionStatus,
} from "../domain/analysis-session.types";
import {
  CompetitorItemDto,
  NamedNoteDto,
  TargetAudienceItemDto,
} from "../../businesses/application/business.dto";

export class NextAction implements AnalysisSessionNextAction {
  @ApiProperty({ example: "START_DATA_COLLECTION" })
  code!: string;

  @ApiProperty({ example: "Bắt đầu nhập dữ liệu" })
  label!: string;
}

export class ProgressInfo implements AnalysisSessionProgress {
  @ApiProperty()
  currentStep!: number;

  @ApiProperty()
  totalSteps!: number;

  @ApiProperty({ description: "0–100" })
  percentage!: number;
}

/**
 * Bước nghiệp vụ theo status — CHỈ mang tính hiển thị tiến trình theo giai đoạn,
 * KHÔNG phải tiến độ xử lý AI thực tế (đúng lưu ý ở mục 5: "không giả vờ thể hiện
 * tiến độ xử lý chính xác"). Khi có ProcessingJob ở Giai đoạn 3, tiến độ job sẽ
 * tính riêng và không thay thế field này.
 */
const STEP_ORDER: AnalysisSessionStatus[] = [
  "DRAFT",
  "DATA_COLLECTION",
  "PROCESSING",
  "ANALYZING",
  "INSIGHT_REVIEW",
  "STRATEGY_BUILDING",
  "COMPLETED",
];

const NEXT_ACTION_BY_STATUS: Record<AnalysisSessionStatus, NextAction | null> = {
  DRAFT: { code: "START_DATA_COLLECTION", label: "Bắt đầu nhập dữ liệu" },
  DATA_COLLECTION: { code: "ADD_DATA_SOURCE", label: "Nhập dữ liệu phản hồi" },
  PROCESSING: { code: "WAIT_PROCESSING", label: "Đang xử lý dữ liệu" },
  ANALYZING: { code: "WAIT_ANALYSIS", label: "Đang chạy phân tích AI" },
  INSIGHT_REVIEW: { code: "REVIEW_INSIGHTS", label: "Duyệt insight" },
  STRATEGY_BUILDING: { code: "BUILD_STRATEGY", label: "Xây dựng chiến lược" },
  COMPLETED: null,
  ARCHIVED: null,
};

export class BusinessProfileSnapshotResponse implements BusinessProfileSnapshot {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  industry!: string | null;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  website!: string | null;

  @ApiPropertyOptional({ nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiProperty({ type: [NamedNoteDto] })
  products!: BusinessProfileSnapshot["products"];

  @ApiProperty({ type: [NamedNoteDto] })
  services!: BusinessProfileSnapshot["services"];

  @ApiProperty({ type: [TargetAudienceItemDto] })
  targetAudience!: BusinessProfileSnapshot["targetAudience"];

  @ApiProperty({ type: [CompetitorItemDto] })
  competitors!: BusinessProfileSnapshot["competitors"];

  @ApiProperty({ type: [String] })
  strengths!: string[];

  @ApiPropertyOptional({ nullable: true })
  brandVoice!: string | null;

  @ApiProperty({ type: [String] })
  allowedTopics!: string[];

  @ApiProperty({ type: [String] })
  bannedTopics!: string[];

  @ApiPropertyOptional({ nullable: true })
  extraNotes!: string | null;

  @ApiProperty({ format: "date-time" })
  sourceUpdatedAt!: string;
}

export class AnalysisSessionListItemResponse
  implements AnalysisSessionListItemContract
{
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  businessId!: string;

  @ApiPropertyOptional({ nullable: true })
  objective!: string | null;

  @ApiProperty({ enum: ["DRAFT", "DATA_COLLECTION", "PROCESSING", "ANALYZING", "INSIGHT_REVIEW", "STRATEGY_BUILDING", "COMPLETED", "ARCHIVED"] })
  status!: AnalysisSessionStatus;

  @ApiProperty()
  feedbackCount!: number;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class AnalysisSessionDetailResponse
  implements AnalysisSessionDetailContract
{
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  businessId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  objective!: string | null;

  @ApiPropertyOptional({ nullable: true })
  focusProduct!: string | null;

  @ApiPropertyOptional({ nullable: true, format: "date-time" })
  dateFrom!: string | null;

  @ApiPropertyOptional({ nullable: true, format: "date-time" })
  dateTo!: string | null;

  @ApiPropertyOptional({ type: BusinessProfileSnapshotResponse, nullable: true })
  businessSnapshot!: BusinessProfileSnapshot | null;

  @ApiPropertyOptional({ nullable: true, format: "date-time" })
  businessSnapshotAt!: string | null;

  @ApiProperty({ enum: ["DRAFT", "DATA_COLLECTION", "PROCESSING", "ANALYZING", "INSIGHT_REVIEW", "STRATEGY_BUILDING", "COMPLETED", "ARCHIVED"] })
  status!: AnalysisSessionStatus;

  @ApiProperty({ type: ProgressInfo })
  progress!: ProgressInfo;

  @ApiPropertyOptional({ type: NextAction, nullable: true })
  nextAction!: NextAction | null;

  @ApiProperty()
  feedbackCount!: number;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;

  @ApiPropertyOptional({ nullable: true, format: "date-time" })
  completedAt!: string | null;

  @ApiPropertyOptional({ nullable: true, format: "date-time" })
  archivedAt!: string | null;
}

export class AnalysisSessionListResponse implements AnalysisSessionListContract {
  @ApiProperty({ type: [AnalysisSessionListItemResponse] })
  items!: AnalysisSessionListItemResponse[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

export class AnalysisSessionMapper {
  static computeProgress(status: AnalysisSessionStatus): ProgressInfo {
    if (status === "ARCHIVED") {
      return { currentStep: 0, totalSteps: STEP_ORDER.length, percentage: 0 };
    }
    const idx = STEP_ORDER.indexOf(status);
    const currentStep = idx === -1 ? STEP_ORDER.length : idx + 1;
    const totalSteps = STEP_ORDER.length;
    return {
      currentStep,
      totalSteps,
      percentage: Math.round((currentStep / totalSteps) * 100),
    };
  }

  static toDetail(
    entity: AnalysisSessionEntity,
    feedbackCount: number,
  ): AnalysisSessionDetailResponse {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      businessId: entity.businessId,
      name: entity.name,
      objective: entity.objective,
      focusProduct: entity.focusProduct,
      dateFrom: entity.dateFrom ? entity.dateFrom.toISOString() : null,
      dateTo: entity.dateTo ? entity.dateTo.toISOString() : null,
      businessSnapshot: entity.businessSnapshot,
      businessSnapshotAt: entity.businessSnapshotAt
        ? entity.businessSnapshotAt.toISOString()
        : null,
      status: entity.status,
      progress: this.computeProgress(entity.status),
      nextAction: NEXT_ACTION_BY_STATUS[entity.status],
      feedbackCount,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      completedAt: entity.completedAt ? entity.completedAt.toISOString() : null,
      archivedAt: entity.archivedAt ? entity.archivedAt.toISOString() : null,
    };
  }

  static toListItem(
    entity: AnalysisSessionEntity,
    feedbackCount: number,
  ): AnalysisSessionListItemResponse {
    return {
      id: entity.id,
      name: entity.name,
      businessId: entity.businessId,
      objective: entity.objective,
      status: entity.status,
      feedbackCount,
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
