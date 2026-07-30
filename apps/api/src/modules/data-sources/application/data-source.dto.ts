import { Transform, TransformFnParams } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength, MinLength, Matches } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { CreateDataSourceRequest, SourceType } from "@seeding/contracts";

function trimString({ value }: TransformFnParams): unknown {
  const input = value as unknown;
  return typeof input === "string" ? input.trim() : input;
}

const SOURCE_TYPES: SourceType[] = ["MANUAL", "EXCEL", "CSV"];

export class CreateDataSourceDto implements CreateDataSourceRequest {
  @ApiProperty({ example: "Nhập tay Q3", maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform(trimString)
  name!: string;

  @ApiProperty({ enum: SOURCE_TYPES })
  @IsIn(SOURCE_TYPES)
  sourceType!: SourceType;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9_-]+$/)
  @Transform(trimString)
  businessLocationId?: string | null;
}
