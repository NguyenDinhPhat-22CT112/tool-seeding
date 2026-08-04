import { Injectable } from "@nestjs/common";
import { Prisma } from "@seeding/database";
import { PrismaService } from "@seeding/database";
import {
  AnalysisSessionEntity,
  AnalysisSessionListRecord,
  AnalysisSessionRepository,
  AnalysisSessionStatus,
  BusinessProfileSnapshot,
  CreateAnalysisSessionData,
  ListAnalysisSessionsFilter,
  Paginated,
  UpdateAnalysisSessionData,
} from "../domain/analysis-session.types";

function toEntity(row: {
  id: string;
  organizationId: string;
  businessId: string;
  name: string;
  objective: string | null;
  focusProduct: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  status: string;
  businessSnapshot: Prisma.JsonValue | null;
  businessSnapshotAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  archivedAt: Date | null;
}): AnalysisSessionEntity {
  return {
    ...row,
    status: row.status as AnalysisSessionStatus,
    businessSnapshot: row.businessSnapshot as BusinessProfileSnapshot | null,
  };
}

@Injectable()
export class PrismaAnalysisSessionRepository implements AnalysisSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateAnalysisSessionData,
    tx?: Prisma.TransactionClient,
  ): Promise<AnalysisSessionEntity> {
    const client = tx ?? this.prisma;
    const row = await client.analysisSession.create({
      data: {
        organizationId: data.organizationId,
        businessId: data.businessId,
        name: data.name,
        objective: data.objective,
        focusProduct: data.focusProduct,
        dateFrom: data.dateFrom,
        dateTo: data.dateTo,
        createdBy: data.createdBy,
      },
    });
    return toEntity(row);
  }

  async findByIdInOrg(
    id: string,
    organizationId: string,
  ): Promise<AnalysisSessionEntity | null> {
    const row = await this.prisma.analysisSession.findFirst({
      where: { id, organizationId },
    });
    return row ? toEntity(row) : null;
  }

  async updateFields(
    id: string,
    organizationId: string,
    data: UpdateAnalysisSessionData,
  ): Promise<AnalysisSessionEntity | null> {
    const { count } = await this.prisma.analysisSession.updateMany({
      where: { id, organizationId, status: "DRAFT" },
      data,
    });
    if (count === 0) return null;

    const row = await this.prisma.analysisSession.findUniqueOrThrow({ where: { id } });
    return toEntity(row);
  }

  async findByIdWithLock(
    id: string,
    organizationId: string,
    tx: Prisma.TransactionClient,
  ): Promise<AnalysisSessionEntity | null> {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "analysis_sessions"
        WHERE "id" = ${id} AND "organizationId" = ${organizationId}
        FOR UPDATE`,
    );
    const row = await tx.analysisSession.findFirst({
      where: { id, organizationId },
    });
    return row ? toEntity(row) : null;
  }

  async transitionFromDraft(
    id: string,
    organizationId: string,
    nextStatus: AnalysisSessionStatus,
    snapshot: BusinessProfileSnapshot,
    tx: Prisma.TransactionClient,
  ): Promise<AnalysisSessionEntity | null> {
    const { count } = await tx.analysisSession.updateMany({
      where: { id, organizationId, status: "DRAFT" },
      data: {
        status: nextStatus,
        businessSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        businessSnapshotAt: new Date(),
      },
    });
    if (count === 0) return null;

    const row = await tx.analysisSession.findUniqueOrThrow({ where: { id } });
    return toEntity(row);
  }

  async lockAndFindBusiness(
    businessId: string,
    organizationId: string,
    tx: Prisma.TransactionClient,
  ): Promise<{ isActive: boolean } | null> {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "businesses"
        WHERE "id" = ${businessId} AND "organizationId" = ${organizationId}
        FOR UPDATE`,
    );
    return tx.business.findFirst({
      where: { id: businessId, organizationId, deletedAt: null },
      select: { isActive: true },
    });
  }

  async transitionStatus(
    id: string,
    organizationId: string,
    expectedCurrentStatus: AnalysisSessionStatus,
    nextStatus: AnalysisSessionStatus,
    extra?: { archivedAt?: Date | null; completedAt?: Date | null },
  ): Promise<AnalysisSessionEntity | null> {
    const { count } = await this.prisma.analysisSession.updateMany({
      where: { id, organizationId, status: expectedCurrentStatus },
      data: {
        status: nextStatus,
        ...(extra?.archivedAt !== undefined ? { archivedAt: extra.archivedAt } : {}),
        ...(extra?.completedAt !== undefined ? { completedAt: extra.completedAt } : {}),
      },
    });
    if (count === 0) return null;

    const row = await this.prisma.analysisSession.findUniqueOrThrow({ where: { id } });
    return toEntity(row);
  }

  async list(
    filter: ListAnalysisSessionsFilter,
  ): Promise<Paginated<AnalysisSessionListRecord>> {
    const where: Prisma.AnalysisSessionWhereInput = {
      organizationId: filter.organizationId,
      ...(filter.businessId ? { businessId: filter.businessId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.createdBy ? { createdBy: filter.createdBy } : {}),
      ...(filter.createdFrom || filter.createdTo
        ? {
            createdAt: {
              ...(filter.createdFrom ? { gte: filter.createdFrom } : {}),
              ...(filter.createdTo ? { lte: filter.createdTo } : {}),
            },
          }
        : {}),
      ...(filter.keyword
        ? {
            OR: [
              { name: { contains: filter.keyword, mode: "insensitive" as const } },
              { objective: { contains: filter.keyword, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.analysisSession.findMany({
        where,
        include: { _count: { select: { feedbacks: true } } },
        orderBy: { updatedAt: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.analysisSession.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        session: toEntity(row),
        feedbackCount: row._count.feedbacks,
      })),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async countFeedbacks(sessionId: string, organizationId: string): Promise<number> {
    return this.prisma.customerFeedback.count({
      where: {
        analysisSessionId: sessionId,
        analysisSession: { organizationId },
      },
    });
  }

  async businessExistsInOrg(
    businessId: string,
    organizationId: string,
  ): Promise<boolean> {
    const count = await this.prisma.business.count({
      where: { id: businessId, organizationId, deletedAt: null },
    });
    return count > 0;
  }
}
