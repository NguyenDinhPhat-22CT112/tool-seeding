import { Inject, Injectable } from "@nestjs/common";
import { RequestContext } from "../../../shared/context/request-context";
import {
  BusinessRuleViolationError,
  ResourceNotFoundError,
} from "../../../shared/exceptions/domain.exceptions";
import {
  BUSINESS_REPOSITORY,
  BusinessEntity,
  BusinessRepository,
  CreateBusinessData,
  UpdateBusinessData,
} from "../domain/business.types";
import {
  CreateBusinessDto,
  ListBusinessesQueryDto,
  UpdateBusinessDto,
} from "./business.dto";
import {
  BusinessDetailResponse,
  BusinessListItemResponse,
  BusinessMapper,
} from "./business.mapper";
import { BusinessPolicy } from "./business.policy";
import { Paginated } from "../domain/business.types";

@Injectable()
export class BusinessService {
  constructor(
    @Inject(BUSINESS_REPOSITORY) private readonly repo: BusinessRepository,
    private readonly policy: BusinessPolicy,
  ) {}

  // ---------------------------------------------------------------------
  // CreateBusiness — core logic cho cả manual và SerpApi import
  // ---------------------------------------------------------------------
  async createEntity(
    ctx: RequestContext,
    data: CreateBusinessData,
  ): Promise<BusinessEntity> {
    this.policy.assertCanCreate(ctx);
    return this.repo.create(data);
  }

  async create(
    ctx: RequestContext,
    dto: CreateBusinessDto,
  ): Promise<BusinessDetailResponse> {
    const data: CreateBusinessData = {
      organizationId: ctx.organizationId,
      name: dto.name,
      industry: dto.industry ?? null,
      description: dto.description ?? null,
      website: dto.website ?? null,
      address: dto.address ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      products: dto.products ?? [],
      services: dto.services ?? [],
      targetAudience: dto.targetAudience ?? [],
      competitors: dto.competitors ?? [],
      strengths: dto.strengths ?? [],
      brandVoice: dto.brandVoice ?? null,
      allowedTopics: dto.allowedTopics ?? [],
      bannedTopics: dto.bannedTopics ?? [],
      extraNotes: dto.extraNotes ?? null,
      createdBy: ctx.userId,
    };

    const created = await this.createEntity(ctx, data);
    return BusinessMapper.toDetail(created);
  }

  // ---------------------------------------------------------------------
  // UpdateBusiness — không bao giờ nhận id/organizationId/createdBy/createdAt từ client (mục 2.3)
  // ---------------------------------------------------------------------
  async update(
    ctx: RequestContext,
    id: string,
    dto: UpdateBusinessDto,
  ): Promise<BusinessDetailResponse> {
    this.policy.assertCanUpdate(ctx);

    const existing = await this.repo.findByIdInOrg(id, ctx.organizationId);
    if (!existing) {
      throw new ResourceNotFoundError("doanh nghiệp", id);
    }
    if (!existing.isActive) {
      throw new BusinessRuleViolationError(
        "Doanh nghiệp đã ngừng hoạt động. Vui lòng khôi phục trước khi chỉnh sửa",
      );
    }
    if (Object.keys(dto).length === 0) {
      throw new BusinessRuleViolationError(
        "Cần cung cấp ít nhất một trường để cập nhật",
      );
    }

    const data: UpdateBusinessData = { ...dto };
    const updated = await this.repo.update(id, ctx.organizationId, data);
    if (!updated) {
      throw new BusinessRuleViolationError(
        "Trạng thái doanh nghiệp đã thay đổi, vui lòng tải lại và thử lại",
      );
    }
    return BusinessMapper.toDetail(updated);
  }

  // ---------------------------------------------------------------------
  // GetBusinessDetail
  // ---------------------------------------------------------------------
  async getDetail(
    ctx: RequestContext,
    id: string,
  ): Promise<BusinessDetailResponse> {
    const existing = await this.repo.findByIdInOrg(id, ctx.organizationId);
    if (!existing) {
      throw new ResourceNotFoundError("doanh nghiệp", id);
    }
    return BusinessMapper.toDetail(existing);
  }

  // ---------------------------------------------------------------------
  // ListBusinesses
  // ---------------------------------------------------------------------
  async list(
    ctx: RequestContext,
    query: ListBusinessesQueryDto,
  ): Promise<Paginated<BusinessListItemResponse>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const result = await this.repo.list({
      organizationId: ctx.organizationId,
      search: query.search,
      isActive: query.isActive,
      sortBy: query.sortBy ?? "updatedAt",
      sortOrder: query.sortOrder ?? "desc",
      page,
      pageSize,
    });

    return {
      items: result.items.map(({ business, sessionCount }) =>
        BusinessMapper.toListItem(business, sessionCount),
      ),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }  // ---------------------------------------------------------------------
  // DeactivateBusiness — soft delete (isActive = false)
  // ---------------------------------------------------------------------
  async deactivate(
    ctx: RequestContext,
    id: string,
  ): Promise<BusinessDetailResponse> {
    const existing = await this.repo.findByIdInOrg(id, ctx.organizationId);
    if (!existing) {
      throw new ResourceNotFoundError("doanh nghiệp", id);
    }
    const updated = await this.repo.update(id, ctx.organizationId, { isActive: false } as any);
    if (!updated) {
      throw new BusinessRuleViolationError("Không thể xoá doanh nghiệp");
    }
    return BusinessMapper.toDetail(updated);
  }
}
