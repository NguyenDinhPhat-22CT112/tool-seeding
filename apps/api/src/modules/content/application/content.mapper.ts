import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  AIGenerationResponse as AIGenerationContract,
  AIGenerationStatus,
  ContentCandidate,
  ContentOrigin,
  ContentStatus,
  ContentVersionResponse as ContentVersionContract,
  ContentVersionSource,
  PromptTemplateResponse as PromptTemplateContract,
  PromptPurpose,
  SeedingContentDetail as SeedingContentDetailContract,
  SeedingContentListResponse as SeedingContentListContract,
  SeedingContentSummary as SeedingContentSummaryContract,
} from "@seeding/contracts";
import {
  AIGenerationEntity,
  ContentVersionEntity,
  PromptTemplateEntity,
  SeedingContentDetailEntity,
  SeedingContentEntity,
} from "../domain/content.types";

const STATUS_VALUES: ContentStatus[] = [
  "DRAFT",
  "WAITING_APPROVAL",
  "NEEDS_REVISION",
  "APPROVED",
  "LOCKED",
  "ARCHIVED",
];

const ORIGIN_VALUES: ContentOrigin[] = ["AI_GENERATED", "HUMAN_WRITTEN"];

export class ContentVersionResponse implements ContentVersionContract {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  contentId!: string;

  @ApiProperty()
  versionNumber!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiPropertyOptional({ nullable: true })
  contentTheme!: string | null;

  @ApiProperty({ enum: ["HUMAN_EDIT", "AI_GENERATE", "AI_REWRITE"] })
  source!: ContentVersionSource;

  @ApiPropertyOptional({ nullable: true })
  aiGenerationId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  editReason!: string | null;

  @ApiPropertyOptional({ nullable: true })
  editedBy!: string | null;

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

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}

export class SeedingContentSummary implements SeedingContentSummaryContract {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  analysisSessionId!: string;

  @ApiProperty()
  strategyVersionId!: string;

  @ApiProperty({ enum: ORIGIN_VALUES })
  origin!: ContentOrigin;

  @ApiProperty({ enum: STATUS_VALUES })
  status!: ContentStatus;

  @ApiProperty()
  platform!: string;

  @ApiProperty()
  contentType!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}

export class SeedingContentDetail extends SeedingContentSummary implements SeedingContentDetailContract {
  @ApiPropertyOptional({ nullable: true })
  contentHash!: string | null;

  @ApiPropertyOptional({ nullable: true })
  currentVersionId!: string | null;

  @ApiPropertyOptional({ type: ContentVersionResponse, nullable: true })
  currentVersion!: ContentVersionResponse | null;

  @ApiPropertyOptional({ nullable: true, format: "date-time" })
  archivedAt!: string | null;
}

export class SeedingContentListResponse implements SeedingContentListContract {
  @ApiProperty({ type: [SeedingContentSummary] })
  items!: SeedingContentSummary[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

export class AIGenerationResponse implements AIGenerationContract {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  analysisSessionId!: string;

  @ApiProperty()
  strategyVersionId!: string;

  @ApiPropertyOptional({ nullable: true })
  contentId!: string | null;

  @ApiProperty()
  promptTemplateId!: string;

  @ApiProperty()
  promptRendered!: string;

  @ApiProperty()
  aiProvider!: string;

  @ApiProperty()
  aiModel!: string;

  @ApiProperty()
  parameters!: Record<string, unknown>;

  @ApiProperty({ type: [Object] })
  candidates!: ContentCandidate[];

  @ApiPropertyOptional({ nullable: true })
  selectedCandidateIndex!: number | null;

  @ApiProperty({ enum: ["PENDING", "COMPLETED", "FAILED", "DISCARDED"] })
  status!: AIGenerationStatus;

  @ApiPropertyOptional({ nullable: true })
  rawResponse!: unknown;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}

export class PromptTemplateResponse implements PromptTemplateContract {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  platform!: string | null;

  @ApiProperty()
  contentType!: string;

  @ApiProperty({ enum: ["GENERATE", "REWRITE"] })
  purpose!: PromptPurpose;

  @ApiProperty()
  templateBody!: string;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}

export class ContentMapper {
  static toVersionResponse(v: ContentVersionEntity): ContentVersionResponse {
    return {
      id: v.id,
      contentId: v.contentId,
      versionNumber: v.versionNumber,
      title: v.title,
      body: v.body,
      contentTheme: v.contentTheme,
      source: v.source,
      aiGenerationId: v.aiGenerationId,
      editReason: v.editReason,
      editedBy: v.editedBy,
      reviewedBy: v.reviewedBy,
      reviewedAt: v.reviewedAt ? v.reviewedAt.toISOString() : null,
      approvedBy: v.approvedBy,
      approvedAt: v.approvedAt ? v.approvedAt.toISOString() : null,
      reviewComment: v.reviewComment,
      createdAt: v.createdAt.toISOString(),
    };
  }

  static toSummary(c: SeedingContentEntity): SeedingContentSummary {
    return {
      id: c.id,
      analysisSessionId: c.analysisSessionId,
      strategyVersionId: c.strategyVersionId,
      origin: c.origin,
      status: c.status,
      platform: c.platform,
      contentType: c.contentType,
      title: c.title,
      tags: c.tags,
      updatedAt: c.updatedAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
    };
  }

  static toDetail(c: SeedingContentDetailEntity): SeedingContentDetail {
    return {
      ...this.toSummary(c),
      contentHash: c.contentHash,
      currentVersionId: c.currentVersionId,
      currentVersion: c.currentVersion ? this.toVersionResponse(c.currentVersion) : null,
      archivedAt: c.archivedAt ? c.archivedAt.toISOString() : null,
    };
  }

  static toAIGeneration(g: AIGenerationEntity): AIGenerationResponse {
    return {
      id: g.id,
      analysisSessionId: g.analysisSessionId,
      strategyVersionId: g.strategyVersionId,
      contentId: g.contentId,
      promptTemplateId: g.promptTemplateId,
      promptRendered: g.promptRendered,
      aiProvider: g.aiProvider,
      aiModel: g.aiModel,
      parameters: g.parameters,
      candidates: g.candidates,
      selectedCandidateIndex: g.selectedCandidateIndex,
      status: g.status,
      rawResponse: g.rawResponse,
      createdAt: g.createdAt.toISOString(),
    };
  }

  static toPromptTemplate(t: PromptTemplateEntity): PromptTemplateResponse {
    return {
      id: t.id,
      name: t.name,
      platform: t.platform,
      contentType: t.contentType,
      purpose: t.purpose,
      templateBody: t.templateBody,
      version: t.version,
      isActive: t.isActive,
      createdAt: t.createdAt.toISOString(),
    };
  }
}
