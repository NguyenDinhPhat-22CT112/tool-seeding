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
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  CreateStrategyRevisionRequest,
  ListStrategyVersionsQuery,
  ReviewStrategyVersionRequest,
  StrategyContentTheme,
  StrategyKpi,
  StrategyTargetSegment,
  UpdateStrategyVersionRequest,
} from "@seeding/contracts";
import { StrategyVersionStatus } from "../domain/strategy.types";

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

export class StrategyTargetSegmentDto implements StrategyTargetSegment {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform(trimString)
  segment!: string;

  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  @Transform(trimString)
  description!: string;
}

export class StrategyContentThemeDto implements StrategyContentTheme {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform(trimString)
  theme!: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  @Transform(trimString)
  description!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimString)
  examples?: string;
}

export class StrategyKpiDto implements StrategyKpi {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform(trimString)
  metric!: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform(trimString)
  target!: string;
}

export class UpdateStrategyVersionDto implements UpdateStrategyVersionRequest {
  @ApiPropertyOptional({ nullable: true, maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  @Transform(trimNullableString)
  context?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: 50 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  objectives?: string[];

  @ApiPropertyOptional({ type: [StrategyTargetSegmentDto], maxItems: 50 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => StrategyTargetSegmentDto)
  targetSegments?: StrategyTargetSegmentDto[];

  @ApiPropertyOptional({ type: [String], maxItems: 50 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  priorityProblems?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 50 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  mainMessages?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 50 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  responsePrinciples?: string[];

  @ApiPropertyOptional({ type: [StrategyContentThemeDto], maxItems: 50 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => StrategyContentThemeDto)
  contentThemes?: StrategyContentThemeDto[];

  @ApiPropertyOptional({ type: [String], maxItems: 50 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  risks?: string[];

  @ApiPropertyOptional({ type: [StrategyKpiDto], maxItems: 50 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => StrategyKpiDto)
  kpis?: StrategyKpiDto[];

  @ApiPropertyOptional({ nullable: true, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimNullableString)
  additionalNotes?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 2000, description: "Lý do chỉnh sửa" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimNullableString)
  editReason?: string | null;

  // Không có field `status` — trạng thái chỉ đổi qua endpoint command riêng.
}

export class ReviewStrategyVersionDto implements ReviewStrategyVersionRequest {
  @ApiPropertyOptional({ nullable: true, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimNullableString)
  comment?: string | null;
}

export class CreateStrategyRevisionDto implements CreateStrategyRevisionRequest {
  @ApiProperty({ example: "Chiến lược Q4 (sửa theo phản hồi)", maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform(trimString)
  name!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimNullableString)
  editReason?: string | null;
}

export class ListStrategyVersionsQueryDto implements ListStrategyVersionsQuery {
  @ApiPropertyOptional({ enum: STATUS_VALUES, description: "Lọc theo trạng thái" })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: StrategyVersionStatus;

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
