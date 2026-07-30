import { Inject, Injectable } from "@nestjs/common";
import { RequestContext } from "../../../shared/context/request-context";
import { DomainError } from "../../../shared/exceptions/domain.exceptions";
import { AnalysisSessionStateMachine } from "../../analysis-sessions/domain/analysis-session-state-machine";
import {
  ANALYSIS_SESSION_REPOSITORY,
  AnalysisSessionRepository,
} from "../../analysis-sessions/domain/analysis-session.types";
import {
  DATA_SOURCE_REPOSITORY,
  DataSourceRepository,
} from "../../data-sources/domain/data-source.types";
import {
  computeContentHash,
  CreateFeedbackData,
  FEEDBACK_REPOSITORY,
  FeedbackRepository,
} from "../domain/feedback.types";
import {
  CreateFeedbackDto,
  ListFeedbackQueryDto,
  UpdateFeedbackDto,
} from "./feedback.dto";
import { FeedbackMapper } from "./feedback.mapper";
import { FeedbackPolicy } from "./feedback.policy";

@Injectable()
export class FeedbackService {
  constructor(
    @Inject(FEEDBACK_REPOSITORY) private readonly repo: FeedbackRepository,
    @Inject(ANALYSIS_SESSION_REPOSITORY)
    private readonly sessionRepo: AnalysisSessionRepository,
    @Inject(DATA_SOURCE_REPOSITORY) private readonly dataSourceRepo: DataSourceRepository,
    private readonly policy: FeedbackPolicy,
  ) {}

  async list(ctx: RequestContext, sessionId: string, query: ListFeedbackQueryDto) {
    await this.assertSessionViewable(ctx, sessionId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const result = await this.repo.list({
      analysisSessionId: sessionId,
      organizationId: ctx.organizationId,
      processingStatus: query.processingStatus,
      page,
      pageSize,
    });
    return {
      items: result.items.map(FeedbackMapper.toListItem),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  async create(ctx: RequestContext, sessionId: string, dto: CreateFeedbackDto) {
    this.policy.assertCanCreate(ctx);
    const session = await this.assertSessionAllowsData(ctx, sessionId);

    const rawContent = dto.rawContent.trim();
    if (!rawContent) {
      throw new DomainError("FEEDBACK_CONTENT_EMPTY");
    }
    if (dto.rating != null && (dto.rating < 1 || dto.rating > 5)) {
      throw new DomainError("FEEDBACK_INVALID_RATING");
    }

    let dataSource = await this.dataSourceRepo.findManualBySession(
      sessionId,
      ctx.organizationId,
    );
    if (!dataSource) {
      dataSource = await this.dataSourceRepo.create({
        analysisSessionId: sessionId,
        businessId: session.businessId,
        name: "Nhập tay",
        sourceType: "MANUAL",
        createdBy: ctx.userId,
      });
    }

    const data: CreateFeedbackData = {
      analysisSessionId: sessionId,
      dataSourceId: dataSource.id,
      rawContent,
      contentHash: computeContentHash(rawContent),
      reviewerName: dto.reviewerName ?? null,
      rating: dto.rating ?? null,
      language: dto.language ?? null,
      sourceUrl: dto.sourceUrl ?? null,
      publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
      notes: dto.notes ?? null,
    };

    const created = await this.repo.create(data);
    return FeedbackMapper.toResponse(created);
  }

  async getById(ctx: RequestContext, sessionId: string, id: string) {
    await this.assertSessionViewable(ctx, sessionId);
    const feedback = await this.repo.findByIdInSession(id, sessionId, ctx.organizationId);
    if (!feedback) {
      throw new DomainError("FEEDBACK_NOT_FOUND");
    }
    return FeedbackMapper.toResponse(feedback);
  }

  async update(
    ctx: RequestContext,
    sessionId: string,
    id: string,
    dto: UpdateFeedbackDto,
  ) {
    this.policy.assertCanUpdate(ctx);
    await this.assertSessionAllowsData(ctx, sessionId);

    if (dto.rating != null && (dto.rating < 1 || dto.rating > 5)) {
      throw new DomainError("FEEDBACK_INVALID_RATING");
    }

    const updated = await this.repo.update(id, sessionId, ctx.organizationId, {
      rating: dto.rating,
      notes: dto.notes,
    });
    if (!updated) {
      throw new DomainError("FEEDBACK_NOT_FOUND");
    }
    return FeedbackMapper.toResponse(updated);
  }

  async exclude(ctx: RequestContext, sessionId: string, id: string) {
    this.policy.assertCanDelete(ctx);
    await this.assertSessionAllowsData(ctx, sessionId);

    const excluded = await this.repo.exclude(id, sessionId, ctx.organizationId);
    if (!excluded) {
      throw new DomainError("FEEDBACK_NOT_FOUND");
    }
    return FeedbackMapper.toResponse(excluded);
  }

  private async assertSessionAllowsData(ctx: RequestContext, sessionId: string) {
    const session = await this.sessionRepo.findByIdInOrg(sessionId, ctx.organizationId);
    if (!session) {
      throw new DomainError("SESSION_NOT_FOUND");
    }
    if (session.status !== "DATA_COLLECTION") {
      throw new DomainError("SESSION_WRONG_STATE");
    }
    if (!AnalysisSessionStateMachine.acceptsNewData(session.status)) {
      throw new DomainError("SESSION_WRONG_STATE");
    }
    return session;
  }

  private async assertSessionViewable(ctx: RequestContext, sessionId: string) {
    const session = await this.sessionRepo.findByIdInOrg(sessionId, ctx.organizationId);
    if (!session) {
      throw new DomainError("SESSION_NOT_FOUND");
    }
    return session;
  }
}
