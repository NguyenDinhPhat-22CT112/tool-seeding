import { Inject, Injectable } from "@nestjs/common";
import type {
  StrategyVersionListResponse,
  StrategyVersionResponse,
  StrategyVersionStatus,
} from "@seeding/contracts";
import { RequestContext } from "../../../shared/context/request-context";
import {
  BusinessRuleViolationError,
  DomainError,
  ResourceNotFoundError,
} from "../../../shared/exceptions/domain.exceptions";
import {
  ANALYSIS_SESSION_REPOSITORY,
  AnalysisSessionRepository,
} from "../../analysis-sessions/domain/analysis-session.types";
import { StrategyVersionStateMachine } from "../domain/strategy-state-machine";
import {
  CreateRevisionData,
  STRATEGY_REPOSITORY,
  StrategyRepository,
  UpdateVersionContentData,
  VersionTransitionOptions,
} from "../domain/strategy.types";
import {
  CreateStrategyRevisionDto,
  ListStrategyVersionsQueryDto,
  ReviewStrategyVersionDto,
  UpdateStrategyVersionDto,
} from "./strategy.dto";
import { StrategyMapper } from "./strategy.mapper";
import { StrategyPolicy } from "./strategy.policy";

const WRITABLE_SESSION_STATUSES = ["STRATEGY_BUILDING"] as const;

@Injectable()
export class StrategyService {
  constructor(
    @Inject(STRATEGY_REPOSITORY) private readonly repo: StrategyRepository,
    @Inject(ANALYSIS_SESSION_REPOSITORY)
    private readonly sessionRepo: AnalysisSessionRepository,
    private readonly policy: StrategyPolicy,
  ) {}

  async getStrategy(ctx: RequestContext, sessionId: string) {
    await this.assertSessionViewable(ctx, sessionId);
    const strategy = await this.repo.findBySession(sessionId);
    if (!strategy) {
      throw new DomainError("STRATEGY_NOT_FOUND");
    }
    const current = strategy.currentVersionId
      ? await this.repo.findVersionDetailByIdInSession(
          strategy.currentVersionId,
          sessionId,
        )
      : null;
    const versionCount = await this.repo.countVersions(strategy.id);
    return StrategyMapper.toStrategy(strategy, current, versionCount);
  }

  async listVersions(
    ctx: RequestContext,
    sessionId: string,
    query: ListStrategyVersionsQueryDto,
  ): Promise<StrategyVersionListResponse> {
    await this.assertSessionViewable(ctx, sessionId);
    const strategy = await this.repo.findBySession(sessionId);
    if (!strategy) {
      throw new DomainError("STRATEGY_NOT_FOUND");
    }
    const result = await this.repo.listVersions({
      strategyId: strategy.id,
      analysisSessionId: sessionId,
      status: query.status,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
    return {
      items: result.items.map(({ version }) =>
        StrategyMapper.toVersionListItem(version),
      ),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  async getVersion(
    ctx: RequestContext,
    sessionId: string,
    versionId: string,
  ): Promise<StrategyVersionResponse> {
    await this.assertSessionViewable(ctx, sessionId);
    const detail = await this.repo.findVersionDetailByIdInSession(
      versionId,
      sessionId,
    );
    if (!detail) {
      throw new DomainError("STRATEGY_VERSION_NOT_FOUND");
    }
    return StrategyMapper.toVersionResponse(detail);
  }

  async updateVersion(
    ctx: RequestContext,
    sessionId: string,
    versionId: string,
    dto: UpdateStrategyVersionDto,
  ): Promise<StrategyVersionResponse> {
    this.policy.assertCanWrite(ctx);
    await this.assertSessionWritable(ctx, sessionId);

    const version = await this.repo.findVersionDetailByIdInSession(
      versionId,
      sessionId,
    );
    if (!version) {
      throw new DomainError("STRATEGY_VERSION_NOT_FOUND");
    }
    if (!StrategyVersionStateMachine.isEditable(version.status)) {
      throw new DomainError("STRATEGY_LOCKED_IMMUTABLE");
    }
    if (Object.keys(dto).length === 0) {
      throw new BusinessRuleViolationError(
        "Cần cung cấp ít nhất một trường để cập nhật",
      );
    }

    const data: UpdateVersionContentData = {
      ...(dto.context !== undefined ? { context: dto.context } : {}),
      ...(dto.objectives !== undefined ? { objectives: dto.objectives } : {}),
      ...(dto.targetSegments !== undefined
        ? { targetSegments: dto.targetSegments }
        : {}),
      ...(dto.priorityProblems !== undefined
        ? { priorityProblems: dto.priorityProblems }
        : {}),
      ...(dto.mainMessages !== undefined
        ? { mainMessages: dto.mainMessages }
        : {}),
      ...(dto.responsePrinciples !== undefined
        ? { responsePrinciples: dto.responsePrinciples }
        : {}),
      ...(dto.contentThemes !== undefined
        ? { contentThemes: dto.contentThemes }
        : {}),
      ...(dto.risks !== undefined ? { risks: dto.risks } : {}),
      ...(dto.kpis !== undefined ? { kpis: dto.kpis } : {}),
      ...(dto.additionalNotes !== undefined
        ? { additionalNotes: dto.additionalNotes }
        : {}),
      ...(dto.editReason !== undefined ? { editReason: dto.editReason } : {}),
      editedBy: ctx.userId,
    };

    const updated = await this.repo.updateVersionContent(
      versionId,
      sessionId,
      data,
    );
    if (!updated) {
      throw new DomainError("STRATEGY_WRONG_STATE");
    }
    const detail = await this.repo.findVersionDetailByIdInSession(
      versionId,
      sessionId,
    );
    return StrategyMapper.toVersionResponse(detail!);
  }

  async submitVersion(
    ctx: RequestContext,
    sessionId: string,
    versionId: string,
  ): Promise<StrategyVersionResponse> {
    this.policy.assertCanWrite(ctx);
    await this.assertSessionWritable(ctx, sessionId);
    return this.transition(
      ctx,
      sessionId,
      versionId,
      "WAITING_APPROVAL",
      { editedBy: ctx.userId },
    );
  }

  async approveVersion(
    ctx: RequestContext,
    sessionId: string,
    versionId: string,
  ): Promise<StrategyVersionResponse> {
    this.policy.assertCanReview(ctx);
    await this.assertSessionWritable(ctx, sessionId);
    const now = new Date();
    return this.transition(
      ctx,
      sessionId,
      versionId,
      "APPROVED",
      {
        reviewedBy: ctx.userId,
        reviewedAt: now,
        approvedBy: ctx.userId,
        approvedAt: now,
      },
    );
  }

  async rejectVersion(
    ctx: RequestContext,
    sessionId: string,
    versionId: string,
    dto: ReviewStrategyVersionDto,
  ): Promise<StrategyVersionResponse> {
    this.policy.assertCanReview(ctx);
    await this.assertSessionWritable(ctx, sessionId);
    const comment = dto.comment?.trim() ?? null;
    if (!comment) {
      throw new DomainError("STRATEGY_REVISION_NEEDS_COMMENT");
    }
    return this.transition(
      ctx,
      sessionId,
      versionId,
      "NEEDS_REVISION",
      {
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
        reviewComment: comment,
      },
    );
  }

  async requestRevision(
    ctx: RequestContext,
    sessionId: string,
    versionId: string,
    dto: ReviewStrategyVersionDto,
  ): Promise<StrategyVersionResponse> {
    this.policy.assertCanManage(ctx);
    await this.assertSessionWritable(ctx, sessionId);
    const comment = dto.comment?.trim() ?? null;
    if (!comment) {
      throw new DomainError("STRATEGY_REVISION_NEEDS_COMMENT");
    }
    return this.transition(
      ctx,
      sessionId,
      versionId,
      "NEEDS_REVISION",
      {
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
        reviewComment: comment,
      },
    );
  }

  async lockVersion(
    ctx: RequestContext,
    sessionId: string,
    versionId: string,
  ): Promise<StrategyVersionResponse> {
    this.policy.assertCanManage(ctx);
    await this.assertSessionWritable(ctx, sessionId);
    return this.transition(
      ctx,
      sessionId,
      versionId,
      "LOCKED",
      { lockedAt: new Date() },
    );
  }

  async archiveVersion(
    ctx: RequestContext,
    sessionId: string,
    versionId: string,
  ): Promise<StrategyVersionResponse> {
    this.policy.assertCanManage(ctx);
    await this.assertSessionViewable(ctx, sessionId);

    const version = await this.repo.findVersionDetailByIdInSession(
      versionId,
      sessionId,
    );
    if (!version) {
      throw new DomainError("STRATEGY_VERSION_NOT_FOUND");
    }
    if (!StrategyVersionStateMachine.canTransition(version.status, "ARCHIVED")) {
      throw new DomainError("STRATEGY_WRONG_STATE");
    }

    const archived = await this.repo.transitionVersion(versionId, sessionId, {
      expectedStatus: version.status,
      nextStatus: "ARCHIVED",
    });
    if (!archived) {
      throw new DomainError("STRATEGY_WRONG_STATE");
    }

    const strategy = await this.repo.findByIdInSession(
      version.strategyId,
      sessionId,
    );
    if (strategy?.currentVersionId === versionId) {
      await this.repo.repointCurrentVersion(strategy.id, sessionId, null);
    }

    const detail = await this.repo.findVersionDetailByIdInSession(
      versionId,
      sessionId,
    );
    return StrategyMapper.toVersionResponse(detail!);
  }

  async createRevision(
    ctx: RequestContext,
    sessionId: string,
    dto: CreateStrategyRevisionDto,
  ): Promise<StrategyVersionResponse> {
    this.policy.assertCanManage(ctx);
    await this.assertSessionWritable(ctx, sessionId);

    const strategy = await this.repo.findBySession(sessionId);
    if (!strategy) {
      throw new DomainError("STRATEGY_NOT_FOUND");
    }
    if (!strategy.currentVersionId) {
      throw new DomainError("STRATEGY_WRONG_STATE");
    }
    const current = await this.repo.findVersionDetailByIdInSession(
      strategy.currentVersionId,
      sessionId,
    );
    if (!current) {
      throw new DomainError("STRATEGY_VERSION_NOT_FOUND");
    }
    if (current.status !== "APPROVED" && current.status !== "LOCKED") {
      throw new DomainError("STRATEGY_WRONG_STATE");
    }

    const data: CreateRevisionData = {
      strategyId: strategy.id,
      analysisSessionId: sessionId,
      currentVersionId: strategy.currentVersionId,
      fromVersion: current,
      editedBy: ctx.userId,
      editReason: dto.editReason ?? null,
    };
    const created = await this.repo.createRevision(data);
    if (!created) {
      throw new DomainError("STRATEGY_WRONG_STATE");
    }
    return StrategyMapper.toVersionResponse(created);
  }

  private async transition(
    ctx: RequestContext,
    sessionId: string,
    versionId: string,
    nextStatus: StrategyVersionStatus,
    fields: NonNullable<VersionTransitionOptions["fields"]>,
  ): Promise<StrategyVersionResponse> {
    const version = await this.repo.findVersionDetailByIdInSession(
      versionId,
      sessionId,
    );
    if (!version) {
      throw new DomainError("STRATEGY_VERSION_NOT_FOUND");
    }
    if (!StrategyVersionStateMachine.canTransition(version.status, nextStatus)) {
      throw new DomainError("STRATEGY_WRONG_STATE");
    }

    const updated = await this.repo.transitionVersion(versionId, sessionId, {
      expectedStatus: version.status,
      nextStatus,
      fields,
    });
    if (!updated) {
      throw new DomainError("STRATEGY_WRONG_STATE");
    }
    const detail = await this.repo.findVersionDetailByIdInSession(
      versionId,
      sessionId,
    );
    return StrategyMapper.toVersionResponse(detail!);
  }

  private async assertSessionViewable(ctx: RequestContext, sessionId: string) {
    const session = await this.sessionRepo.findByIdInOrg(
      sessionId,
      ctx.organizationId,
    );
    if (!session) {
      throw new ResourceNotFoundError("đợt phân tích", sessionId);
    }
    return session;
  }

  private async assertSessionWritable(ctx: RequestContext, sessionId: string) {
    const session = await this.assertSessionViewable(ctx, sessionId);
    if (
      !WRITABLE_SESSION_STATUSES.includes(
        session.status as (typeof WRITABLE_SESSION_STATUSES)[number],
      )
    ) {
      throw new DomainError("SESSION_WRONG_STATE");
    }
    return session;
  }
}
