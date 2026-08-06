import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@seeding/database";
import type { BusinessProfileSnapshot } from "@seeding/contracts";
import { RequestContext } from "../../../shared/context/request-context";
import {
  BusinessRuleViolationError,
  InvalidStateTransitionError,
  ResourceNotFoundError,
} from "../../../shared/exceptions/domain.exceptions";
import { AnalysisSessionStateMachine } from "../domain/analysis-session-state-machine";
import {
  ANALYSIS_SESSION_REPOSITORY,
  AnalysisSessionRepository,
  AnalysisSessionStatus,
  CreateAnalysisSessionData,
  Paginated,
  UpdateAnalysisSessionData,
} from "../domain/analysis-session.types";
import {
  CreateAnalysisSessionDto,
  ListAnalysisSessionsQueryDto,
  UpdateAnalysisSessionDto,
} from "./analysis-session.dto";
import {
  AnalysisSessionDetailResponse,
  AnalysisSessionListItemResponse,
  AnalysisSessionMapper,
} from "./analysis-session.mapper";
import { AnalysisSessionPolicy } from "./analysis-session.policy";

@Injectable()
export class AnalysisSessionService {
  constructor(
    @Inject(ANALYSIS_SESSION_REPOSITORY) private readonly repo: AnalysisSessionRepository,
    private readonly prisma: PrismaService,
    private readonly policy: AnalysisSessionPolicy,
  ) {}

  async create(
    ctx: RequestContext,
    dto: CreateAnalysisSessionDto,
  ): Promise<AnalysisSessionDetailResponse> {
    this.policy.assertCanCreate(ctx);

    const dateFrom = dto.dateFrom ? new Date(dto.dateFrom) : null;
    const dateTo = dto.dateTo ? new Date(dto.dateTo) : null;
    this.assertValidDateRange(dateFrom, dateTo);

    const data: CreateAnalysisSessionData = {
      organizationId: ctx.organizationId,
      businessId: dto.businessId,
      name: dto.name,
      objective: dto.objective ?? null,
      focusProduct: dto.focusProduct ?? null,
      dateFrom,
      dateTo,
      createdBy: ctx.userId,
    };

    const session = await this.prisma.$transaction(async (tx) => {
      const business = await this.repo.lockAndFindBusiness(
        dto.businessId, ctx.organizationId, tx,
      );
      if (!business) {
        throw new ResourceNotFoundError("doanh nghiệp", dto.businessId);
      }
      if (!business.isActive) {
        throw new BusinessRuleViolationError(
          "Không thể tạo đợt phân tích cho doanh nghiệp đã ngừng hoạt động",
        );
      }

      return this.repo.create(data, tx);
    });

    return AnalysisSessionMapper.toDetail(session, 0);
  }

  async getDetail(
    ctx: RequestContext,
    id: string,
  ): Promise<AnalysisSessionDetailResponse> {
    const session = await this.repo.findByIdInOrg(id, ctx.organizationId);
    if (!session) {
      throw new ResourceNotFoundError("đợt phân tích", id);
    }
    const feedbackCount = await this.repo.countFeedbacks(id, ctx.organizationId);
    return AnalysisSessionMapper.toDetail(session, feedbackCount);
  }

  async list(
    ctx: RequestContext,
    query: ListAnalysisSessionsQueryDto,
  ): Promise<Paginated<AnalysisSessionListItemResponse>> {
    const result = await this.repo.list({
      organizationId: ctx.organizationId,
      businessId: query.businessId,
      status: query.status,
      createdFrom: query.createdFrom ? new Date(query.createdFrom) : undefined,
      createdTo: query.createdTo ? new Date(query.createdTo) : undefined,
      keyword: query.keyword,
      createdBy: query.createdBy,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });

    return {
      items: result.items.map(({ session, feedbackCount, businessName }) =>
        AnalysisSessionMapper.toListItem(session, feedbackCount, businessName),
      ),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  async listByBusiness(
    ctx: RequestContext,
    businessId: string,
    query: ListAnalysisSessionsQueryDto,
  ): Promise<Paginated<AnalysisSessionListItemResponse>> {
    const exists = await this.repo.businessExistsInOrg(
      businessId,
      ctx.organizationId,
    );
    if (!exists) {
      throw new ResourceNotFoundError("doanh nghiệp", businessId);
    }
    return this.list(ctx, { ...query, businessId });
  }

  async update(
    ctx: RequestContext,
    id: string,
    dto: UpdateAnalysisSessionDto,
  ): Promise<AnalysisSessionDetailResponse> {
    this.policy.assertCanEditDraft(ctx);

    const session = await this.repo.findByIdInOrg(id, ctx.organizationId);
    if (!session) {
      throw new ResourceNotFoundError("đợt phân tích", id);
    }
    if (session.status !== "DRAFT") {
      throw new BusinessRuleViolationError(
        `Chỉ có thể sửa session ở trạng thái DRAFT (hiện tại: ${session.status})`,
      );
    }
    if (Object.keys(dto).length === 0) {
      throw new BusinessRuleViolationError(
        "Cần cung cấp ít nhất một trường để cập nhật",
      );
    }

    const dateFrom =
      dto.dateFrom === null
        ? null
        : dto.dateFrom !== undefined
          ? new Date(dto.dateFrom)
          : undefined;
    const dateTo =
      dto.dateTo === null
        ? null
        : dto.dateTo !== undefined
          ? new Date(dto.dateTo)
          : undefined;
    this.assertValidDateRange(
      dateFrom !== undefined ? dateFrom : session.dateFrom,
      dateTo !== undefined ? dateTo : session.dateTo,
    );

    const data: UpdateAnalysisSessionData = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.objective !== undefined ? { objective: dto.objective } : {}),
      ...(dto.focusProduct !== undefined ? { focusProduct: dto.focusProduct } : {}),
      ...(dateFrom !== undefined ? { dateFrom } : {}),
      ...(dateTo !== undefined ? { dateTo } : {}),
    };

    const updated = await this.repo.updateFields(id, ctx.organizationId, data);
    if (!updated) {
      throw new InvalidStateTransitionError(
        "Session không còn ở trạng thái DRAFT, vui lòng tải lại và thử lại",
      );
    }
    const feedbackCount = await this.repo.countFeedbacks(id, ctx.organizationId);
    return AnalysisSessionMapper.toDetail(updated, feedbackCount);
  }

  async startDataCollection(
    ctx: RequestContext,
    id: string,
  ): Promise<AnalysisSessionDetailResponse> {
    this.policy.assertCanEditDraft(ctx);

    const session = await this.prisma.$transaction(async (tx) => {
      const sessionEntity = await this.repo.findByIdWithLock(
        id, ctx.organizationId, tx,
      );
      if (!sessionEntity) {
        throw new ResourceNotFoundError("đợt phân tích", id);
      }
      if (sessionEntity.status !== "DRAFT") {
        throw new InvalidStateTransitionError(
          `Không thể chuyển trạng thái từ ${sessionEntity.status} sang DATA_COLLECTION`,
        );
      }

      const business = await this.repo.lockAndFindBusiness(
        sessionEntity.businessId, ctx.organizationId, tx,
      );
      if (!business) {
        throw new BusinessRuleViolationError(
          "Không thể bắt đầu: doanh nghiệp không còn khả dụng",
        );
      }
      if (!business.isActive) {
        throw new BusinessRuleViolationError(
          "Không thể bắt đầu đợt phân tích: doanh nghiệp đã ngừng hoạt động",
        );
      }

      const businessRow = await tx.business.findFirst({
        where: { id: sessionEntity.businessId, organizationId: ctx.organizationId },
      });
      const snapshot: BusinessProfileSnapshot = {
        id: businessRow!.id,
        name: businessRow!.name,
        industry: businessRow!.industry,
        description: businessRow!.description,
        website: businessRow!.website,
        address: businessRow!.address,
        phone: businessRow!.phone,
        email: businessRow!.email,
        products: businessRow!.products as unknown as BusinessProfileSnapshot["products"],
        services: businessRow!.services as unknown as BusinessProfileSnapshot["services"],
        targetAudience: businessRow!.targetAudience as unknown as BusinessProfileSnapshot["targetAudience"],
        competitors: businessRow!.competitors as unknown as BusinessProfileSnapshot["competitors"],
        strengths: businessRow!.strengths as unknown as string[],
        brandVoice: businessRow!.brandVoice,
        allowedTopics: businessRow!.allowedTopics as unknown as string[],
        bannedTopics: businessRow!.bannedTopics as unknown as string[],
        extraNotes: businessRow!.extraNotes,
        sourceUpdatedAt: businessRow!.updatedAt.toISOString(),
      };

      const updated = await this.repo.transitionFromDraft(
        id, ctx.organizationId, "DATA_COLLECTION", snapshot, tx,
      );
      if (!updated) {
        throw new InvalidStateTransitionError(
          "Trạng thái session đã thay đổi, vui lòng tải lại và thử lại",
        );
      }

      return updated;
    });

    const feedbackCount = await this.repo.countFeedbacks(id, ctx.organizationId);
    return AnalysisSessionMapper.toDetail(session, feedbackCount);
  }

  async complete(
    ctx: RequestContext,
    id: string,
  ): Promise<AnalysisSessionDetailResponse> {
    this.policy.assertCanEditDraft(ctx);
    return this.transition(ctx, id, "COMPLETED");
  }

  async archive(
    ctx: RequestContext,
    id: string,
  ): Promise<AnalysisSessionDetailResponse> {
    const session = await this.repo.findByIdInOrg(id, ctx.organizationId);
    if (!session) {
      throw new ResourceNotFoundError("đợt phân tích", id);
    }
    this.policy.assertCanArchive(ctx, session);
    return this.transition(ctx, id, "ARCHIVED", session.status);
  }

  private async transition(
    ctx: RequestContext,
    id: string,
    nextStatus: AnalysisSessionStatus,
    knownCurrentStatus?: AnalysisSessionStatus,
  ): Promise<AnalysisSessionDetailResponse> {
    let currentStatus = knownCurrentStatus;
    if (!currentStatus) {
      const session = await this.repo.findByIdInOrg(id, ctx.organizationId);
      if (!session) {
        throw new ResourceNotFoundError("đợt phân tích", id);
      }
      currentStatus = session.status;
    }

    if (!AnalysisSessionStateMachine.canTransition(currentStatus, nextStatus)) {
      throw new InvalidStateTransitionError(
        `Không thể chuyển trạng thái từ ${currentStatus} sang ${nextStatus}`,
      );
    }

    const now = new Date();
    const updated = await this.repo.transitionStatus(
      id,
      ctx.organizationId,
      currentStatus,
      nextStatus,
      nextStatus === "ARCHIVED"
        ? { archivedAt: now }
        : nextStatus === "COMPLETED"
          ? { completedAt: now }
          : undefined,
    );
    if (!updated) {
      throw new InvalidStateTransitionError(
        "Trạng thái session đã thay đổi, vui lòng tải lại và thử lại",
      );
    }

    const feedbackCount = await this.repo.countFeedbacks(id, ctx.organizationId);
    return AnalysisSessionMapper.toDetail(updated, feedbackCount);
  }

  private assertValidDateRange(dateFrom: Date | null, dateTo: Date | null): void {
    if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
      throw new BusinessRuleViolationError(
        "dateFrom phải nhỏ hơn hoặc bằng dateTo",
      );
    }
  }

  async delete(
    ctx: RequestContext,
    id: string,
  ): Promise<AnalysisSessionDetailResponse> {
    this.policy.assertCanDelete(ctx);
    const session = await this.repo.findByIdInOrg(id, ctx.organizationId);
    if (!session) {
      throw new ResourceNotFoundError("đợt phân tích", id);
    }
    await this.prisma.$transaction(async (tx) => {
      await this.repo.hardDelete(id, ctx.organizationId, tx);
    });
    return AnalysisSessionMapper.toDetail(session, 0);
  }
}
