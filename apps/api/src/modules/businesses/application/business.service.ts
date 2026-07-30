import { Inject, Injectable } from "@nestjs/common";
import { RequestContext } from "../../../shared/context/request-context";
import {
  BusinessRuleViolationError,
  ResourceNotFoundError,
} from "../../../shared/exceptions/domain.exceptions";
import {
  BUSINESS_REPOSITORY,
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
  DeactivateBusinessResponse,
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
  // CreateBusiness
  // ---------------------------------------------------------------------
  async create(
    ctx: RequestContext,
    dto: CreateBusinessDto,
  ): Promise<BusinessDetailResponse> {
    this.policy.assertCanCreate(ctx);

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

    const created = await this.repo.create(data);
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
  }

  // ---------------------------------------------------------------------
  // DeactivateBusiness — chỉ đổi isActive; deletedAt dành cho thao tác xóa riêng.
  // ---------------------------------------------------------------------
  async deactivate(
    ctx: RequestContext,
    id: string,
  ): Promise<DeactivateBusinessResponse> {
    this.policy.assertCanDeactivateOrRestore(ctx);

    const result = await this.repo.deactivate(id, ctx.organizationId);
    if (!result.business) {
      throw new ResourceNotFoundError("doanh nghiệp", id);
    }
    if (!result.changed && !result.business.isActive) {
      throw new BusinessRuleViolationError("Doanh nghiệp đã ngừng hoạt động");
    }
    if (result.blockingSessionCount > 0) {
      throw new BusinessRuleViolationError(
        `Không thể ngừng hoạt động: còn ${result.blockingSessionCount} đợt phân tích chưa kết thúc. ` +
          "Vui lòng hoàn tất hoặc lưu trữ các session này trước.",
      );
    }
    return BusinessMapper.toDeactivateResult(result.business, result.archivedDraftCount);
  }

  // ---------------------------------------------------------------------
  // RestoreBusiness
  // ---------------------------------------------------------------------
  async restore(
    ctx: RequestContext,
    id: string,
  ): Promise<BusinessDetailResponse> {
    this.policy.assertCanDeactivateOrRestore(ctx);

    const result = await this.repo.restore(id, ctx.organizationId);
    if (!result.business) {
      throw new ResourceNotFoundError("doanh nghiệp", id);
    }
    if (!result.changed) {
      throw new BusinessRuleViolationError(
        "Doanh nghiệp đang hoạt động, không cần khôi phục",
      );
    }
    return BusinessMapper.toDetail(result.business);
  }
}
