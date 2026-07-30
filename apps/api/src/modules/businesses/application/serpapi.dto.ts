import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";
import type {
    AddBusinessLocationFromSerpApiRequest,
    CreateBusinessFromSerpApiRequest,
    SerpApiAutocompleteRequest,
    SerpApiPreviewRequest,
} from "@seeding/contracts";

export class SerpApiAutocompleteDto implements SerpApiAutocompleteRequest {
    @IsString()
    @IsNotEmpty()
    input!: string;

    @IsString()
    @IsNotEmpty()
    sessionToken!: string;
}

export class SerpApiPreviewDto implements SerpApiPreviewRequest {
    @IsString()
    @IsNotEmpty()
    placeId!: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    sessionToken?: string;
}

export class CreateBusinessFromSerpApiDto implements CreateBusinessFromSerpApiRequest {
    @IsString()
    @IsNotEmpty()
    placeId!: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    sessionToken?: string;

    @IsOptional()
    @IsBoolean()
    includeLocation?: boolean;
}

export class AddBusinessLocationFromSerpApiDto implements AddBusinessLocationFromSerpApiRequest {
    @IsString()
    @IsNotEmpty()
    placeId!: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    sessionToken?: string;
}
