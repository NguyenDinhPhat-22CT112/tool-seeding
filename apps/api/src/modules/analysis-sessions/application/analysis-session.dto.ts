import { Transform, TransformFnParams, Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, OmitType } from "@nestjs/swagger";
import type {
  CreateAnalysisSessionRequest,
  ListAnalysisSessionsQuery,
  UpdateAnalysisSessionRequest,
} from "@seeding/contracts";
import { AnalysisSessionStatus } from "../domain/analysis-session.types";

function trimString({ value }: TransformFnParams): unknown {
  const input = value as unknown;
  return typeof input === "string" ? input.trim() : input;
}

/** Trim và chuyển chuỗi rỗng thành null (BUS-08). */
function trimNullableString({ value }: TransformFnParams): unknown {
  const input = value as unknown;
  if (typeof input !== "string") return input;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

@ValidatorConstraint({ name: "DateFromBeforeOrEqualDateTo", async: false })
class DateFromBeforeOrEqualDateTo implements ValidatorConstraintInterface {
  validate(dateTo: string | undefined, args: ValidationArguments) {
    const obj = args.object as { dateFrom?: string };
    if (!obj.dateFrom || !dateTo) return true; // field optional riêng lẻ được IsOptional xử lý
    return new Date(obj.dateFrom).getTime() <= new Date(dateTo).getTime();
  }
  defaultMessage() {
    return "dateFrom phải nhỏ hơn hoặc bằng dateTo";
  }
}

export class CreateAnalysisSessionDto implements CreateAnalysisSessionRequest {
  @ApiProperty({ description: "ID của doanh nghiệp" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9_-]+$/)
  @Transform(trimString)
  businessId!: string;

  @ApiProperty({ example: "Đợt phân tích Q3", maxLength: 200 })
  @IsString()
  @MinLength(1, { message: "name không được để trống" })
  @MaxLength(200)
  @Transform(trimString)
  name!: string;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimNullableString)
  objective?: string | null;

  @ApiPropertyOptional({ maxLength: 300, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(trimNullableString)
  focusProduct?: string | null;

  @ApiPropertyOptional({ format: "date", nullable: true })
  @IsOptional()
  @IsDateString()
  dateFrom?: string | null;

  @ApiPropertyOptional({ format: "date", nullable: true })
  @IsOptional()
  @IsDateString()
  @Validate(DateFromBeforeOrEqualDateTo)
  dateTo?: string | null;

  // Cố tình KHÔNG có field `status` ở đây — client không được truyền trạng thái lúc tạo (mục 3.1).
}

/** Update chỉ cho phạm vi/mô tả — không có status (phải qua endpoint command riêng). */
export class UpdateAnalysisSessionDto implements UpdateAnalysisSessionRequest {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform(trimString)
  name?: string;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimNullableString)
  objective?: string | null;

  @ApiPropertyOptional({ maxLength: 300, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(trimNullableString)
  focusProduct?: string | null;

  @ApiPropertyOptional({ format: "date", nullable: true })
  @IsOptional()
  @IsDateString()
  dateFrom?: string | null;

  @ApiPropertyOptional({ format: "date", nullable: true })
  @IsOptional()
  @IsDateString()
  @Validate(DateFromBeforeOrEqualDateTo)
  dateTo?: string | null;
}

const STATUS_VALUES: AnalysisSessionStatus[] = [
  "DRAFT",
  "DATA_COLLECTION",
  "PROCESSING",
  "ANALYZING",
  "INSIGHT_REVIEW",
  "STRATEGY_BUILDING",
  "COMPLETED",
  "ARCHIVED",
];

export class ListAnalysisSessionsQueryDto implements ListAnalysisSessionsQuery {
  @ApiPropertyOptional({ description: "Lọc theo business ID" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9_-]+$/)
  @Transform(trimString)
  businessId?: string;

  @ApiPropertyOptional({ enum: STATUS_VALUES, description: "Lọc theo trạng thái" })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: AnalysisSessionStatus;

  @ApiPropertyOptional({ format: "date-time", description: "Ngày tạo từ" })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ format: "date-time", description: "Ngày tạo đến" })
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional({ maxLength: 200, description: "Tìm kiếm theo tên/mục tiêu" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(trimString)
  keyword?: string;

  @ApiPropertyOptional({ description: "Lọc theo người tạo" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9_-]+$/)
  @Transform(trimString)
  createdBy?: string;

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

export class ListBusinessAnalysisSessionsQueryDto extends OmitType(
  ListAnalysisSessionsQueryDto,
  ["businessId"] as const,
) {}
