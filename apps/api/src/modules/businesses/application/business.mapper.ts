import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  BusinessDetailResponse as BusinessDetailContract,
  BusinessListItemResponse as BusinessListItemContract,
  BusinessListResponse as BusinessListContract,
  DeactivateBusinessResponse as DeactivateBusinessContract,
} from "@seeding/contracts";
import { BusinessEntity } from "../domain/business.types";
import { NamedNoteDto, TargetAudienceItemDto, CompetitorItemDto } from "./business.dto";

/** Shape trả về cho danh sách (mục 2.1) — nhẹ, không kèm toàn bộ hồ sơ chi tiết. */
export class BusinessListItemResponse implements BusinessListItemContract {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  industry!: string | null;

  @ApiPropertyOptional({ nullable: true })
  website!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  sessionCount!: number;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

/** Shape trả về cho chi tiết — đầy đủ hồ sơ. */
export class BusinessDetailResponse implements BusinessDetailContract {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  industry!: string | null;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  website!: string | null;

  @ApiPropertyOptional({ nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiProperty({ type: [NamedNoteDto], description: "Sản phẩm" })
  products!: BusinessEntity["products"];

  @ApiProperty({ type: [NamedNoteDto], description: "Dịch vụ" })
  services!: BusinessEntity["services"];

  @ApiProperty({ type: [TargetAudienceItemDto], description: "Đối tượng mục tiêu" })
  targetAudience!: BusinessEntity["targetAudience"];

  @ApiProperty({ type: [CompetitorItemDto], description: "Đối thủ cạnh tranh" })
  competitors!: BusinessEntity["competitors"];

  @ApiProperty({ type: [String] })
  strengths!: string[];

  @ApiPropertyOptional({ nullable: true })
  brandVoice!: string | null;

  @ApiProperty({ type: [String] })
  allowedTopics!: string[];

  @ApiProperty({ type: [String] })
  bannedTopics!: string[];

  @ApiPropertyOptional({ nullable: true })
  extraNotes!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class DeactivateBusinessResponse
  extends BusinessDetailResponse
  implements DeactivateBusinessContract
{
  @ApiProperty()
  archivedDraftCount!: number;
}

export class BusinessListResponse implements BusinessListContract {
  @ApiProperty({ type: [BusinessListItemResponse] })
  items!: BusinessListItemResponse[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

export class BusinessMapper {
  static toDetail(entity: BusinessEntity): BusinessDetailResponse {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      name: entity.name,
      industry: entity.industry,
      description: entity.description,
      website: entity.website,
      address: entity.address,
      phone: entity.phone,
      email: entity.email,
      products: entity.products,
      services: entity.services,
      targetAudience: entity.targetAudience,
      competitors: entity.competitors,
      strengths: entity.strengths,
      brandVoice: entity.brandVoice,
      allowedTopics: entity.allowedTopics,
      bannedTopics: entity.bannedTopics,
      extraNotes: entity.extraNotes,
      isActive: entity.isActive,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  static toListItem(
    entity: BusinessEntity,
    sessionCount: number,
  ): BusinessListItemResponse {
    return {
      id: entity.id,
      name: entity.name,
      industry: entity.industry,
      website: entity.website,
      isActive: entity.isActive,
      sessionCount,
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
