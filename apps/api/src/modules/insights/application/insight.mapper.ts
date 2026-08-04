import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  InsightEvidenceResponse as InsightEvidenceContract,
  InsightListItemResponse as InsightListItemContract,
  InsightListResponse as InsightListContract,
  InsightResponse as InsightDetailContract,
  InsightReviewLogResponse as InsightReviewLogContract,
} from "@seeding/contracts";
import {
  InsightDetailEntity,
  InsightEntity,
  InsightOrigin,
  InsightReviewAction,
  InsightStatus,
} from "../domain/insight.types";

const STATUS_VALUES: InsightStatus[] = [
  "DRAFT",
  "WAITING_REVIEW",
  "APPROVED",
  "REJECTED",
  "NEEDS_REANALYSIS",
  "ARCHIVED",
];

const ORIGIN_VALUES: InsightOrigin[] = ["OBSERVED", "INFERRED", "ASSUMED"];

const ACTION_VALUES: InsightReviewAction[] = [
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "EDITED",
  "REANALYSIS_REQUESTED",
  "MERGED",
  "SPLIT",
  "ARCHIVED",
];

export class InsightEvidenceResponse implements InsightEvidenceContract {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  feedbackId!: string;

  @ApiPropertyOptional({ nullable: true })
  excerpt!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  relevance!: number | null;
}

export class InsightReviewLogResponse implements InsightReviewLogContract {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ACTION_VALUES })
  action!: InsightReviewAction;

  @ApiPropertyOptional({ nullable: true, enum: STATUS_VALUES })
  fromStatus!: InsightStatus | null;

  @ApiPropertyOptional({ nullable: true, enum: STATUS_VALUES })
  toStatus!: InsightStatus | null;

  @ApiPropertyOptional({ nullable: true })
  actorId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  comment!: string | null;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}

export class InsightListItemResponse implements InsightListItemContract {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  priority!: number;

  @ApiProperty({ minimum: 0, maximum: 1 })
  confidence!: number;

  @ApiProperty({ enum: STATUS_VALUES })
  status!: InsightStatus;

  @ApiProperty({ enum: ORIGIN_VALUES })
  origin!: InsightOrigin;

  @ApiProperty()
  isFlagged!: boolean;

  @ApiProperty()
  evidenceCount!: number;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class InsightResponse implements InsightDetailContract {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  analysisSessionId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: ORIGIN_VALUES })
  origin!: InsightOrigin;

  @ApiProperty({ minimum: 1, maximum: 5 })
  priority!: number;

  @ApiProperty({ minimum: 0, maximum: 1 })
  confidence!: number;

  @ApiProperty()
  frequencyCount!: number;

  @ApiProperty()
  frequencyPct!: number;

  @ApiProperty({ enum: STATUS_VALUES })
  status!: InsightStatus;

  @ApiProperty()
  isFlagged!: boolean;

  @ApiPropertyOptional({ nullable: true })
  parentInsightId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  reviewedBy!: string | null;

  @ApiPropertyOptional({ nullable: true, format: "date-time" })
  reviewedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  reviewComment!: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdBy!: string | null;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;

  @ApiPropertyOptional({ nullable: true, format: "date-time" })
  archivedAt!: string | null;

  @ApiProperty()
  evidenceCount!: number;

  @ApiProperty({ type: [InsightEvidenceResponse] })
  evidences!: InsightEvidenceResponse[];

  @ApiProperty({ type: [InsightReviewLogResponse] })
  reviewLogs!: InsightReviewLogResponse[];
}

export class InsightListResponse implements InsightListContract {
  @ApiProperty({ type: [InsightListItemResponse] })
  items!: InsightListItemResponse[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

export class InsightMapper {
  static toListItem(
    entity: InsightEntity,
    evidenceCount: number,
  ): InsightListItemResponse {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      priority: entity.priority,
      confidence: entity.confidence,
      status: entity.status,
      origin: entity.origin,
      isFlagged: entity.isFlagged,
      evidenceCount,
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  static toResponse(detail: InsightDetailEntity): InsightResponse {
    return {
      id: detail.id,
      analysisSessionId: detail.analysisSessionId,
      title: detail.title,
      description: detail.description,
      origin: detail.origin,
      priority: detail.priority,
      confidence: detail.confidence,
      frequencyCount: detail.frequencyCount,
      frequencyPct: detail.frequencyPct,
      status: detail.status,
      isFlagged: detail.isFlagged,
      parentInsightId: detail.parentInsightId,
      reviewedBy: detail.reviewedBy,
      reviewedAt: detail.reviewedAt ? detail.reviewedAt.toISOString() : null,
      reviewComment: detail.reviewComment,
      createdBy: detail.createdBy,
      createdAt: detail.createdAt.toISOString(),
      updatedAt: detail.updatedAt.toISOString(),
      archivedAt: detail.archivedAt ? detail.archivedAt.toISOString() : null,
      evidenceCount: detail.evidences.length,
      evidences: detail.evidences.map((evidence) => ({
        id: evidence.id,
        feedbackId: evidence.feedbackId,
        excerpt: evidence.excerpt,
        relevance: evidence.relevance,
      })),
      reviewLogs: detail.reviewLogs.map((log) => ({
        id: log.id,
        action: log.action,
        fromStatus: log.fromStatus,
        toStatus: log.toStatus,
        actorId: log.actorId,
        comment: log.comment,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }
}
