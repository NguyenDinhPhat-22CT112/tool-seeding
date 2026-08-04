import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { Transform, TransformFnParams } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

function trimString({ value }: TransformFnParams): unknown {
  const input = value as unknown;
  return typeof input === "string" ? input.trim() : input;
}

export class TriggerReviewCrawlDto {
  @ApiProperty({ description: "businessLocationId đã liên kết SerpAPI", maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trimString)
  businessLocationId!: string;
}
