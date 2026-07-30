import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  BusinessLocationResponse as BusinessLocationContract,
  BusinessLocationSource,
  SerpApiLinkStatus,
  SerpApiPrediction,
  SerpApiPreview as SerpApiPreviewContract,
  SerpApiBusinessStatus,
  SerpApiAutocompleteResponse as SerpApiAutocompleteContract,
  CreateBusinessFromSerpApiResponse as CreateBusinessFromSerpApiContract,
} from "@seeding/contracts";
import type { BusinessLocationEntity } from "../domain/business.types";
import { BusinessDetailResponse } from "./business.mapper";

export class BusinessLocationResponse implements BusinessLocationContract {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  organizationId!: string;
  @ApiProperty()
  businessId!: string;
  @ApiProperty()
  name!: string;
  @ApiPropertyOptional({ nullable: true })
  address!: string | null;
  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;
  @ApiPropertyOptional({ nullable: true })
  website!: string | null;
  @ApiPropertyOptional({ nullable: true })
  primaryType!: string | null;
  @ApiPropertyOptional({ nullable: true })
  serpapiPlaceId?: string | null;
  @ApiPropertyOptional({ nullable: true })
  serpapiLocationId?: string | null;
  @ApiPropertyOptional({ enum: ["LINKED", "DISCONNECTED"], nullable: true })
  serpapiPlaceLinkStatus?: SerpApiLinkStatus | null;
  @ApiPropertyOptional({ nullable: true })
  mapsUrl?: string | null;
  @ApiPropertyOptional({ nullable: true })
  rating!: number | null;
  @ApiPropertyOptional({ nullable: true })
  userRatingCount!: number | null;
  @ApiProperty({
    enum: ["MANUAL", "SERPAPI"],
  })
  source!: BusinessLocationSource;
  @ApiProperty()
  isActive!: boolean;
  @ApiProperty({ format: "date-time" })
  createdAt!: string;
  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class BusinessLocationListResponse {
  @ApiProperty({ type: [BusinessLocationResponse] })
  items!: BusinessLocationResponse[];
}

export class BusinessLocationMapper {
  static toResponse(
    entity: BusinessLocationEntity,
  ): BusinessLocationResponse {
    return {
      ...entity,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}

export class SerpApiAutocompleteResponse implements SerpApiAutocompleteContract {
  @ApiProperty()
  predictions!: SerpApiPrediction[];
  @ApiProperty()
  sessionToken!: string;
}

export class SerpApiPreviewResponse implements SerpApiPreviewContract {
  @ApiProperty({ enum: ["SERPAPI"] })
  provider!: "SERPAPI";
  @ApiProperty()
  placeId!: string;
  @ApiProperty()
  displayName!: string;
  @ApiPropertyOptional({ nullable: true })
  formattedAddress!: string | null;
  @ApiProperty({ type: [String] })
  types!: string[];
  @ApiPropertyOptional({ nullable: true })
  primaryType!: string | null;
  @ApiProperty({ enum: ["UNKNOWN", "OPERATIONAL", "CLOSED_TEMPORARILY", "CLOSED_PERMANENTLY"] })
  businessStatus!: SerpApiBusinessStatus;
  @ApiPropertyOptional({ nullable: true })
  mapsUrl!: string | null;
  @ApiPropertyOptional({ nullable: true })
  nationalPhoneNumber!: string | null;
  @ApiPropertyOptional({ nullable: true })
  websiteUri!: string | null;
  @ApiPropertyOptional({ nullable: true })
  rating!: number | null;
  @ApiPropertyOptional({ nullable: true })
  userRatingCount!: number | null;
}

export class CreateBusinessFromSerpApiResponse implements CreateBusinessFromSerpApiContract {
  @ApiProperty({ type: BusinessDetailResponse })
  business!: BusinessDetailResponse;
  @ApiPropertyOptional({ type: BusinessLocationResponse })
  location?: BusinessLocationResponse;
}
