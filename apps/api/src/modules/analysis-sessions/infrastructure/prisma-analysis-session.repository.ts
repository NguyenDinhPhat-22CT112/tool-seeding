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
  CreateAnalysisSessionResult,
  ListAnalysisSessionsFilter,
  Paginated,
  StartDataCollectionResult,
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

  async create(data: CreateAnalysisSessionData): Promise<CreateAnalysisSessionResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "businesses"
          WHERE "id" = ${data.businessId}
            AND "organizationId" = ${data.organizationId}
          FOR UPDATE`,
      );
      const business = await tx.business.findFirst({
        where: {
          id: data.businessId,
          organizationId: data.organizationId,
          deletedAt: null,
        },
        select: { isActive: true },
      });
      if (!business) return { outcome: "BUSINESS_NOT_FOUND" } as const;
      if (!business.isActive) return { outcome: "BUSINESS_INACTIVE" } as const;

      const row = await tx.analysisSession.create({
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
      return { outcome: "CREATED", session: toEntity(row) } as const;
    });
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

  async startDataCollection(
    id: string,
    organizationId: string,
  ): Promise<StartDataCollectionResult> {
    return this.prisma.$transaction(async (tx) => {
      const initialSession = await tx.analysisSession.findFirst({
        where: { id, organizationId },
        select: { businessId: true },
      });
      if (!initialSession) return { outcome: "SESSION_NOT_FOUND" } as const;

      // Business deactivate/restore uses the same row lock. Checking isActive,
      // capturing the snapshot and changing status therefore form one operation.
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "businesses"
          WHERE "id" = ${initialSession.businessId}
            AND "organizationId" = ${organizationId}
          FOR UPDATE`,
      );

      const session = await tx.analysisSession.findFirst({
        where: { id, organizationId },
      });
      if (!session) return { outcome: "SESSION_NOT_FOUND" } as const;
      if (session.status !== "DRAFT") {
        return {
          outcome: "INVALID_STATE",
          currentStatus: session.status as AnalysisSessionStatus,
        } as const;
      }

      const business = await tx.business.findFirst({
        where: {
          id: session.businessId,
          organizationId,
          deletedAt: null,
        },
      });
      if (!business) return { outcome: "BUSINESS_NOT_FOUND" } as const;
      if (!business.isActive) return { outcome: "BUSINESS_INACTIVE" } as const;

      const snapshot: BusinessProfileSnapshot = {
        id: business.id,
        name: business.name,
        industry: business.industry,
        description: business.description,
        website: business.website,
        address: business.address,
        phone: business.phone,
        email: business.email,
        products: business.products as unknown as BusinessProfileSnapshot["products"],
        services: business.services as unknown as BusinessProfileSnapshot["services"],
        targetAudience:
          business.targetAudience as unknown as BusinessProfileSnapshot["targetAudience"],
        competitors:
          business.competitors as unknown as BusinessProfileSnapshot["competitors"],
        strengths: business.strengths as unknown as string[],
        brandVoice: business.brandVoice,
        allowedTopics: business.allowedTopics as unknown as string[],
        bannedTopics: business.bannedTopics as unknown as string[],
        extraNotes: business.extraNotes,
        sourceUpdatedAt: business.updatedAt.toISOString(),
      };

      const { count } = await tx.analysisSession.updateMany({
        where: { id, organizationId, status: "DRAFT" },
        data: {
          status: "DATA_COLLECTION",
          businessSnapshot: snapshot as unknown as Prisma.InputJsonValue,
          businessSnapshotAt: new Date(),
        },
      });
      if (count === 0) return { outcome: "CONCURRENT_CHANGE" } as const;

      const updated = await tx.analysisSession.findUniqueOrThrow({ where: { id } });
      return { outcome: "UPDATED", session: toEntity(updated) } as const;
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
