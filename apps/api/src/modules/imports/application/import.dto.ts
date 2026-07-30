import { Transform, TransformFnParams } from "class-transformer";
import { IsObject, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import type { MapImportColumnsRequest } from "@seeding/contracts";

export class MapImportColumnsDto implements MapImportColumnsRequest {
  @ApiProperty({
    example: { "Nội dung": "content", Sao: "rating" },
    description: "Map cột nguồn → target field",
  })
  @IsObject()
  columnMapping!: Record<string, string>;
}

export class UploadImportFileDto {
  @ApiProperty({ type: "string", format: "binary" })
  file!: Express.Multer.File;
}

function trimString({ value }: TransformFnParams): unknown {
  const input = value as unknown;
  return typeof input === "string" ? input.trim() : input;
}

export class MapImportColumnsBodyDto {
  @ApiProperty()
  @IsObject()
  columnMapping!: Record<string, string>;
}

export { trimString };
