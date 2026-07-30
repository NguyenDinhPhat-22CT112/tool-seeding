import { Transform, TransformFnParams, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  CompetitorItem,
  CreateBusinessRequest,
  ListBusinessesQuery,
  NamedNote,
  TargetAudienceItem,
  UpdateBusinessRequest,
} from "@seeding/contracts";

function inputValue({ value }: TransformFnParams): unknown {
  return value as unknown;
}

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function trimNullableString(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function trimOptionalNestedString(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Chỉ làm sạch khi đầu vào thực sự là array. Sai kiểu được giữ nguyên để
 * @IsArray từ chối thay vì âm thầm biến thành [] và xóa dữ liệu hiện có.
 */
function cleanStringArray(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value
    .map((item: unknown) => (typeof item === "string" ? item.trim() : item))
    .filter((item: unknown) => typeof item !== "string" || item.length > 0);
}

function parseBoolean(value: unknown): unknown {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return value;
}

export class NamedNoteDto implements NamedNote {
  @ApiProperty({ example: "Cà phê rang xay", maxLength: 200 })
  @IsString()
  @MinLength(1, { message: "name không được để trống" })
  @MaxLength(200)
  @Transform((params) => trimString(inputValue(params)))
  name!: string;

  @ApiPropertyOptional({ example: "Sản phẩm chủ lực", maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform((params) => trimOptionalNestedString(inputValue(params)))
  description?: string;
}

export class TargetAudienceItemDto implements TargetAudienceItem {
  @ApiProperty({ example: "Nhân viên văn phòng", maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform((params) => trimString(inputValue(params)))
  segment!: string;

  @ApiPropertyOptional({
    example: "22–35 tuổi, sống tại đô thị",
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform((params) => trimOptionalNestedString(inputValue(params)))
  characteristics?: string;
}

export class CompetitorItemDto implements CompetitorItem {
  @ApiProperty({ example: "Competitor A", maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform((params) => trimString(inputValue(params)))
  name!: string;

  @ApiPropertyOptional({ example: "Mạnh về độ phủ", maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform((params) => trimOptionalNestedString(inputValue(params)))
  notes?: string;
}

/** Field chung cho cả Create và Update — tách riêng để không lặp lại. */
class BusinessProfileFieldsDto {
  @ApiPropertyOptional({ example: "F&B", nullable: true, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform((params) => trimNullableString(inputValue(params)))
  industry?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform((params) => trimNullableString(inputValue(params)))
  description?: string | null;

  @ApiPropertyOptional({
    example: "https://example.com",
    nullable: true,
    maxLength: 500,
  })
  @IsOptional()
  @IsUrl({}, { message: "website phải là URL hợp lệ" })
  @MaxLength(500)
  @Transform((params) => trimNullableString(inputValue(params)))
  website?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform((params) => trimNullableString(inputValue(params)))
  address?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform((params) => trimNullableString(inputValue(params)))
  phone?: string | null;

  @ApiPropertyOptional({
    example: "contact@example.com",
    nullable: true,
    maxLength: 200,
  })
  @IsOptional()
  @IsEmail({}, { message: "email không đúng định dạng" })
  @MaxLength(200)
  @Transform((params) => trimNullableString(inputValue(params)))
  email?: string | null;

  @ApiPropertyOptional({ type: [NamedNoteDto], maxItems: 100 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => NamedNoteDto)
  products?: NamedNoteDto[];

  @ApiPropertyOptional({ type: [NamedNoteDto], maxItems: 100 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => NamedNoteDto)
  services?: NamedNoteDto[];

  @ApiPropertyOptional({ type: [TargetAudienceItemDto], maxItems: 50 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => TargetAudienceItemDto)
  targetAudience?: TargetAudienceItemDto[];

  @ApiPropertyOptional({ type: [CompetitorItemDto], maxItems: 50 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CompetitorItemDto)
  competitors?: CompetitorItemDto[];

  @ApiPropertyOptional({ type: [String], maxItems: 50 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  @Transform((params) => cleanStringArray(inputValue(params)))
  strengths?: string[];

  @ApiPropertyOptional({ nullable: true, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform((params) => trimNullableString(inputValue(params)))
  brandVoice?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: 50 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  @Transform((params) => cleanStringArray(inputValue(params)))
  allowedTopics?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 50 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  @Transform((params) => cleanStringArray(inputValue(params)))
  bannedTopics?: string[];

  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform((params) => trimNullableString(inputValue(params)))
  extraNotes?: string | null;
}

export class CreateBusinessDto
  extends BusinessProfileFieldsDto
  implements CreateBusinessRequest
{
  @ApiProperty({ example: "ABC Coffee", maxLength: 200 })
  @IsString()
  @MinLength(1, {
    message: "name không được để trống hoặc chỉ chứa khoảng trắng",
  })
  @MaxLength(200)
  @Transform((params) => trimString(inputValue(params)))
  name!: string;
}

/** Update: mọi field optional, và name (nếu có) vẫn phải qua validate + trim như create. */
export class UpdateBusinessDto
  extends BusinessProfileFieldsDto
  implements UpdateBusinessRequest
{
  @ApiPropertyOptional({ example: "ABC Coffee", maxLength: 200 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1, {
    message: "name không được để trống hoặc chỉ chứa khoảng trắng",
  })
  @MaxLength(200)
  @Transform((params) => trimString(inputValue(params)))
  name?: string;
}

export class ListBusinessesQueryDto implements ListBusinessesQuery {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform((params) => trimOptionalNestedString(inputValue(params)))
  search?: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform((params) => parseBoolean(inputValue(params)))
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    enum: ["createdAt", "updatedAt"],
    default: "updatedAt",
  })
  @IsOptional()
  @IsIn(["createdAt", "updatedAt"])
  sortBy?: "createdAt" | "updatedAt" = "updatedAt";

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";

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
