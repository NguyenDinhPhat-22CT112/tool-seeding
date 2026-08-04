import { Transform, TransformFnParams, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  CreateInsightRequest,
  ListInsightsQuery,
  MergeInsightsRequest,
  ReviewInsightRequest,
  SplitInsightPart,
  SplitInsightRequest,
  UpdateInsightRequest,
} from "@seeding/contracts";
import {
  InsightOrigin,
  InsightStatus,
} from "../domain/insight.types";

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

function toBoolean({ value }: TransformFnParams): unknown {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return value;
}

const STATUS_VALUES: InsightStatus[] = [
  "DRAFT",
  "WAITING_REVIEW",
  "APPROVED",
  "REJECTED",
  "NEEDS_REANALYSIS",
  "ARCHIVED",
];

const ORIGIN_VALUES: InsightOrigin[] = ["OBSERVED", "INFERRED", "ASSUMED"];

export class CreateInsightDto implements CreateInsightRequest {
  @ApiProperty({ example: "Khách thích quán ít ồn", maxLength: 200 })
  @IsString()
  @MinLength(1, { message: "Tiêu đề không được trống" })
  @MaxLength(200)
  @Transform(trimString)
  title!: string;

  @ApiProperty({ example: "Nhiều khách nhắc đến không gian yên tĩnh", maxLength: 4000 })
  @IsString()
  @MinLength(1, { message: "Mô tả không được trống" })
  @MaxLength(4000)
  @Transform(trimString)
  description!: string;

  @ApiPropertyOptional({ enum: ORIGIN_VALUES })
  @IsOptional()
  @IsIn(ORIGIN_VALUES)
  origin?: InsightOrigin;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, default: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFlagged?: boolean;

  @ApiPropertyOptional({ type: [String], description: "IDs feedback làm bằng chứng" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  evidenceFeedbackIds?: string[];
}

export class UpdateInsightDto implements UpdateInsightRequest {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform(trimString)
  title?: string;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  @Transform(trimString)
  description?: string;

  @ApiPropertyOptional({ enum: ORIGIN_VALUES })
  @IsOptional()
  @IsIn(ORIGIN_VALUES)
  origin?: InsightOrigin;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFlagged?: boolean;

  // Không có field `status` — trạng thái chỉ đổi qua endpoint command riêng.
}

export class ReviewInsightDto implements ReviewInsightRequest {
  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimNullableString)
  comment?: string | null;
}

export class MergeInsightsDto implements MergeInsightsRequest {
  @ApiProperty({ type: [String], minItems: 2, maxItems: 20 })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Matches(/^[A-Za-z0-9_-]+$/, { each: true })
  insightIds!: string[];

  @ApiProperty({ example: "Insight tổng hợp", maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform(trimString)
  title!: string;

  @ApiProperty({ maxLength: 4000 })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  @Transform(trimString)
  description!: string;
}

export class SplitInsightPartDto implements SplitInsightPart {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform(trimString)
  title!: string;

  @ApiProperty({ maxLength: 4000 })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  @Transform(trimString)
  description!: string;

  @ApiProperty({ type: [String], minItems: 1, description: "Phải là evidence của insight gốc" })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  evidenceFeedbackIds!: string[];
}

export class SplitInsightDto implements SplitInsightRequest {
  @ApiProperty({ type: [SplitInsightPartDto], minItems: 2, maxItems: 20 })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SplitInsightPartDto)
  parts!: SplitInsightPartDto[];
}

export class ListInsightsQueryDto implements ListInsightsQuery {
  @ApiPropertyOptional({ enum: STATUS_VALUES, description: "Lọc theo trạng thái" })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: InsightStatus;

  @ApiPropertyOptional({ enum: ORIGIN_VALUES, description: "Lọc theo nguồn" })
  @IsOptional()
  @IsIn(ORIGIN_VALUES)
  origin?: InsightOrigin;

  @ApiPropertyOptional({ description: "Lọc insight được flag" })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isFlagged?: boolean;

  @ApiPropertyOptional({ maxLength: 200, description: "Tìm theo tiêu đề/mô tả" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(trimString)
  search?: string;

  @ApiPropertyOptional({ description: "Bao gồm cả insight đã archive" })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeArchived?: boolean;

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
