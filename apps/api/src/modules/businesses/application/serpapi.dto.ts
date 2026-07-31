import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";
import type {
    AddBusinessLocationFromSerpApiRequest,
    CreateBusinessFromSerpApiRequest,
    SerpApiAutocompleteRequest,
    SerpApiPreviewRequest,
} from "@seeding/contracts";

export class SerpApiAutocompleteDto implements SerpApiAutocompleteRequest {
    @ApiProperty({ example: "Highlands Coffee", description: "Tên địa điểm cần tìm" })
    @IsString()
    @IsNotEmpty()
    input!: string;

    @ApiProperty({ example: "session-abc-123", description: "Token tuỳ ý để nhóm request" })
    @IsString()
    @IsNotEmpty()
    sessionToken!: string;
}

export class SerpApiPreviewDto implements SerpApiPreviewRequest {
    @ApiProperty({ example: "ChIJrZq1YB4GdTER2i3I1mKVzFo", description: "Place ID từ autocomplete" })
    @IsString()
    @IsNotEmpty()
    placeId!: string;

    @ApiPropertyOptional({ example: "session-abc-123" })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    sessionToken?: string;
}

export class CreateBusinessFromSerpApiDto implements CreateBusinessFromSerpApiRequest {
    @ApiProperty({ example: "ChIJrZq1YB4GdTER2i3I1mKVzFo", description: "Place ID từ SerpApi preview" })
    @IsString()
    @IsNotEmpty()
    placeId!: string;

    @ApiPropertyOptional({ example: "session-abc-123" })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    sessionToken?: string;

    @ApiPropertyOptional({ example: true, description: "Tạo kèm location từ place" })
    @IsOptional()
    @IsBoolean()
    includeLocation?: boolean;

    @ApiPropertyOptional({ example: "Highlands Coffee - Chi nhánh" })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: "123 Nguyễn Huệ, Q.1, TP.HCM" })
    @IsOptional()
    @IsString()
    address?: string | null;

    @ApiPropertyOptional({ example: "0901234567" })
    @IsOptional()
    @IsString()
    phone?: string | null;

    @ApiPropertyOptional({ example: "https://highlandscoffee.com" })
    @IsOptional()
    @IsString()
    website?: string | null;

    @ApiPropertyOptional({ example: "F&B" })
    @IsOptional()
    @IsString()
    industry?: string | null;
}

export class AddBusinessLocationFromSerpApiDto implements AddBusinessLocationFromSerpApiRequest {
    @ApiProperty({ example: "ChIJrZq1YB4GdTER2i3I1mKVzFo", description: "Place ID từ SerpApi preview" })
    @IsString()
    @IsNotEmpty()
    placeId!: string;

    @ApiPropertyOptional({ example: "session-abc-123" })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    sessionToken?: string;

    @ApiPropertyOptional({ example: "Highlands Coffee - Chi nhánh" })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: "123 Nguyễn Huệ, Q.1, TP.HCM" })
    @IsOptional()
    @IsString()
    address?: string | null;

    @ApiPropertyOptional({ example: "0901234567" })
    @IsOptional()
    @IsString()
    phone?: string | null;

    @ApiPropertyOptional({ example: "https://highlandscoffee.com" })
    @IsOptional()
    @IsString()
    website?: string | null;
}
