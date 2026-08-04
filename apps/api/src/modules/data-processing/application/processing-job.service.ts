import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@seeding/database";
import { RequestContext } from "../../../shared/context/request-context";
import { DomainError } from "../../../shared/exceptions/domain.exceptions";
import { AnalysisSessionStateMachine } from "../../analysis-sessions/domain/analysis-session-state-machine";
import {
  ANALYSIS_SESSION_REPOSITORY,
  AnalysisSessionRepository,
} from "../../analysis-sessions/domain/analysis-session.types";
import {
  PIPELINE_JOB_TYPES,
  PROCESSING_JOB_REPOSITORY,
  ProcessingJobEntity,
  ProcessingJobRepository,
} from "../domain/processing-job.types";
import { ProcessingQueuePublisher } from "../infrastructure/processing-queue.publisher";
import { ListProcessingJobsQueryDto } from "./processing-job.dto";
import {
  ProcessingJobMapper,
  ProcessingJobResponse,
  TriggerProcessResponse,
} from "./processing-job.mapper";
import { ProcessingJobPolicy } from "./processing-job.policy";

@Injectable()
export class ProcessingJobService {
  constructor(
    @Inject(PROCESSING_JOB_REPOSITORY)
    private readonly repo: ProcessingJobRepository,
    @Inject(ANALYSIS_SESSION_REPOSITORY)
    private readonly sessionRepo: AnalysisSessionRepository,
    private readonly publisher: ProcessingQueuePublisher,
    private readonly prisma: PrismaService,
    private readonly policy: ProcessingJobPolicy,
  ) {}

  async triggerProcess(
    ctx: RequestContext,
    sessionId: string,
  ): Promise<TriggerProcessResponse> {
    this.policy.assertCanTrigger(ctx);

    const session = await this.sessionRepo.findByIdInOrg(sessionId, ctx.organizationId);
    if (!session) {
      throw new DomainError("SESSION_NOT_FOUND");
    }
    if (session.status !== "DATA_COLLECTION") {
      throw new DomainError("SESSION_WRONG_STATE");
    }

    const activeJobs = await this.repo.findActivePipelineJobs(
      sessionId,
      ctx.organizationId,
    );
    if (activeJobs.length > 0) {
      const pipelineId = this.extractPipelineId(activeJobs[0]!);
      const jobs = await this.listPipelineJobs(pipelineId, sessionId, ctx.organizationId);
      return {
        pipelineId,
        idempotent: true,
        jobs: jobs.map(ProcessingJobMapper.toResponse),
      };
    }

    const totalItems = await this.prisma.customerFeedback.count({
      where: {
        analysisSessionId: sessionId,
        processingStatus: { in: ["RAW", "NORMALIZED"] },
      },
    });

    const transitioned = await this.sessionRepo.transitionStatus(
      sessionId,
      ctx.organizationId,
      "DATA_COLLECTION",
      "PROCESSING",
    );
    if (!transitioned) {
      throw new DomainError("SESSION_WRONG_STATE");
    }

    const pipelineId = randomUUID();
    const payload = { pipelineId };
    const createdJobs: ProcessingJobEntity[] = [];

    for (const jobType of PIPELINE_JOB_TYPES) {
      const job = await this.repo.create({
        analysisSessionId: sessionId,
        jobType,
        payload,
        createdBy: ctx.userId,
        totalItems,
      });
      createdJobs.push(job);
    }

    const firstJob = createdJobs[0];
    if (firstJob) {
      await this.publisher.enqueue({
        processingJobId: firstJob.id,
        analysisSessionId: sessionId,
        organizationId: ctx.organizationId,
        jobType: firstJob.jobType as any,
        pipelineId,
        triggeredBy: ctx.userId,
      });
    }

    return {
      pipelineId,
      idempotent: false,
      jobs: createdJobs.map(ProcessingJobMapper.toResponse),
    };
  }

  async triggerInsightGeneration(
    ctx: RequestContext,
    sessionId: string,
  ): Promise<TriggerProcessResponse> {
    this.policy.assertCanTrigger(ctx);

    const session = await this.sessionRepo.findByIdInOrg(sessionId, ctx.organizationId);
    if (!session) {
      throw new DomainError("SESSION_NOT_FOUND");
    }
    if (session.status !== "ANALYZING") {
      throw new DomainError("SESSION_WRONG_STATE");
    }

    return this.triggerAiStage(ctx, sessionId, "INSIGHT_GENERATION");
  }

  async triggerStrategyGeneration(
    ctx: RequestContext,
    sessionId: string,
  ): Promise<TriggerProcessResponse> {
    this.policy.assertCanTrigger(ctx);

    const session = await this.sessionRepo.findByIdInOrg(sessionId, ctx.organizationId);
    if (!session) {
      throw new DomainError("SESSION_NOT_FOUND");
    }
    if (session.status !== "INSIGHT_REVIEW") {
      throw new DomainError("SESSION_WRONG_STATE");
    }

    return this.triggerAiStage(ctx, sessionId, "STRATEGY_GENERATION");
  }

  private async triggerAiStage(
    ctx: RequestContext,
    sessionId: string,
    jobType: "INSIGHT_GENERATION" | "STRATEGY_GENERATION",
  ): Promise<TriggerProcessResponse> {
    const pipelineId = randomUUID();
    const payload = { pipelineId };

    const job = await this.repo.create({
      analysisSessionId: sessionId,
      jobType,
      payload,
      createdBy: ctx.userId,
    });

    await this.publisher.enqueue({
      processingJobId: job.id,
      analysisSessionId: sessionId,
      organizationId: ctx.organizationId,
      jobType,
      pipelineId,
      triggeredBy: ctx.userId,
    });

    return {
      pipelineId,
      idempotent: false,
      jobs: [ProcessingJobMapper.toResponse(job)],
    };
  }

  async list(ctx: RequestContext, query: ListProcessingJobsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const result = await this.repo.list({
      organizationId: ctx.organizationId,
      analysisSessionId: query.analysisSessionId,
      status: query.status,
      jobType: query.jobType,
      page,
      pageSize,
    });
    return {
      items: result.items.map(ProcessingJobMapper.toResponse),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  async getById(ctx: RequestContext, id: string): Promise<ProcessingJobResponse> {
    const job = await this.repo.findByIdInOrg(id, ctx.organizationId);
    if (!job) {
      throw new DomainError("JOB_NOT_FOUND");
    }
    return ProcessingJobMapper.toResponse(job);
  }

  async retry(ctx: RequestContext, id: string): Promise<ProcessingJobResponse> {
    this.policy.assertCanManage(ctx);

    const job = await this.repo.findByIdInOrg(id, ctx.organizationId);
    if (!job) {
      throw new DomainError("JOB_NOT_FOUND");
    }
    if (job.status !== "FAILED") {
      throw new DomainError("JOB_CANNOT_RETRY");
    }

    const reset = await this.repo.resetForRetry(id);
    if (!reset) {
      throw new DomainError("JOB_CANNOT_RETRY");
    }

    await this.publisher.remove(id);
    const pipelineId = this.extractPipelineId(reset);
    const sampleLimit = this.extractSampleLimit(reset);
    await this.publisher.enqueue({
      processingJobId: reset.id,
      analysisSessionId: reset.analysisSessionId,
      organizationId: ctx.organizationId,
      jobType: reset.jobType as any,
      pipelineId,
      triggeredBy: ctx.userId,
      sampleLimit,
    });

    return ProcessingJobMapper.toResponse(reset);
  }

  async cancel(ctx: RequestContext, id: string): Promise<ProcessingJobResponse> {
    this.policy.assertCanManage(ctx);

    const job = await this.repo.findByIdInOrg(id, ctx.organizationId);
    if (!job) {
      throw new DomainError("JOB_NOT_FOUND");
    }
    if (job.status !== "PENDING" && job.status !== "RUNNING") {
      throw new DomainError("JOB_CANNOT_CANCEL");
    }

    await this.publisher.remove(id);
    const cancelled = await this.repo.markCancelled(id);
    if (!cancelled) {
      throw new DomainError("JOB_CANNOT_CANCEL");
    }

    return ProcessingJobMapper.toResponse(cancelled);
  }

  private extractPipelineId(job: ProcessingJobEntity): string {
    const pipelineId = job.payload?.pipelineId;
    if (typeof pipelineId === "string" && pipelineId.length > 0) {
      return pipelineId;
    }
    return job.id;
  }

  private extractSampleLimit(job: ProcessingJobEntity): number | null {
    const limit = job.payload?.sampleLimit;
    if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
      return Math.floor(limit);
    }
    return null;
  }

  private async listPipelineJobs(
    pipelineId: string,
    sessionId: string,
    organizationId: string,
  ): Promise<ProcessingJobEntity[]> {
    const result = await this.repo.list({
      analysisSessionId: sessionId,
      organizationId,
      page: 1,
      pageSize: 100,
    });
    return result.items.filter(
      (job) =>
        PIPELINE_JOB_TYPES.includes(job.jobType) &&
        job.payload?.pipelineId === pipelineId,
    );
  }
}
