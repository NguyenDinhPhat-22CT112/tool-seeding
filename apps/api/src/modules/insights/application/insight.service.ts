import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@seeding/database";
import type { InsightListResponse, InsightResponse } from "@seeding/contracts";
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
import {
  FEEDBACK_REPOSITORY,
  FeedbackRepository,
} from "../../feedback/domain/feedback.types";
import { InsightStateMachine } from "../domain/insight-state-machine";
import {
  CreateEvidenceData,
  INSIGHT_REPOSITORY,
  InsightRepository,
  InsightStatus,
  UpdateInsightData,
} from "../domain/insight.types";
import {
  CreateInsightDto,
  ListInsightsQueryDto,
  MergeInsightsDto,
  ReviewInsightDto,
  SplitInsightDto,
  UpdateInsightDto,
} from "./insight.dto";
import { InsightMapper } from "./insight.mapper";
import { InsightPolicy } from "./insight.policy";

const WRITABLE_SESSION_STATUSES = ["INSIGHT_REVIEW", "STRATEGY_BUILDING"] as const;

@Injectable()
export class InsightService {
  constructor(
    @Inject(INSIGHT_REPOSITORY) private readonly repo: InsightRepository,
    @Inject(ANALYSIS_SESSION_REPOSITORY)
    private readonly sessionRepo: AnalysisSessionRepository,
    @Inject(FEEDBACK_REPOSITORY) private readonly feedbackRepo: FeedbackRepository,
    private readonly prisma: PrismaService,
    private readonly policy: InsightPolicy,
  ) {}

  async list(
    ctx: RequestContext,
    sessionId: string,
    query: ListInsightsQueryDto,
  ): Promise<InsightListResponse> {
    await this.assertSessionViewable(ctx, sessionId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const result = await this.repo.list({
      analysisSessionId: sessionId,
      status: query.status,
      origin: query.origin,
      isFlagged: query.isFlagged,
      search: query.search,
      includeArchived: query.includeArchived,
      page,
      pageSize,
    });
    return {
      items: result.items.map(({ insight, evidenceCount }) =>
        InsightMapper.toListItem(insight, evidenceCount),
      ),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  async getById(
    ctx: RequestContext,
    sessionId: string,
    id: string,
  ): Promise<InsightResponse> {
    await this.assertSessionViewable(ctx, sessionId);
    const insight = await this.repo.findDetailByIdInSession(id, sessionId);
    if (!insight) {
      throw new DomainError("INSIGHT_NOT_FOUND");
    }
    return InsightMapper.toResponse(insight);
  }

  async create(
    ctx: RequestContext,
    sessionId: string,
    dto: CreateInsightDto,
  ): Promise<InsightResponse> {
    this.policy.assertCanWrite(ctx);
    await this.assertSessionWritable(ctx, sessionId);

    const title = dto.title.trim();
    const description = dto.description.trim();
    this.assertContent(title, description);

    const created = await this.prisma.$transaction(async (tx) => {
      const insight = await this.repo.create(
        {
          analysisSessionId: sessionId,
          title,
          description,
          origin: dto.origin ?? "INFERRED",
          priority: dto.priority ?? 3,
          confidence: dto.confidence ?? 0,
          frequencyCount: 0,
          frequencyPct: 0,
          status: "DRAFT",
          isFlagged: dto.isFlagged ?? false,
          createdBy: ctx.userId,
        },
        tx,
      );

      const evidence = await this.resolveEvidenceFeedbackIds(
        dto.evidenceFeedbackIds ?? [],
        sessionId,
        insight.id,
        ctx.organizationId,
      );
      if (evidence.length > 0) {
        await this.repo.createEvidences(evidence, tx);
      }
      return insight;
    });

    return this.getById(ctx, sessionId, created.id);
  }

  async update(
    ctx: RequestContext,
    sessionId: string,
    id: string,
    dto: UpdateInsightDto,
  ): Promise<InsightResponse> {
    this.policy.assertCanWrite(ctx);
    await this.assertSessionWritable(ctx, sessionId);

    const insight = await this.repo.findByIdInSession(id, sessionId);
    if (!insight) {
      throw new DomainError("INSIGHT_NOT_FOUND");
    }
    if (!InsightStateMachine.isEditable(insight.status)) {
      throw new DomainError("INSIGHT_WRONG_STATE");
    }
    if (Object.keys(dto).length === 0) {
      throw new BusinessRuleViolationError(
        "Cần cung cấp ít nhất một trường để cập nhật",
      );
    }

    const data: UpdateInsightData = {
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
      ...(dto.origin !== undefined ? { origin: dto.origin } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.confidence !== undefined ? { confidence: dto.confidence } : {}),
      ...(dto.isFlagged !== undefined ? { isFlagged: dto.isFlagged } : {}),
    };
    if (data.title !== undefined || data.description !== undefined) {
      this.assertContent(data.title ?? insight.title, data.description ?? insight.description);
    }
    this.assertPriority(data.priority);
    this.assertConfidence(data.confidence);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await this.repo.updateFields(id, sessionId, data, tx);
      if (!result) {
        throw new DomainError("INSIGHT_WRONG_STATE");
      }
      await this.repo.appendReviewLog(
        {
          analysisSessionId: sessionId,
          insightId: id,
          action: "EDITED",
          fromStatus: insight.status,
          toStatus: insight.status,
          actorId: ctx.userId,
          comment: null,
        },
        tx,
      );
      return result;
    });

    return this.getById(ctx, sessionId, updated.id);
  }

  async submit(
    ctx: RequestContext,
    sessionId: string,
    id: string,
  ): Promise<InsightResponse> {
    this.policy.assertCanWrite(ctx);
    await this.assertSessionWritable(ctx, sessionId);
    const insight = await this.repo.findByIdInSession(id, sessionId);
    if (!insight) {
      throw new DomainError("INSIGHT_NOT_FOUND");
    }
    this.assertCanTransition(insight.status, "WAITING_REVIEW");

    const updated = await this.repo.transition(id, sessionId, {
      expectedStatus: insight.status,
      nextStatus: "WAITING_REVIEW",
      action: "SUBMITTED",
      actorId: ctx.userId,
    });
    if (!updated) {
      throw new DomainError("INSIGHT_WRONG_STATE");
    }
    return this.getById(ctx, sessionId, updated.id);
  }

  async approve(
    ctx: RequestContext,
    sessionId: string,
    id: string,
    dto: ReviewInsightDto,
  ): Promise<InsightResponse> {
    this.policy.assertCanReview(ctx);
    await this.assertSessionWritable(ctx, sessionId);
    const insight = await this.repo.findByIdInSession(id, sessionId);
    if (!insight) {
      throw new DomainError("INSIGHT_NOT_FOUND");
    }
    this.assertCanTransition(insight.status, "APPROVED");

    const updated = await this.repo.transition(id, sessionId, {
      expectedStatus: insight.status,
      nextStatus: "APPROVED",
      action: "APPROVED",
      actorId: ctx.userId,
      comment: dto.comment ?? null,
    });
    if (!updated) {
      throw new DomainError("INSIGHT_WRONG_STATE");
    }
    return this.getById(ctx, sessionId, updated.id);
  }

  async reject(
    ctx: RequestContext,
    sessionId: string,
    id: string,
    dto: ReviewInsightDto,
  ): Promise<InsightResponse> {
    this.policy.assertCanReview(ctx);
    await this.assertSessionWritable(ctx, sessionId);
    const comment = dto.comment?.trim() ?? "";
    if (!comment) {
      throw new DomainError("INSIGHT_REJECT_NEEDS_COMMENT");
    }

    const insight = await this.repo.findByIdInSession(id, sessionId);
    if (!insight) {
      throw new DomainError("INSIGHT_NOT_FOUND");
    }
    this.assertCanTransition(insight.status, "REJECTED");

    const updated = await this.repo.transition(id, sessionId, {
      expectedStatus: insight.status,
      nextStatus: "REJECTED",
      action: "REJECTED",
      actorId: ctx.userId,
      comment,
    });
    if (!updated) {
      throw new DomainError("INSIGHT_WRONG_STATE");
    }
    return this.getById(ctx, sessionId, updated.id);
  }

  async requestReanalysis(
    ctx: RequestContext,
    sessionId: string,
    id: string,
    dto: ReviewInsightDto,
  ): Promise<InsightResponse> {
    this.policy.assertCanReview(ctx);
    await this.assertSessionWritable(ctx, sessionId);
    const comment = dto.comment?.trim() ?? "";
    if (!comment) {
      throw new DomainError("INSIGHT_REANALYSIS_NEEDS_COMMENT");
    }

    const insight = await this.repo.findByIdInSession(id, sessionId);
    if (!insight) {
      throw new DomainError("INSIGHT_NOT_FOUND");
    }
    this.assertCanTransition(insight.status, "NEEDS_REANALYSIS");

    const updated = await this.repo.transition(id, sessionId, {
      expectedStatus: insight.status,
      nextStatus: "NEEDS_REANALYSIS",
      action: "REANALYSIS_REQUESTED",
      actorId: ctx.userId,
      comment,
    });
    if (!updated) {
      throw new DomainError("INSIGHT_WRONG_STATE");
    }
    return this.getById(ctx, sessionId, updated.id);
  }

  async archive(
    ctx: RequestContext,
    sessionId: string,
    id: string,
  ): Promise<InsightResponse> {
    this.policy.assertCanManage(ctx);
    await this.assertSessionWritable(ctx, sessionId);
    const insight = await this.repo.findByIdInSession(id, sessionId);
    if (!insight) {
      throw new DomainError("INSIGHT_NOT_FOUND");
    }
    this.assertCanTransition(insight.status, "ARCHIVED");

    const updated = await this.repo.transition(id, sessionId, {
      expectedStatus: insight.status,
      nextStatus: "ARCHIVED",
      action: "ARCHIVED",
      actorId: ctx.userId,
      archivedAt: new Date(),
    });
    if (!updated) {
      throw new DomainError("INSIGHT_WRONG_STATE");
    }
    return this.getById(ctx, sessionId, updated.id);
  }

  async delete(
    ctx: RequestContext,
    sessionId: string,
    id: string,
  ): Promise<InsightResponse> {
    this.policy.assertCanDelete(ctx);
    await this.assertSessionViewable(ctx, sessionId);
    const insight = await this.repo.findByIdInSession(id, sessionId);
    if (!insight) {
      throw new DomainError("INSIGHT_NOT_FOUND");
    }
    await this.prisma.$transaction(async (tx) => {
      await this.repo.hardDelete(id, sessionId, tx);
    });
    return InsightMapper.toResponse({
      ...insight,
      evidences: [],
      reviewLogs: [],
    });
  }

  async merge(
    ctx: RequestContext,
    sessionId: string,
    dto: MergeInsightsDto,
  ): Promise<InsightResponse> {
    this.policy.assertCanManage(ctx);
    await this.assertSessionWritable(ctx, sessionId);

    const ids = [...new Set(dto.insightIds)];
    if (ids.length < 2) {
      throw new DomainError("INSIGHT_MERGE_MIN_TWO");
    }
    const title = dto.title.trim();
    const description = dto.description.trim();
    this.assertContent(title, description);

    const sources = await this.repo.findManyByIdsInSession(ids, sessionId);
    if (sources.length !== ids.length) {
      throw new DomainError("INSIGHT_NOT_FOUND");
    }
    for (const source of sources) {
      if (!InsightStateMachine.isActive(source.status) || source.parentInsightId) {
        throw new DomainError("INSIGHT_WRONG_STATE");
      }
    }

    const evidenceRows = await this.repo.listEvidencesForInsights(ids, sessionId);
    const evidenceMap = new Map<
      string,
      { excerpt: string | null; relevance: number | null }
    >();
    for (const evidence of evidenceRows) {
      if (!evidenceMap.has(evidence.feedbackId)) {
        evidenceMap.set(evidence.feedbackId, {
          excerpt: evidence.excerpt,
          relevance: evidence.relevance,
        });
      }
    }

    const merged = await this.prisma.$transaction(async (tx) => {
      const created = await this.repo.create(
        {
          analysisSessionId: sessionId,
          title,
          description,
          origin: "INFERRED",
          priority: Math.max(...sources.map((s) => s.priority)),
          confidence: this.average(sources.map((s) => s.confidence)),
          frequencyCount: sources.reduce((sum, s) => sum + s.frequencyCount, 0),
          frequencyPct: Math.min(
            100,
            this.average(sources.map((s) => s.frequencyPct)),
          ),
          status: "WAITING_REVIEW",
          isFlagged: sources.some((s) => s.isFlagged),
          createdBy: ctx.userId,
        },
        tx,
      );

      const evidence: CreateEvidenceData[] = [...evidenceMap.entries()].map(
        ([feedbackId, entry]) => ({
          analysisSessionId: sessionId,
          insightId: created.id,
          feedbackId,
          excerpt: entry.excerpt,
          relevance: entry.relevance,
        }),
      );
      if (evidence.length > 0) {
        await this.repo.createEvidences(evidence, tx);
      }
      await this.repo.archiveByIds(ids, sessionId, created.id, "MERGED", ctx.userId, tx);
      return created;
    });

    return this.getById(ctx, sessionId, merged.id);
  }

  async split(
    ctx: RequestContext,
    sessionId: string,
    id: string,
    dto: SplitInsightDto,
  ): Promise<InsightResponse> {
    this.policy.assertCanManage(ctx);
    await this.assertSessionWritable(ctx, sessionId);

    if (dto.parts.length < 2) {
      throw new DomainError("INSIGHT_SPLIT_MIN_TWO");
    }
    const source = await this.repo.findByIdInSession(id, sessionId);
    if (!source) {
      throw new DomainError("INSIGHT_NOT_FOUND");
    }
    if (!InsightStateMachine.isActive(source.status) || source.parentInsightId) {
      throw new DomainError("INSIGHT_WRONG_STATE");
    }

    const sourceEvidences = await this.repo.listEvidencesForInsights([id], sessionId);
    const validFeedbackIds = new Set(sourceEvidences.map((e) => e.feedbackId));

    const parts = dto.parts.map((part) => ({
      title: part.title.trim(),
      description: part.description.trim(),
      evidenceFeedbackIds: [...new Set(part.evidenceFeedbackIds)],
    }));
    for (const part of parts) {
      this.assertContent(part.title, part.description);
      if (part.evidenceFeedbackIds.length === 0) {
        throw new DomainError("INSIGHT_SPLIT_NEEDS_EVIDENCE");
      }
      for (const feedbackId of part.evidenceFeedbackIds) {
        if (!validFeedbackIds.has(feedbackId)) {
          throw new DomainError("INSIGHT_SPLIT_NEEDS_EVIDENCE");
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const part of parts) {
        const child = await this.repo.create(
          {
            analysisSessionId: sessionId,
            title: part.title,
            description: part.description,
            origin: source.origin,
            priority: source.priority,
            confidence: source.confidence,
            frequencyCount: 0,
            frequencyPct: 0,
            status: "WAITING_REVIEW",
            isFlagged: source.isFlagged,
            parentInsightId: id,
            createdBy: ctx.userId,
          },
          tx,
        );

        const evidence: CreateEvidenceData[] = sourceEvidences
          .filter((e) => part.evidenceFeedbackIds.includes(e.feedbackId))
          .map((e) => ({
            analysisSessionId: sessionId,
            insightId: child.id,
            feedbackId: e.feedbackId,
            excerpt: e.excerpt,
            relevance: e.relevance,
          }));
        if (evidence.length > 0) {
          await this.repo.createEvidences(evidence, tx);
        }
      }
      await this.repo.archiveByIds([id], sessionId, null, "SPLIT", ctx.userId, tx);
    });

    return this.getById(ctx, sessionId, id);
  }

  private async resolveEvidenceFeedbackIds(
    feedbackIds: string[],
    sessionId: string,
    insightId: string,
    organizationId: string,
  ): Promise<CreateEvidenceData[]> {
    const result: CreateEvidenceData[] = [];
    for (const feedbackId of [...new Set(feedbackIds)]) {
      const feedback = await this.feedbackRepo.findByIdInSession(
        feedbackId,
        sessionId,
        organizationId,
      );
      if (feedback) {
        result.push({
          analysisSessionId: sessionId,
          insightId,
          feedbackId,
          excerpt: null,
          relevance: null,
        });
      }
    }
    return result;
  }

  private assertCanTransition(from: InsightStatus, to: InsightStatus): void {
    if (!InsightStateMachine.canTransition(from, to)) {
      throw new DomainError("INSIGHT_WRONG_STATE");
    }
  }

  private assertContent(title: string, description: string): void {
    if (!title || !description) {
      throw new DomainError("INSIGHT_CONTENT_EMPTY");
    }
  }

  private assertPriority(priority?: number): void {
    if (priority != null && (priority < 1 || priority > 5)) {
      throw new DomainError("INSIGHT_INVALID_PRIORITY");
    }
  }

  private assertConfidence(confidence?: number): void {
    if (confidence != null && (confidence < 0 || confidence > 1)) {
      throw new DomainError("INSIGHT_INVALID_CONFIDENCE");
    }
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private async assertSessionWritable(ctx: RequestContext, sessionId: string) {
    const session = await this.sessionRepo.findByIdInOrg(sessionId, ctx.organizationId);
    if (!session) {
      throw new ResourceNotFoundError("đợt phân tích", sessionId);
    }
    if (!WRITABLE_SESSION_STATUSES.includes(session.status as (typeof WRITABLE_SESSION_STATUSES)[number])) {
      throw new DomainError("SESSION_WRONG_STATE");
    }
    return session;
  }

  private async assertSessionViewable(ctx: RequestContext, sessionId: string) {
    const session = await this.sessionRepo.findByIdInOrg(sessionId, ctx.organizationId);
    if (!session) {
      throw new ResourceNotFoundError("đợt phân tích", sessionId);
    }
    return session;
  }
}
