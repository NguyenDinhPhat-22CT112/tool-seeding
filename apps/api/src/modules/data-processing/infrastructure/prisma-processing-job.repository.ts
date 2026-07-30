import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";
import {
  CreateProcessingJobData,
  JobStatus,
  JobType,
  ListProcessingJobsFilter,
  Paginated,
  PIPELINE_JOB_TYPES,
  ProcessingJobEntity,
  ProcessingJobRepository,
} from "../domain/processing-job.types";

function toEntity(row: {
  id: string;
  analysisSessionId: string;
  dataSourceId: string | null;
  importBatchId: string | null;
  jobType: string;
  bullmqJobId: string | null;
  status: string;
  progress: number;
  totalItems: number | null;
  processedItems: number | null;
  failedItems: number | null;
  payload: unknown;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ProcessingJobEntity {
  return {
    ...row,
    jobType: row.jobType as JobType,
    status: row.status as JobStatus,
    payload: (row.payload as Record<string, unknown> | null) ?? null,
  };
}

@Injectable()
export class PrismaProcessingJobRepository implements ProcessingJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProcessingJobData): Promise<ProcessingJobEntity> {
    const row = await this.prisma.processingJob.create({
      data: {
        analysisSessionId: data.analysisSessionId,
        jobType: data.jobType,
        dataSourceId: data.dataSourceId ?? null,
        importBatchId: data.importBatchId ?? null,
        payload: (data.payload as any) ?? undefined,
        createdBy: data.createdBy ?? null,
        totalItems: data.totalItems ?? null,
        status: "PENDING",
        progress: 0,
      },
    });
    return toEntity(row);
  }

  async findByIdInOrg(
    id: string,
    organizationId: string,
  ): Promise<ProcessingJobEntity | null> {
    const row = await this.prisma.processingJob.findFirst({
      where: {
        id,
        analysisSession: { organizationId },
      },
    });
    return row ? toEntity(row) : null;
  }

  async findActiveBySession(
    analysisSessionId: string,
    organizationId: string,
    jobTypes?: JobType[],
  ): Promise<ProcessingJobEntity | null> {
    const row = await this.prisma.processingJob.findFirst({
      where: {
        analysisSessionId,
        analysisSession: { organizationId },
        status: { in: ["PENDING", "RUNNING"] },
        ...(jobTypes?.length ? { jobType: { in: jobTypes } } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return row ? toEntity(row) : null;
  }

  async findActivePipelineJobs(
    analysisSessionId: string,
    organizationId: string,
  ): Promise<ProcessingJobEntity[]> {
    const rows = await this.prisma.processingJob.findMany({
      where: {
        analysisSessionId,
        analysisSession: { organizationId },
        status: { in: ["PENDING", "RUNNING"] },
        jobType: { in: PIPELINE_JOB_TYPES },
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toEntity);
  }

  async findByPipelineAndType(
    pipelineId: string,
    jobType: JobType,
  ): Promise<ProcessingJobEntity | null> {
    const row = await this.prisma.processingJob.findFirst({
      where: {
        jobType,
        payload: {
          path: ["pipelineId"],
          equals: pipelineId,
        },
      },
    });
    return row ? toEntity(row) : null;
  }

  async list(filter: ListProcessingJobsFilter): Promise<Paginated<ProcessingJobEntity>> {
    const where = {
      analysisSession: { organizationId: filter.organizationId },
      ...(filter.analysisSessionId ? { analysisSessionId: filter.analysisSessionId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.jobType ? { jobType: filter.jobType } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.processingJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.processingJob.count({ where }),
    ]);

    return {
      items: rows.map(toEntity),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async markRunning(id: string, bullmqJobId: string): Promise<ProcessingJobEntity | null> {
    const row = await this.prisma.processingJob.updateMany({
      where: { id, status: { in: ["PENDING", "RUNNING"] } },
      data: {
        status: "RUNNING",
        bullmqJobId,
        startedAt: new Date(),
      },
    });
    if (row.count === 0) return null;
    return toEntity(await this.prisma.processingJob.findUniqueOrThrow({ where: { id } }));
  }

  async updateProgress(
    id: string,
    progress: number,
    processedItems?: number | null,
    failedItems?: number | null,
  ): Promise<ProcessingJobEntity | null> {
    const existing = await this.prisma.processingJob.findUnique({ where: { id } });
    if (!existing || existing.status === "CANCELLED") return null;

    const row = await this.prisma.processingJob.update({
      where: { id },
      data: {
        progress,
        ...(processedItems !== undefined ? { processedItems } : {}),
        ...(failedItems !== undefined ? { failedItems } : {}),
      },
    });
    return toEntity(row);
  }

  async markCompleted(id: string): Promise<ProcessingJobEntity | null> {
    const row = await this.prisma.processingJob.updateMany({
      where: { id, status: { in: ["PENDING", "RUNNING"] } },
      data: {
        status: "COMPLETED",
        progress: 100,
        completedAt: new Date(),
      },
    });
    if (row.count === 0) return null;
    return toEntity(await this.prisma.processingJob.findUniqueOrThrow({ where: { id } }));
  }

  async markFailed(id: string, errorMessage: string): Promise<ProcessingJobEntity | null> {
    const row = await this.prisma.processingJob.updateMany({
      where: { id, status: { in: ["PENDING", "RUNNING"] } },
      data: {
        status: "FAILED",
        errorMessage,
        completedAt: new Date(),
      },
    });
    if (row.count === 0) return null;
    return toEntity(await this.prisma.processingJob.findUniqueOrThrow({ where: { id } }));
  }

  async markCancelled(id: string): Promise<ProcessingJobEntity | null> {
    const row = await this.prisma.processingJob.updateMany({
      where: { id, status: { in: ["PENDING", "RUNNING"] } },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
      },
    });
    if (row.count === 0) return null;
    return toEntity(await this.prisma.processingJob.findUniqueOrThrow({ where: { id } }));
  }

  async resetForRetry(id: string): Promise<ProcessingJobEntity | null> {
    const row = await this.prisma.processingJob.updateMany({
      where: { id, status: "FAILED" },
      data: {
        status: "PENDING",
        progress: 0,
        processedItems: 0,
        failedItems: 0,
        errorMessage: null,
        bullmqJobId: null,
        startedAt: null,
        completedAt: null,
      },
    });
    if (row.count === 0) return null;
    return toEntity(await this.prisma.processingJob.findUniqueOrThrow({ where: { id } }));
  }
}
