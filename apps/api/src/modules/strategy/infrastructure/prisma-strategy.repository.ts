import { Injectable } from "@nestjs/common";
import { Prisma, PrismaService } from "@seeding/database";
import {
  CreateRevisionData,
  ListStrategyVersionsFilter,
  Paginated,
  StrategyContentTheme,
  StrategyEntity,
  StrategyInsightLinkEntity,
  StrategyKpi,
  StrategyRepository,
  StrategyTargetSegment,
  StrategyVersionDetailEntity,
  StrategyVersionEntity,
  StrategyVersionListRecord,
  StrategyVersionStatus,
  UpdateVersionContentData,
  VersionTransitionOptions,
} from "../domain/strategy.types";

function asStringArray(value: Prisma.JsonValue | null): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string",
    );
  }
  return [];
}

function asTyped<T>(value: Prisma.JsonValue | null): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toStrategyEntity(row: {
  id: string;
  analysisSessionId: string;
  name: string;
  currentVersionId: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}): StrategyEntity {
  return row;
}

function toVersionEntity(row: {
  id: string;
  strategyId: string;
  analysisSessionId: string;
  versionNo: number;
  status: string;
  context: string | null;
  objectives: Prisma.JsonValue;
  targetSegments: Prisma.JsonValue;
  priorityProblems: Prisma.JsonValue;
  mainMessages: Prisma.JsonValue;
  responsePrinciples: Prisma.JsonValue;
  contentThemes: Prisma.JsonValue;
  risks: Prisma.JsonValue;
  kpis: Prisma.JsonValue;
  additionalNotes: string | null;
  aiModel: string | null;
  promptVersion: string | null;
  editedBy: string | null;
  editReason: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  reviewComment: string | null;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): StrategyVersionEntity {
  return {
    id: row.id,
    strategyId: row.strategyId,
    analysisSessionId: row.analysisSessionId,
    versionNo: row.versionNo,
    status: row.status as StrategyVersionStatus,
    context: row.context,
    objectives: asStringArray(row.objectives),
    targetSegments: asTyped<StrategyTargetSegment>(row.targetSegments),
    priorityProblems: asStringArray(row.priorityProblems),
    mainMessages: asStringArray(row.mainMessages),
    responsePrinciples: asStringArray(row.responsePrinciples),
    contentThemes: asTyped<StrategyContentTheme>(row.contentThemes),
    risks: asStringArray(row.risks),
    kpis: asTyped<StrategyKpi>(row.kpis),
    additionalNotes: row.additionalNotes,
    aiModel: row.aiModel,
    promptVersion: row.promptVersion,
    editedBy: row.editedBy,
    editReason: row.editReason,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
    reviewComment: row.reviewComment,
    lockedAt: row.lockedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toVersionDetailEntity(
  row: {
    id: string;
    strategyId: string;
    analysisSessionId: string;
    versionNo: number;
    status: string;
    context: string | null;
    objectives: Prisma.JsonValue;
    targetSegments: Prisma.JsonValue;
    priorityProblems: Prisma.JsonValue;
    mainMessages: Prisma.JsonValue;
    responsePrinciples: Prisma.JsonValue;
    contentThemes: Prisma.JsonValue;
    risks: Prisma.JsonValue;
    kpis: Prisma.JsonValue;
    additionalNotes: string | null;
    aiModel: string | null;
    promptVersion: string | null;
    editedBy: string | null;
    editReason: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    approvedBy: string | null;
    approvedAt: Date | null;
    reviewComment: string | null;
    lockedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } & {
    insights: Array<{
      id: string;
      strategyVersionId: string;
      insightId: string;
      orderIndex: number;
      insightSnapshot: Prisma.JsonValue;
      linkedAt: Date;
    }>;
  },
): StrategyVersionDetailEntity {
  const entity = toVersionEntity(row);
  return {
    ...entity,
    insights: row.insights.map(
      (link): StrategyInsightLinkEntity => ({
        id: link.id,
        strategyVersionId: link.strategyVersionId,
        insightId: link.insightId,
        orderIndex: link.orderIndex,
        insightSnapshot: link.insightSnapshot as StrategyInsightLinkEntity["insightSnapshot"],
        linkedAt: link.linkedAt,
      }),
    ),
  };
}

@Injectable()
export class PrismaStrategyRepository implements StrategyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySession(analysisSessionId: string): Promise<StrategyEntity | null> {
    const row = await this.prisma.strategy.findFirst({
      where: { analysisSessionId, archivedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return row ? toStrategyEntity(row) : null;
  }

  async findByIdInSession(
    id: string,
    analysisSessionId: string,
  ): Promise<StrategyEntity | null> {
    const row = await this.prisma.strategy.findFirst({
      where: { id, analysisSessionId },
    });
    return row ? toStrategyEntity(row) : null;
  }

  async findVersionDetailByIdInSession(
    id: string,
    analysisSessionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<StrategyVersionDetailEntity | null> {
    const client = tx ?? this.prisma;
    const row = await client.strategyVersion.findFirst({
      where: { id, analysisSessionId },
      include: { insights: { orderBy: { orderIndex: "asc" } } },
    });
    return row ? toVersionDetailEntity(row) : null;
  }

  async findCurrentVersionDetail(
    strategyId: string,
    analysisSessionId: string,
  ): Promise<StrategyVersionDetailEntity | null> {
    const strategy = await this.prisma.strategy.findFirst({
      where: { id: strategyId, analysisSessionId },
    });
    if (!strategy) return null;
    if (strategy.currentVersionId) {
      return this.findVersionDetailByIdInSession(strategy.currentVersionId, analysisSessionId);
    }
    const row = await this.prisma.strategyVersion.findFirst({
      where: { strategyId, analysisSessionId, status: { not: "ARCHIVED" } },
      orderBy: { versionNo: "desc" },
      include: { insights: { orderBy: { orderIndex: "asc" } } },
    });
    return row ? toVersionDetailEntity(row) : null;
  }

  async listVersions(
    filter: ListStrategyVersionsFilter,
  ): Promise<Paginated<StrategyVersionListRecord>> {
    const where: Prisma.StrategyVersionWhereInput = {
      strategyId: filter.strategyId,
      analysisSessionId: filter.analysisSessionId,
      ...(filter.status ? { status: filter.status } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.strategyVersion.findMany({
        where,
        orderBy: { versionNo: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.strategyVersion.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({ version: toVersionEntity(row) })),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async updateVersionContent(
    id: string,
    analysisSessionId: string,
    data: UpdateVersionContentData,
    tx?: Prisma.TransactionClient,
  ): Promise<StrategyVersionEntity | null> {
    const client = tx ?? this.prisma;
    const { count } = await client.strategyVersion.updateMany({
      where: { id, analysisSessionId },
      data: {
        ...(data.context !== undefined ? { context: data.context } : {}),
        ...(data.objectives !== undefined ? { objectives: data.objectives } : {}),
        ...(data.targetSegments !== undefined ? { targetSegments: json(data.targetSegments) } : {}),
        ...(data.priorityProblems !== undefined ? { priorityProblems: data.priorityProblems } : {}),
        ...(data.mainMessages !== undefined ? { mainMessages: data.mainMessages } : {}),
        ...(data.responsePrinciples !== undefined ? { responsePrinciples: data.responsePrinciples } : {}),
        ...(data.contentThemes !== undefined ? { contentThemes: json(data.contentThemes) } : {}),
        ...(data.risks !== undefined ? { risks: data.risks } : {}),
        ...(data.kpis !== undefined ? { kpis: json(data.kpis) } : {}),
        ...(data.additionalNotes !== undefined ? { additionalNotes: data.additionalNotes } : {}),
        ...(data.editReason !== undefined ? { editReason: data.editReason } : {}),
        ...(data.editedBy !== undefined ? { editedBy: data.editedBy } : {}),
      },
    });
    if (count === 0) return null;
    const row = await client.strategyVersion.findFirst({ where: { id, analysisSessionId } });
    return row ? toVersionEntity(row) : null;
  }

  async transitionVersion(
    id: string,
    analysisSessionId: string,
    opts: VersionTransitionOptions,
    tx?: Prisma.TransactionClient,
  ): Promise<StrategyVersionEntity | null> {
    const client = tx ?? this.prisma;
    const { count } = await client.strategyVersion.updateMany({
      where: { id, analysisSessionId, status: opts.expectedStatus },
      data: {
        status: opts.nextStatus,
        ...(opts.fields?.editedBy !== undefined ? { editedBy: opts.fields.editedBy } : {}),
        ...(opts.fields?.editReason !== undefined ? { editReason: opts.fields.editReason } : {}),
        ...(opts.fields?.reviewedBy !== undefined ? { reviewedBy: opts.fields.reviewedBy } : {}),
        ...(opts.fields?.reviewedAt !== undefined ? { reviewedAt: opts.fields.reviewedAt } : {}),
        ...(opts.fields?.approvedBy !== undefined ? { approvedBy: opts.fields.approvedBy } : {}),
        ...(opts.fields?.approvedAt !== undefined ? { approvedAt: opts.fields.approvedAt } : {}),
        ...(opts.fields?.reviewComment !== undefined ? { reviewComment: opts.fields.reviewComment } : {}),
        ...(opts.fields?.lockedAt !== undefined ? { lockedAt: opts.fields.lockedAt } : {}),
      },
    });
    if (count === 0) return null;
    const row = await client.strategyVersion.findFirst({ where: { id, analysisSessionId } });
    return row ? toVersionEntity(row) : null;
  }

  async createRevision(
    data: CreateRevisionData,
    tx?: Prisma.TransactionClient,
  ): Promise<StrategyVersionDetailEntity | null> {
    const client = tx ?? this.prisma;
    const aggregate = await client.strategyVersion.aggregate({
      where: { strategyId: data.strategyId },
      _max: { versionNo: true },
    });
    const versionNo = (aggregate._max.versionNo ?? 0) + 1;

    await client.strategyVersion.update({
      where: { id: data.currentVersionId, strategyId: data.strategyId },
      data: { status: "SUPERSEDED" },
    });

    const created = await client.strategyVersion.create({
      data: {
        strategyId: data.strategyId,
        analysisSessionId: data.analysisSessionId,
        versionNo,
        status: "DRAFT",
        context: data.fromVersion.context,
        objectives: data.fromVersion.objectives,
        targetSegments: json(data.fromVersion.targetSegments),
        priorityProblems: data.fromVersion.priorityProblems,
        mainMessages: data.fromVersion.mainMessages,
        responsePrinciples: data.fromVersion.responsePrinciples,
        contentThemes: json(data.fromVersion.contentThemes),
        risks: data.fromVersion.risks,
        kpis: json(data.fromVersion.kpis),
        additionalNotes: data.fromVersion.additionalNotes,
        editedBy: data.editedBy,
        editReason: data.editReason,
      },
    });

    for (const link of data.fromVersion.insights) {
      await client.strategyInsight.create({
        data: {
          analysisSessionId: data.analysisSessionId,
          strategyVersionId: created.id,
          insightId: link.insightId,
          insightSnapshot: link.insightSnapshot,
          orderIndex: link.orderIndex,
        },
      });
    }

    await client.strategy.update({
      where: { id: data.strategyId },
      data: { currentVersionId: created.id },
    });

    return this.findVersionDetailByIdInSession(created.id, data.analysisSessionId, client);
  }

  async repointCurrentVersion(
    strategyId: string,
    analysisSessionId: string,
    versionId: string | null,
  ): Promise<void> {
    await this.prisma.strategy.update({
      where: { id: strategyId },
      data: { currentVersionId: versionId },
    });
  }

  async countVersions(strategyId: string): Promise<number> {
    return this.prisma.strategyVersion.count({ where: { strategyId } });
  }
}
