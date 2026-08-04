import { Inject, Injectable } from "@nestjs/common";
import type { RequestContext } from "../../../shared/context/request-context";
import {
  BusinessRuleViolationError,
  ResourceNotFoundError,
} from "../../../shared/exceptions/domain.exceptions";
import {
  BUSINESS_REPOSITORY,
  type BusinessRepository,
} from "../domain/business.types";
import { BusinessLocationListResponse, BusinessLocationMapper, BusinessLocationResponse } from "./business-location.mapper";
import { BusinessPolicy } from "./business.policy";
import { UpdateBusinessLocationDto, CreateBusinessLocationDto } from "./business-location.dto";

@Injectable()
export class BusinessLocationService {
  constructor(
    @Inject(BUSINESS_REPOSITORY) private readonly repo: BusinessRepository,
    private readonly policy: BusinessPolicy,
  ) {}

  async create(
    ctx: RequestContext,
    businessId: string,
    dto: CreateBusinessLocationDto,
  ): Promise<BusinessLocationResponse> {
    this.policy.assertCanUpdate(ctx);
    const business = await this.requireBusiness(ctx, businessId);
    if (!business.isActive) {
      throw new BusinessRuleViolationError(
        "Không thể thêm địa điểm cho doanh nghiệp đã ngừng hoạt động",
      );
    }
    const created = await this.repo.createLocation({
      organizationId: ctx.organizationId,
      businessId,
      name: dto.name,
      address: dto.address ?? null,
      phone: dto.phone ?? null,
      website: dto.website ?? null,
      primaryType: null,
      rating: null,
      userRatingCount: null,
      source: "MANUAL",
      isActive: true,
    });
    if (!created) {
      throw new BusinessRuleViolationError(
        "Không thể tạo địa điểm — có thể đã trùng dữ liệu",
      );
    }
    return BusinessLocationMapper.toResponse(created);
  }

  async remove(
    ctx: RequestContext,
    businessId: string,
    locationId: string,
  ): Promise<BusinessLocationResponse> {
    this.policy.assertCanUpdate(ctx);
    await this.requireBusiness(ctx, businessId);
    const deleted = await this.repo.deleteLocation(
      locationId,
      businessId,
      ctx.organizationId,
    );
    if (!deleted) {
      throw new ResourceNotFoundError("địa điểm doanh nghiệp", locationId);
    }
    return BusinessLocationMapper.toResponse(deleted);
  }


  async list(
    ctx: RequestContext,
    businessId: string,
  ): Promise<BusinessLocationListResponse> {
    await this.requireBusiness(ctx, businessId);
    const locations = await this.repo.listLocations(
      businessId,
      ctx.organizationId,
    );
    return {
      items: locations.map((location) =>
        BusinessLocationMapper.toResponse(location),
      ),
    };
  }

  async get(
    ctx: RequestContext,
    businessId: string,
    locationId: string,
  ): Promise<BusinessLocationResponse> {
    await this.requireBusiness(ctx, businessId);
    const location = await this.repo.findLocation(
      locationId,
      businessId,
      ctx.organizationId,
    );
    if (!location) {
      throw new ResourceNotFoundError("địa điểm doanh nghiệp", locationId);
    }
    return BusinessLocationMapper.toResponse(location);
  }

  async update(
    ctx: RequestContext,
    businessId: string,
    locationId: string,
    dto: UpdateBusinessLocationDto,
  ): Promise<BusinessLocationResponse> {
    this.policy.assertCanUpdate(ctx);
    const business = await this.requireBusiness(ctx, businessId);
    if (!business.isActive) {
      throw new BusinessRuleViolationError(
        "Không thể sửa địa điểm của doanh nghiệp đã ngừng hoạt động",
      );
    }
    if (Object.keys(dto).length === 0) {
      throw new BusinessRuleViolationError(
        "Cần cung cấp ít nhất một trường để cập nhật địa điểm",
      );
    }
    const updated = await this.repo.updateLocation(
      locationId,
      businessId,
      ctx.organizationId,
      dto,
    );
    if (!updated) {
      throw new ResourceNotFoundError("địa điểm doanh nghiệp", locationId);
    }
    return BusinessLocationMapper.toResponse(updated);
  }

  private async requireBusiness(ctx: RequestContext, businessId: string) {
    const business = await this.repo.findByIdInOrg(
      businessId,
      ctx.organizationId,
    );
    if (!business) {
      throw new ResourceNotFoundError("doanh nghiệp", businessId);
    }
    return business;
  }
}
