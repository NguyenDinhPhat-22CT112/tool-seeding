import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  StrategyContentTheme as StrategyContentThemeContract,
  StrategyInsightLinkResponse as StrategyInsightLinkContract,
  StrategyKpi as StrategyKpiContract,
  StrategyResponse as StrategyResponseContract,
  StrategyTargetSegment as StrategyTargetSegmentContract,
  StrategyVersionListItemResponse as StrategyVersionListItemContract,
  StrategyVersionListResponse as StrategyVersionListContract,
  StrategyVersionResponse as StrategyVersionDetailContract,
} from "@seeding/contracts";
import {
  StrategyEntity,
  StrategyVersionDetailEntity,
  StrategyVersionEntity,
  StrategyVersionStatus,
} from "../domain/strategy.types";

const STATUS_VALUES: StrategyVersionStatus[] = [
  "AI_DRAFT",
  "DRAFT",
  "WAITING_APPROVAL",
  "NEEDS_REVISION",
  "APPROVED",
  "LOCKED",
  "SUPERSEDED",
  "ARCHIVED",
];

export class StrategyTargetSegmentResponse implements StrategyTargetSegmentContract {
  @ApiProperty()
  segment!: string;

  @ApiProperty()
  description!: string;
}

export class StrategyContentThemeResponse implements StrategyContentThemeContract {
  @ApiProperty()
  theme!: string;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional()
  examples?: string;
}

export class StrategyKpiResponse implements StrategyKpiContract {
  @ApiProperty()
  metric!: string;

  @ApiProperty()
  target!: string;
}

export class StrategyInsightLinkResponse implements StrategyInsightLinkContract {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  insightId!: string;

  @ApiProperty()
  orderIndex!: number;

  @ApiProperty()
  insightSnapshot!: {
    title: string;
    description: string;
    priority: number;
    confidence: number;
  };
}

export class StrategyVersionResponse implements StrategyVersionDetailContract {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  strategyId!: string;

  @ApiProperty()
  analysisSessionId!: string;

  @ApiProperty()
  versionNo!: number;

  @ApiProperty({ enum: STATUS_VALUES })
  status!: StrategyVersionStatus;

  @ApiPropertyOptional({ nullable: true })
  context!: string | null;

  @ApiProperty({ type: [String] })
  objectives!: string[];

  @ApiProperty({ type: [StrategyTargetSegmentResponse] })
  targetSegments!: StrategyTargetSegmentContract[];

  @ApiProperty({ type: [String] })
  priorityProblems!: string[];

  @ApiProperty({ type: [String] })
  mainMessages!: string[];

  @ApiProperty({ type: [String] })
  responsePrinciples!: string[];

  @ApiProperty({ type: [StrategyContentThemeResponse] })
  contentThemes!: StrategyContentThemeContract[];

  @ApiProperty({ type: [String] })
  risks!: string[];

  @ApiProperty({ type: [StrategyKpiResponse] })
  kpis!: StrategyKpiContract[];

  @ApiPropertyOptional({ nullable: true })
  additionalNotes!: string | null;

  @ApiPropertyOptional({ nullable: true })
  aiModel!: string | null;

  @ApiPropertyOptional({ nullable: true })
  promptVersion!: string | null;

  @ApiPropertyOptional({ nullable: true })
  editedBy!: string | null;

  @ApiPropertyOptional({ nullable: true })
  editReason!: string | null;

  @ApiPropertyOptional({ nullable: true })
  reviewedBy!: string | null;

  @ApiPropertyOptional({ nullable: true, format: "date-time" })
  reviewedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  approvedBy!: string | null;

  @ApiPropertyOptional({ nullable: true, format: "date-time" })
  approvedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  reviewComment!: string | null;

  @ApiPropertyOptional({ nullable: true, format: "date-time" })
  lockedAt!: string | null;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;

  @ApiProperty({ type: [StrategyInsightLinkResponse] })
  insights!: StrategyInsightLinkContract[];
}

export class StrategyResponse implements StrategyResponseContract {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  analysisSessionId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  currentVersionId!: string | null;

  @ApiPropertyOptional({ type: StrategyVersionResponse, nullable: true })
  currentVersion!: StrategyVersionResponse | null;

  @ApiProperty()
  versionCount!: number;

  @ApiPropertyOptional({ nullable: true })
  createdBy!: string | null;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;

  @ApiPropertyOptional({ nullable: true, format: "date-time" })
  archivedAt!: string | null;
}

export class StrategyVersionListItemResponse implements StrategyVersionListItemContract {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  strategyId!: string;

  @ApiProperty()
  versionNo!: number;

  @ApiProperty({ enum: STATUS_VALUES })
  status!: StrategyVersionStatus;

  @ApiPropertyOptional({ nullable: true })
  context!: string | null;

  @ApiProperty({ type: [String] })
  objectives!: string[];

  @ApiPropertyOptional({ nullable: true })
  aiModel!: string | null;

  @ApiPropertyOptional({ nullable: true })
  promptVersion!: string | null;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class StrategyVersionListResponse implements StrategyVersionListContract {
  @ApiProperty({ type: [StrategyVersionListItemResponse] })
  items!: StrategyVersionListItemResponse[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

export class StrategyMapper {
  static toVersionResponse(detail: StrategyVersionDetailEntity): StrategyVersionResponse {
    return {
      id: detail.id,
      strategyId: detail.strategyId,
      analysisSessionId: detail.analysisSessionId,
      versionNo: detail.versionNo,
      status: detail.status,
      context: detail.context,
      objectives: detail.objectives,
      targetSegments: detail.targetSegments,
      priorityProblems: detail.priorityProblems,
      mainMessages: detail.mainMessages,
      responsePrinciples: detail.responsePrinciples,
      contentThemes: detail.contentThemes,
      risks: detail.risks,
      kpis: detail.kpis,
      additionalNotes: detail.additionalNotes,
      aiModel: detail.aiModel,
      promptVersion: detail.promptVersion,
      editedBy: detail.editedBy,
      editReason: detail.editReason,
      reviewedBy: detail.reviewedBy,
      reviewedAt: detail.reviewedAt ? detail.reviewedAt.toISOString() : null,
      approvedBy: detail.approvedBy,
      approvedAt: detail.approvedAt ? detail.approvedAt.toISOString() : null,
      reviewComment: detail.reviewComment,
      lockedAt: detail.lockedAt ? detail.lockedAt.toISOString() : null,
      createdAt: detail.createdAt.toISOString(),
      updatedAt: detail.updatedAt.toISOString(),
      insights: detail.insights.map((link) => ({
        id: link.id,
        insightId: link.insightId,
        orderIndex: link.orderIndex,
        insightSnapshot: link.insightSnapshot,
      })),
    };
  }

  static toStrategy(
    strategy: StrategyEntity,
    currentVersion: StrategyVersionDetailEntity | null,
    versionCount: number,
  ): StrategyResponse {
    return {
      id: strategy.id,
      analysisSessionId: strategy.analysisSessionId,
      name: strategy.name,
      currentVersionId: strategy.currentVersionId,
      currentVersion: currentVersion
        ? this.toVersionResponse(currentVersion)
        : null,
      versionCount,
      createdBy: strategy.createdBy,
      createdAt: strategy.createdAt.toISOString(),
      updatedAt: strategy.updatedAt.toISOString(),
      archivedAt: strategy.archivedAt ? strategy.archivedAt.toISOString() : null,
    };
  }

  static toVersionListItem(
    version: StrategyVersionEntity,
  ): StrategyVersionListItemResponse {
    return {
      id: version.id,
      strategyId: version.strategyId,
      versionNo: version.versionNo,
      status: version.status,
      context: version.context,
      objectives: version.objectives,
      aiModel: version.aiModel,
      promptVersion: version.promptVersion,
      updatedAt: version.updatedAt.toISOString(),
    };
  }
}
