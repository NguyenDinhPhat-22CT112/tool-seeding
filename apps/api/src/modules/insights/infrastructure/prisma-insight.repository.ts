import { Injectable } from "@nestjs/common";
import { Prisma, PrismaService } from "@seeding/database";
import {
  CreateEvidenceData,
  CreateInsightData,
  InsightDetailEntity,
  InsightEntity,
  InsightEvidenceEntity,
  InsightListRecord,
  InsightRepository,
  InsightReviewAction,
  InsightReviewLogEntity,
  InsightStatus,
  InsightTransitionOptions,
  ListInsightsFilter,
  Paginated,
  UpdateInsightData,
} from "../domain/insight.types";

function toEntity(row: {
  id: string;
  analysisSessionId: string;
  title: string;
  description: string;
  origin: string;
  priority: number;
  confidence: number;
  frequencyCount: number;
  frequencyPct: number;
  status: string;
  isFlagged: boolean;
  parentInsightId: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewComment: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}): InsightEntity {
  return {
    ...row,
    origin: row.origin as InsightEntity["origin"],
    status: row.status as InsightStatus,
  };
}

function toEvidenceEntity(row: {
  id: string;
  analysisSessionId: string;
  insightId: string;
  feedbackId: string;
  excerpt: string | null;
  relevance: number | null;
  createdAt: Date;
}): InsightEvidenceEntity {
  return row;
}

function toReviewLogEntity(row: {
  id: string;
  analysisSessionId: string;
  insightId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorId: string | null;
  comment: string | null;
  createdAt: Date;
}): InsightReviewLogEntity {
  return {
    ...row,
    action: row.action as InsightReviewLogEntity["action"],
    fromStatus: row.fromStatus as InsightStatus | null,
    toStatus: row.toStatus as InsightStatus | null,
  };
}

@Injectable()
export class PrismaInsightRepository implements InsightRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateInsightData,
    tx?: Prisma.TransactionClient,
  ): Promise<InsightEntity> {
    const client = tx ?? this.prisma;
    const row = await client.insight.create({
      data: {
        analysisSessionId: data.analysisSessionId,
        title: data.title,
        description: data.description,
        origin: data.origin,
        priority: data.priority,
        confidence: data.confidence,
        frequencyCount: data.frequencyCount,
        frequencyPct: data.frequencyPct,
        status: data.status,
        isFlagged: data.isFlagged,
        parentInsightId: data.parentInsightId ?? null,
        createdBy: data.createdBy,
      },
    });
    return toEntity(row);
  }

  async findByIdInSession(
    id: string,
    analysisSessionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<InsightEntity | null> {
    const client = tx ?? this.prisma;
    const row = await client.insight.findFirst({
      where: { id, analysisSessionId },
    });
    return row ? toEntity(row) : null;
  }

  async findDetailByIdInSession(
    id: string,
    analysisSessionId: string,
  ): Promise<InsightDetailEntity | null> {
    const row = await this.prisma.insight.findFirst({
      where: { id, analysisSessionId },
      include: {
        evidences: { orderBy: { createdAt: "asc" } },
        reviewLogs: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!row) return null;
    return {
      ...toEntity(row),
      evidences: row.evidences.map(toEvidenceEntity),
      reviewLogs: row.reviewLogs.map(toReviewLogEntity),
    };
  }

  async findManyByIdsInSession(
    ids: string[],
    analysisSessionId: string,
  ): Promise<InsightEntity[]> {
    const rows = await this.prisma.insight.findMany({
      where: { id: { in: ids }, analysisSessionId },
    });
    return rows.map(toEntity);
  }

  async listEvidencesForInsights(
    insightIds: string[],
    analysisSessionId: string,
  ): Promise<InsightEvidenceEntity[]> {
    const rows = await this.prisma.insightEvidence.findMany({
      where: { insightId: { in: insightIds }, analysisSessionId },
    });
    return rows.map(toEvidenceEntity);
  }

  async list(filter: ListInsightsFilter): Promise<Paginated<InsightListRecord>> {
    const where: Prisma.InsightWhereInput = {
      analysisSessionId: filter.analysisSessionId,
      ...(!filter.includeArchived ? { status: { not: "ARCHIVED" } } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.origin ? { origin: filter.origin } : {}),
      ...(filter.isFlagged !== undefined ? { isFlagged: filter.isFlagged } : {}),
      ...(filter.search
        ? {
            OR: [
              { title: { contains: filter.search, mode: "insensitive" } },
              { description: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.insight.findMany({
        where,
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
        include: { _count: { select: { evidences: true } } },
      }),
      this.prisma.insight.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        insight: toEntity(row),
        evidenceCount: row._count.evidences,
      })),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async updateFields(
    id: string,
    analysisSessionId: string,
    data: UpdateInsightData,
    tx?: Prisma.TransactionClient,
  ): Promise<InsightEntity | null> {
    const client = tx ?? this.prisma;
    const { count } = await client.insight.updateMany({
      where: { id, analysisSessionId, archivedAt: null },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.origin !== undefined ? { origin: data.origin } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.confidence !== undefined ? { confidence: data.confidence } : {}),
        ...(data.isFlagged !== undefined ? { isFlagged: data.isFlagged } : {}),
      },
    });
    if (count === 0) return null;
    const row = await client.insight.findFirst({ where: { id, analysisSessionId } });
    return row ? toEntity(row) : null;
  }

  async transition(
    id: string,
    analysisSessionId: string,
    opts: InsightTransitionOptions,
    tx?: Prisma.TransactionClient,
  ): Promise<InsightEntity | null> {
    const client = tx ?? this.prisma;
    const { count } = await client.insight.updateMany({
      where: { id, analysisSessionId, status: opts.expectedStatus, archivedAt: null },
      data: {
        status: opts.nextStatus,
        reviewedBy: opts.actorId,
        reviewedAt: new Date(),
        reviewComment: opts.comment ?? null,
        ...(opts.archivedAt ? { archivedAt: opts.archivedAt } : {}),
      },
    });
    if (count === 0) return null;

      await client.insightReviewLog.create({
        data: {
          analysisSessionId,
          insightId: id,
          action: opts.action,
          fromStatus: opts.expectedStatus,
          toStatus: opts.nextStatus,
          actorId: opts.actorId,
          comment: opts.comment ?? null,
        },
      });
    const row = await client.insight.findFirst({ where: { id, analysisSessionId } });
    return row ? toEntity(row) : null;
  }

  async archiveByIds(
    ids: string[],
    analysisSessionId: string,
    parentId: string | null,
    action: InsightReviewAction,
    actorId: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.insight.updateMany({
      where: { id: { in: ids }, analysisSessionId, status: { not: "ARCHIVED" } },
      data: {
        status: "ARCHIVED",
        archivedAt: new Date(),
        parentInsightId: parentId,
        reviewedBy: actorId,
        reviewedAt: new Date(),
      },
    });
    for (const id of ids) {
      await client.insightReviewLog.create({
        data: {
          analysisSessionId,
          insightId: id,
          action,
          fromStatus: null,
          toStatus: "ARCHIVED",
          actorId,
          comment: null,
        },
      });
    }
  }

  async createEvidences(
    items: CreateEvidenceData[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (items.length === 0) return;
    const client = tx ?? this.prisma;
    await client.insightEvidence.createMany({
      data: items.map((item) => ({
        analysisSessionId: item.analysisSessionId,
        insightId: item.insightId,
        feedbackId: item.feedbackId,
        excerpt: item.excerpt,
        relevance: item.relevance,
      })),
      skipDuplicates: true,
    });
  }

  async appendReviewLog(
    log: {
      analysisSessionId: string;
      insightId: string;
      action: InsightReviewAction;
      fromStatus: InsightStatus | null;
      toStatus: InsightStatus | null;
      actorId: string | null;
      comment: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.insightReviewLog.create({ data: log });
  }
}
