import { Transform, TransformFnParams, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  ContentOrigin,
  ContentStatus,
  CreateManualContentRequest,
  CreatePromptTemplateRequest,
  GenerateContentsRequest,
  ListContentsQuery,
  ListPromptTemplatesQuery,
  PromptPurpose,
  ReviewContentRequest,
  SaveAIGenerationRequest,
  UpdateContentRequest,
} from "@seeding/contracts";

function trimString({ value }: TransformFnParams): unknown {
  const input = value as unknown;
  return typeof input === "string" ? input.trim() : input;
}

function trimNullableString({ value }: TransformFnParams): unknown {
  const input = value as unknown;
  if (typeof input !== "string") return input;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const STATUS_VALUES: ContentStatus[] = [
  "DRAFT",
  "WAITING_APPROVAL",
  "NEEDS_REVISION",
  "APPROVED",
  "LOCKED",
  "ARCHIVED",
];

const ORIGIN_VALUES: ContentOrigin[] = ["AI_GENERATED", "HUMAN_WRITTEN"];

const PURPOSE_VALUES: PromptPurpose[] = ["GENERATE", "REWRITE"];

export class GenerateContentsDto implements GenerateContentsRequest {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  strategyVersionId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  promptTemplateId!: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 5, default: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  variantCount?: number = 3;
}

export class SaveAIGenerationDto implements SaveAIGenerationRequest {
  @ApiProperty({ type: Number, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  selectedCandidateIndex!: number;
}

export class CreateManualContentDto implements CreateManualContentRequest {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  strategyVersionId!: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform(trimString)
  title!: string;

  @ApiProperty({ maxLength: 20000 })
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  body!: string;

  @ApiPropertyOptional({ maxLength: 50, default: "google_maps" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(trimString)
  platform?: string = "google_maps";

  @ApiPropertyOptional({ maxLength: 50, default: "review_reply" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(trimString)
  contentType?: string = "review_reply";

  @ApiPropertyOptional({ type: [String], maxItems: 50 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  tags?: string[];
}

export class UpdateContentDto implements UpdateContentRequest {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(trimString)
  title?: string;

  @ApiPropertyOptional({ maxLength: 20000 })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  body?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimNullableString)
  editReason?: string | null;
}

export class ReviewContentDto implements ReviewContentRequest {
  @ApiPropertyOptional({ nullable: true, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimNullableString)
  comment?: string | null;
}

export class UpdateContentTagsDto {
  @ApiProperty({ type: [String], maxItems: 50 })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  tags!: string[];
}

export class ListContentsQueryDto implements ListContentsQuery {
  @ApiPropertyOptional({ enum: STATUS_VALUES })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: ContentStatus;

  @ApiPropertyOptional({ enum: ORIGIN_VALUES })
  @IsOptional()
  @IsIn(ORIGIN_VALUES)
  origin?: ContentOrigin;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  platform?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contentType?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class ListPromptTemplatesQueryDto implements ListPromptTemplatesQuery {
  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  platform?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contentType?: string;

  @ApiPropertyOptional({ enum: PURPOSE_VALUES })
  @IsOptional()
  @IsIn(PURPOSE_VALUES)
  purpose?: PromptPurpose;
}

export class CreatePromptTemplateDto implements CreatePromptTemplateRequest {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform(trimString)
  name!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(trimNullableString)
  platform?: string | null;

  @ApiProperty({ maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Transform(trimString)
  contentType!: string;

  @ApiProperty({ enum: PURPOSE_VALUES })
  @IsIn(PURPOSE_VALUES)
  purpose!: PromptPurpose;

  @ApiProperty({ maxLength: 20000 })
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  templateBody!: string;
}

export class ContentLibraryQueryDto {
  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  platform?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contentType?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tag?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  analysisSessionId?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
