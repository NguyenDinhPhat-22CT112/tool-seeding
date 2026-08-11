import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { RequestContext } from "../../../shared/context/request-context";
import { DomainError } from "../../../shared/exceptions/domain.exceptions";
import {
  ANALYSIS_SESSION_REPOSITORY,
  AnalysisSessionRepository,
} from "../../analysis-sessions/domain/analysis-session.types";
import { ProcessingQueuePublisher } from "../../data-processing/infrastructure/processing-queue.publisher";
import { PROCESSING_JOB_REPOSITORY, ProcessingJobRepository } from "../../data-processing/domain/processing-job.types";
import { StrategyRepository, STRATEGY_REPOSITORY } from "../../strategy/domain/strategy.types";
import { ContentStateMachine } from "../domain/content-state-machine";
import {
  CONTENT_REPOSITORY,
  ContentRepository,
  SeedingContentDetailEntity,
} from "../domain/content.types";
import {
  ContentLibraryQueryDto,
  CreateManualContentDto,
  CreatePromptTemplateDto,
  GenerateContentsDto,
  ListContentsQueryDto,
  ListPromptTemplatesQueryDto,
  ReviewContentDto,
  SaveAIGenerationDto,
  UpdateContentDto,
} from "./content.dto";
import { ContentMapper } from "./content.mapper";
import { ContentPolicy } from "./content.policy";

/** Session phải ở trạng thái này mới được tạo nội dung (đã chốt trong kế hoạch). */
const CONTENT_SESSION_STATUS = "COMPLETED" as const;

@Injectable()
export class ContentService {
  constructor(
    @Inject(CONTENT_REPOSITORY) private readonly repo: ContentRepository,
    @Inject(ANALYSIS_SESSION_REPOSITORY)
    private readonly sessionRepo: AnalysisSessionRepository,
    @Inject(STRATEGY_REPOSITORY)
    private readonly strategyRepo: StrategyRepository,
    @Inject(PROCESSING_JOB_REPOSITORY)
    private readonly jobRepo: ProcessingJobRepository,
    private readonly publisher: ProcessingQueuePublisher,
    private readonly policy: ContentPolicy,
  ) {}

  // ── List & Detail ──

  async list(ctx: RequestContext, sessionId: string, query: ListContentsQueryDto) {
    await this.assertSessionViewable(ctx, sessionId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const result = await this.repo.list({
      analysisSessionId: sessionId,
      organizationId: ctx.organizationId,
      status: query.status,
      origin: query.origin,
      platform: query.platform,
      contentType: query.contentType,
      q: query.q,
      page,
      pageSize,
    });
    return {
      items: result.items.map((c) => ContentMapper.toSummary(c)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  async getDetail(ctx: RequestContext, sessionId: string, contentId: string) {
    await this.assertSessionViewable(ctx, sessionId);
    const content = await this.repo.findByIdInSession(
      contentId,
      sessionId,
      ctx.organizationId,
    );
    if (!content) {
      throw new DomainError("CONTENT_NOT_FOUND");
    }
    return ContentMapper.toDetail(content);
  }

  async listVersions(ctx: RequestContext, contentId: string) {
    const content = await this.repo.findByIdInOrg(contentId, ctx.organizationId);
    if (!content) {
      throw new DomainError("CONTENT_NOT_FOUND");
    }
    const versions = await this.repo.listVersions({
      contentId,
      organizationId: ctx.organizationId,
    });
    return versions.map((v) => ContentMapper.toVersionResponse(v));
  }

  async getVersion(ctx: RequestContext, versionId: string) {
    const version = await this.repo.findVersionByIdInOrg(versionId, ctx.organizationId);
    if (!version) {
      throw new DomainError("CONTENT_VERSION_NOT_FOUND");
    }
    return ContentMapper.toVersionResponse(version);
  }

  // ── AI Generation ──

  async generate(
    ctx: RequestContext,
    sessionId: string,
    dto: GenerateContentsDto,
  ) {
    this.policy.assertCanWrite(ctx);
    await this.assertSessionCompleted(ctx, sessionId);

    const strategyVersion = await this.strategyRepo.findVersionDetailByIdInSession(
      dto.strategyVersionId,
      sessionId,
    );
    if (!strategyVersion) {
      throw new DomainError("STRATEGY_VERSION_NOT_FOUND");
    }
    if (
      strategyVersion.status !== "APPROVED" &&
      strategyVersion.status !== "LOCKED"
    ) {
      throw new DomainError("CONTENT_STRATEGY_NOT_APPROVED");
    }

    const prompt = await this.repo.findPromptTemplateById(dto.promptTemplateId);
    if (!prompt) {
      throw new DomainError("PROMPT_TEMPLATE_NOT_FOUND");
    }

    const active = await this.repo.findActiveContentGeneration(
      sessionId,
      ctx.organizationId,
    );
    if (active) {
      throw new DomainError("CONTENT_GENERATION_CONCURRENT");
    }

    const generation = await this.repo.createAIGeneration({
      organizationId: ctx.organizationId,
      analysisSessionId: sessionId,
      strategyVersionId: dto.strategyVersionId,
      promptTemplateId: dto.promptTemplateId,
      requestedBy: ctx.userId,
    });

    const pipelineId = randomUUID();
    const job = await this.jobRepo.create({
      analysisSessionId: sessionId,
      jobType: "CONTENT_GENERATION",
      payload: {
        pipelineId,
        aiGenerationId: generation.id,
        variantCount: dto.variantCount ?? 3,
      },
      createdBy: ctx.userId,
    });

    await this.publisher.enqueue({
      processingJobId: job.id,
      analysisSessionId: sessionId,
      organizationId: ctx.organizationId,
      jobType: "CONTENT_GENERATION",
      pipelineId,
      triggeredBy: ctx.userId,
      aiGenerationId: generation.id,
    });

    return {
      aiGenerationId: generation.id,
      jobId: job.id,
    };
  }

  async getAIGeneration(ctx: RequestContext, aiGenerationId: string) {
    const generation = await this.repo.findAIGenerationByIdInOrg(
      aiGenerationId,
      ctx.organizationId,
    );
    if (!generation) {
      throw new DomainError("AI_GENERATION_NOT_FOUND");
    }
    return ContentMapper.toAIGeneration(generation);
  }

  async saveAIGeneration(
    ctx: RequestContext,
    sessionId: string,
    aiGenerationId: string,
    dto: SaveAIGenerationDto,
  ) {
    this.policy.assertCanWrite(ctx);
    const generation = await this.repo.findAIGenerationByIdInOrg(
      aiGenerationId,
      ctx.organizationId,
    );
    if (!generation) {
      throw new DomainError("AI_GENERATION_NOT_FOUND");
    }
    if (generation.status !== "COMPLETED") {
      throw new DomainError("AI_GENERATION_NOT_SAVABLE");
    }
    const candidate = generation.candidates.find(
      (c) => c.variantIndex === dto.selectedCandidateIndex,
    );
    if (!candidate) {
      throw new DomainError("AI_GENERATION_NOT_SAVABLE");
    }

    // Rewrite: tạo ContentVersion mới trên content đã tồn tại.
    if (generation.contentId) {
      const content = await this.repo.findByIdInOrg(
        generation.contentId,
        ctx.organizationId,
      );
      if (!content) {
        throw new DomainError("CONTENT_NOT_FOUND");
      }
      if (!ContentStateMachine.isEditable(content.status)) {
        throw new DomainError("CONTENT_LOCKED_IMMUTABLE");
      }
      const version = await this.repo.createVersionFromAIGeneration(
        content.id,
        ctx.organizationId,
        {
          title: candidate.title,
          body: candidate.body,
          contentTheme: null,
          source: "AI_REWRITE",
          aiGenerationId: generation.id,
          editReason: "AI Rewrite",
          editedBy: ctx.userId,
        },
      );
      if (!version) {
        throw new DomainError("CONTENT_WRONG_STATE");
      }
      const updated = await this.repo.findByIdInOrg(content.id, ctx.organizationId);
      return ContentMapper.toDetail(updated!);
    }

    // Generate mới: tạo SeedingContent DRAFT + ContentVersion #1.
    const content = await this.repo.createFromAIGeneration({
      organizationId: ctx.organizationId,
      analysisSessionId: sessionId,
      strategyVersionId: generation.strategyVersionId,
      aiGenerationId: generation.id,
      candidateIndex: dto.selectedCandidateIndex,
      createdBy: ctx.userId,
    });
    return ContentMapper.toDetail(content);
  }

  // ── Manual Content ──

  async createManual(
    ctx: RequestContext,
    sessionId: string,
    dto: CreateManualContentDto,
  ) {
    this.policy.assertCanWrite(ctx);
    await this.assertSessionCompleted(ctx, sessionId);

    const strategyVersion = await this.strategyRepo.findVersionDetailByIdInSession(
      dto.strategyVersionId,
      sessionId,
    );
    if (!strategyVersion) {
      throw new DomainError("STRATEGY_VERSION_NOT_FOUND");
    }
    if (
      strategyVersion.status !== "APPROVED" &&
      strategyVersion.status !== "LOCKED"
    ) {
      throw new DomainError("CONTENT_STRATEGY_NOT_APPROVED");
    }

    const content = await this.repo.createManual({
      organizationId: ctx.organizationId,
      analysisSessionId: sessionId,
      strategyVersionId: dto.strategyVersionId,
      title: dto.title,
      body: dto.body,
      platform: dto.platform ?? "google_maps",
      contentType: dto.contentType ?? "review_reply",
      tags: dto.tags ?? [],
      createdBy: ctx.userId,
    });
    return ContentMapper.toDetail(content);
  }

  // ── Edit / Versioning ──

  async updateContent(
    ctx: RequestContext,
    sessionId: string,
    contentId: string,
    dto: UpdateContentDto,
  ) {
    this.policy.assertCanWrite(ctx);
    const content = await this.repo.findByIdInSession(
      contentId,
      sessionId,
      ctx.organizationId,
    );
    if (!content) {
      throw new DomainError("CONTENT_NOT_FOUND");
    }
    if (!ContentStateMachine.isEditable(content.status)) {
      throw new DomainError("CONTENT_LOCKED_IMMUTABLE");
    }

    const current = content.currentVersion;
    if (!current) {
      throw new DomainError("CONTENT_WRONG_STATE");
    }

    const newTitle = dto.title?.trim() ?? current.title;
    const newBody = dto.body?.trim() ?? current.body;

    // Quy tắc: chỉ tạo version mới khi body/title thực sự thay đổi.
    if (newTitle === current.title && newBody === current.body) {
      return ContentMapper.toDetail(content);
    }

    const version = await this.repo.createVersion(contentId, ctx.organizationId, {
      title: newTitle,
      body: newBody,
      contentTheme: current.contentTheme,
      source: "HUMAN_EDIT",
      editReason: dto.editReason ?? null,
      editedBy: ctx.userId,
    });
    if (!version) {
      throw new DomainError("CONTENT_WRONG_STATE");
    }

    const updated = await this.repo.findByIdInOrg(contentId, ctx.organizationId);
    return ContentMapper.toDetail(updated!);
  }

  async updateTags(
    ctx: RequestContext,
    sessionId: string,
    contentId: string,
    tags: string[],
  ) {
    this.policy.assertCanWrite(ctx);
    const content = await this.repo.findByIdInSession(
      contentId,
      sessionId,
      ctx.organizationId,
    );
    if (!content) {
      throw new DomainError("CONTENT_NOT_FOUND");
    }
    // Sửa tag không sinh version mới — cập nhật tại chỗ.
    const updated = await this.repo.updateContent(contentId, ctx.organizationId, {
      tags,
    });
    if (!updated) {
      throw new DomainError("CONTENT_WRONG_STATE");
    }
    const detail = await this.repo.findByIdInOrg(contentId, ctx.organizationId);
    return ContentMapper.toDetail(detail!);
  }

  // ── Review / Workflow ──

  async submit(ctx: RequestContext, sessionId: string, contentId: string) {
    this.policy.assertCanWrite(ctx);
    const content = await this.repo.findByIdInSession(
      contentId,
      sessionId,
      ctx.organizationId,
    );
    if (!content) {
      throw new DomainError("CONTENT_NOT_FOUND");
    }
    if (!ContentStateMachine.canTransition(content.status, "WAITING_APPROVAL")) {
      throw new DomainError("CONTENT_WRONG_STATE");
    }
    const updated = await this.repo.transitionContent(contentId, ctx.organizationId, {
      expectedStatus: content.status,
      nextStatus: "WAITING_APPROVAL",
    });
    if (!updated) {
      throw new DomainError("CONTENT_WRONG_STATE");
    }
    return this.getDetail(ctx, sessionId, contentId);
  }

  async approve(ctx: RequestContext, sessionId: string, contentId: string) {
    this.policy.assertCanReview(ctx);
    const content = await this.repo.findByIdInSession(
      contentId,
      sessionId,
      ctx.organizationId,
    );
    if (!content) {
      throw new DomainError("CONTENT_NOT_FOUND");
    }
    if (!ContentStateMachine.canTransition(content.status, "APPROVED")) {
      throw new DomainError("CONTENT_WRONG_STATE");
    }
    const now = new Date();
    await this.applyVersionReview(content, ctx.userId, {
      reviewedBy: ctx.userId,
      reviewedAt: now,
      approvedBy: ctx.userId,
      approvedAt: now,
    });
    const updated = await this.repo.transitionContent(contentId, ctx.organizationId, {
      expectedStatus: content.status,
      nextStatus: "APPROVED",
      fields: {
        reviewedBy: ctx.userId,
        reviewedAt: now,
        approvedBy: ctx.userId,
        approvedAt: now,
      },
    });
    if (!updated) {
      throw new DomainError("CONTENT_WRONG_STATE");
    }
    return this.getDetail(ctx, sessionId, contentId);
  }

  async requestRevision(
    ctx: RequestContext,
    sessionId: string,
    contentId: string,
    dto: ReviewContentDto,
  ) {
    this.policy.assertCanReview(ctx);
    const comment = dto.comment?.trim() ?? null;
    if (!comment) {
      throw new DomainError("CONTENT_REVISION_NEEDS_COMMENT");
    }
    const content = await this.repo.findByIdInSession(
      contentId,
      sessionId,
      ctx.organizationId,
    );
    if (!content) {
      throw new DomainError("CONTENT_NOT_FOUND");
    }
    if (!ContentStateMachine.canTransition(content.status, "NEEDS_REVISION")) {
      throw new DomainError("CONTENT_WRONG_STATE");
    }
    await this.applyVersionReview(content, ctx.userId, {
      reviewedBy: ctx.userId,
      reviewedAt: new Date(),
      reviewComment: comment,
    });
    const updated = await this.repo.transitionContent(contentId, ctx.organizationId, {
      expectedStatus: content.status,
      nextStatus: "NEEDS_REVISION",
      fields: {
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
        reviewComment: comment,
      },
    });
    if (!updated) {
      throw new DomainError("CONTENT_WRONG_STATE");
    }
    return this.getDetail(ctx, sessionId, contentId);
  }

  async lock(ctx: RequestContext, sessionId: string, contentId: string) {
    this.policy.assertCanReview(ctx);
    const content = await this.repo.findByIdInSession(
      contentId,
      sessionId,
      ctx.organizationId,
    );
    if (!content) {
      throw new DomainError("CONTENT_NOT_FOUND");
    }
    if (!ContentStateMachine.canTransition(content.status, "LOCKED")) {
      throw new DomainError("CONTENT_WRONG_STATE");
    }
    const updated = await this.repo.transitionContent(contentId, ctx.organizationId, {
      expectedStatus: content.status,
      nextStatus: "LOCKED",
      fields: { lockedAt: new Date() },
    });
    if (!updated) {
      throw new DomainError("CONTENT_WRONG_STATE");
    }
    return this.getDetail(ctx, sessionId, contentId);
  }

  async unlock(ctx: RequestContext, sessionId: string, contentId: string, dto: ReviewContentDto) {
    this.policy.assertCanReview(ctx);
    const comment = dto.comment?.trim() ?? null;
    if (!comment) {
      throw new DomainError("CONTENT_UNLOCK_NEEDS_COMMENT");
    }
    const content = await this.repo.findByIdInSession(
      contentId,
      sessionId,
      ctx.organizationId,
    );
    if (!content) {
      throw new DomainError("CONTENT_NOT_FOUND");
    }
    if (!ContentStateMachine.canTransition(content.status, "NEEDS_REVISION")) {
      throw new DomainError("CONTENT_WRONG_STATE");
    }
    const updated = await this.repo.transitionContent(contentId, ctx.organizationId, {
      expectedStatus: content.status,
      nextStatus: "NEEDS_REVISION",
      fields: {
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
        reviewComment: comment,
        approvedBy: null,
        approvedAt: null,
        lockedAt: null,
      },
    });
    if (!updated) {
      throw new DomainError("CONTENT_WRONG_STATE");
    }
    return this.getDetail(ctx, sessionId, contentId);
  }

  async archive(ctx: RequestContext, sessionId: string, contentId: string) {
    this.policy.assertCanReview(ctx);
    const content = await this.repo.findByIdInSession(
      contentId,
      sessionId,
      ctx.organizationId,
    );
    if (!content) {
      throw new DomainError("CONTENT_NOT_FOUND");
    }
    if (!ContentStateMachine.canTransition(content.status, "ARCHIVED")) {
      throw new DomainError("CONTENT_WRONG_STATE");
    }
    const updated = await this.repo.transitionContent(contentId, ctx.organizationId, {
      expectedStatus: content.status,
      nextStatus: "ARCHIVED",
      fields: { archivedAt: new Date() },
    });
    if (!updated) {
      throw new DomainError("CONTENT_WRONG_STATE");
    }
    return this.getDetail(ctx, sessionId, contentId);
  }

  // ── Rewrite (AI) ──

  async rewrite(
    ctx: RequestContext,
    sessionId: string,
    contentId: string,
    dto: { promptTemplateId: string },
  ) {
    this.policy.assertCanWrite(ctx);
    const content = await this.repo.findByIdInSession(
      contentId,
      sessionId,
      ctx.organizationId,
    );
    if (!content) {
      throw new DomainError("CONTENT_NOT_FOUND");
    }
    if (!ContentStateMachine.isEditable(content.status)) {
      throw new DomainError("CONTENT_LOCKED_IMMUTABLE");
    }
    const prompt = await this.repo.findPromptTemplateById(dto.promptTemplateId);
    if (!prompt) {
      throw new DomainError("PROMPT_TEMPLATE_NOT_FOUND");
    }

    const active = await this.repo.findActiveContentGeneration(
      sessionId,
      ctx.organizationId,
    );
    if (active) {
      throw new DomainError("CONTENT_GENERATION_CONCURRENT");
    }

    const generation = await this.repo.createAIGeneration({
      organizationId: ctx.organizationId,
      analysisSessionId: sessionId,
      strategyVersionId: content.strategyVersionId,
      promptTemplateId: dto.promptTemplateId,
      requestedBy: ctx.userId,
    });
    // Gắn contentId để worker biết đây là rewrite trên content có sẵn.
    await this.repo.linkAIGenerationToContent(generation.id, contentId);

    const pipelineId = randomUUID();
    const job = await this.jobRepo.create({
      analysisSessionId: sessionId,
      jobType: "CONTENT_GENERATION",
      payload: {
        pipelineId,
        aiGenerationId: generation.id,
        variantCount: 3,
      },
      createdBy: ctx.userId,
    });

    await this.publisher.enqueue({
      processingJobId: job.id,
      analysisSessionId: sessionId,
      organizationId: ctx.organizationId,
      jobType: "CONTENT_GENERATION",
      pipelineId,
      triggeredBy: ctx.userId,
      aiGenerationId: generation.id,
    });

    return ContentMapper.toAIGeneration(generation);
  }

  // ── Prompt Templates ──

  async listPromptTemplates(ctx: RequestContext, query: ListPromptTemplatesQueryDto) {
    return this.repo.listPromptTemplates({
      platform: query.platform,
      contentType: query.contentType,
      purpose: query.purpose,
    });
  }

  async createPromptTemplate(ctx: RequestContext, dto: CreatePromptTemplateDto) {
    this.policy.assertCanWrite(ctx);
    const template = await this.repo.createPromptTemplate({
      name: dto.name,
      platform: dto.platform ?? null,
      contentType: dto.contentType,
      purpose: dto.purpose,
      templateBody: dto.templateBody,
      createdBy: ctx.userId,
    });
    return ContentMapper.toPromptTemplate(template);
  }

  async updatePromptTemplate(ctx: RequestContext, id: string, dto: CreatePromptTemplateDto) {
    this.policy.assertCanWrite(ctx);
    const existing = await this.repo.findPromptTemplateById(id);
    if (!existing) {
      throw new DomainError("PROMPT_TEMPLATE_NOT_FOUND");
    }
    // Sửa template → tạo version mới, không ghi đè bản đang được tham chiếu.
    const template = await this.repo.createPromptTemplateVersion({
      name: dto.name,
      platform: dto.platform ?? null,
      contentType: dto.contentType,
      purpose: dto.purpose,
      templateBody: dto.templateBody,
      createdBy: ctx.userId,
    });
    return ContentMapper.toPromptTemplate(template);
  }

  // ── Content Library ──

  async contentLibrary(ctx: RequestContext, query: ContentLibraryQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const result = await this.repo.list({
      analysisSessionId: query.analysisSessionId ?? "",
      organizationId: ctx.organizationId,
      status: "APPROVED",
      platform: query.platform,
      contentType: query.contentType,
      q: query.q,
      page,
      pageSize,
    });
    return {
      items: result.items.map((c) => ContentMapper.toSummary(c)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  // ── Helpers ──

  private async applyVersionReview(
    content: SeedingContentDetailEntity,
    userId: string,
    fields: {
      reviewedBy: string;
      reviewedAt: Date;
      approvedBy?: string;
      approvedAt?: Date;
      reviewComment?: string | null;
    },
  ): Promise<void> {
    const current = content.currentVersion;
    if (!current) return;
    await this.repo.updateVersion(
      content.id,
      current.id,
      content.organizationId,
      {
        reviewedBy: fields.reviewedBy,
        reviewedAt: fields.reviewedAt,
        approvedBy: fields.approvedBy ?? null,
        approvedAt: fields.approvedAt ?? null,
        reviewComment: fields.reviewComment ?? null,
      },
    );
  }

  private async assertSessionViewable(ctx: RequestContext, sessionId: string) {
    const session = await this.sessionRepo.findByIdInOrg(
      sessionId,
      ctx.organizationId,
    );
    if (!session) {
      throw new DomainError("SESSION_NOT_FOUND");
    }
    return session;
  }

  private async assertSessionCompleted(ctx: RequestContext, sessionId: string) {
    const session = await this.assertSessionViewable(ctx, sessionId);
    if (session.status !== CONTENT_SESSION_STATUS) {
      throw new DomainError("SESSION_WRONG_STATE");
    }
    return session;
  }
}
