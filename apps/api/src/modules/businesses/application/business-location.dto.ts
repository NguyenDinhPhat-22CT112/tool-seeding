import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";
import type {
    CreateBusinessLocationRequest,
    UpdateBusinessLocationRequest,
} from "@seeding/contracts";

export class CreateBusinessLocationDto implements CreateBusinessLocationRequest {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsString()
    address?: string | null;

    @IsOptional()
    @IsString()
    phone?: string | null;

    @IsOptional()
    @IsString()
    website?: string | null;
}

export class UpdateBusinessLocationDto implements UpdateBusinessLocationRequest {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    address?: string | null;

    @IsOptional()
    @IsString()
    phone?: string | null;

    @IsOptional()
    @IsString()
    website?: string | null;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
