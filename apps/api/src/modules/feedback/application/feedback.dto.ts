import { Transform, TransformFnParams, Type } from "class-transformer";
import {
  IsDateString,
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
  CreateFeedbackRequest,
  FeedbackProcessingStatus,
  ListFeedbackQuery,
  UpdateFeedbackRequest,
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

const PROCESSING_STATUSES: FeedbackProcessingStatus[] = [
  "RAW",
  "NORMALIZED",
  "DUPLICATE",
  "EXCLUDED",
];

export class CreateFeedbackDto implements CreateFeedbackRequest {
  @ApiProperty({ description: "Nội dung feedback gốc" })
  @IsString()
  @MinLength(1, { message: "Nội dung feedback không được trống" })
  @MaxLength(10000)
  @Transform(trimString)
  rawContent!: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null;

  @ApiPropertyOptional({ maxLength: 200, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(trimNullableString)
  reviewerName?: string | null;

  @ApiPropertyOptional({ maxLength: 10, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Transform(trimNullableString)
  language?: string | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trimNullableString)
  sourceUrl?: string | null;

  @ApiPropertyOptional({ format: "date-time", nullable: true })
  @IsOptional()
  @IsDateString()
  publishedAt?: string | null;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimNullableString)
  notes?: string | null;
}

export class UpdateFeedbackDto implements UpdateFeedbackRequest {
  @ApiPropertyOptional({ minimum: 1, maximum: 5, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimNullableString)
  notes?: string | null;
}

export class ListFeedbackQueryDto implements ListFeedbackQuery {
  @ApiPropertyOptional({ enum: PROCESSING_STATUSES })
  @IsOptional()
  @IsIn(PROCESSING_STATUSES)
  processingStatus?: FeedbackProcessingStatus;

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
