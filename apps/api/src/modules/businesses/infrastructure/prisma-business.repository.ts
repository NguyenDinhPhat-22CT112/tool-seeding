import { Injectable } from "@nestjs/common";
import { Prisma } from "@seeding/database";
import { PrismaService } from "@seeding/database";
import type { AnalysisSessionStatus } from "@seeding/contracts";
import {
  BusinessEntity,
  BusinessLocationEntity,
  BusinessListRecord,
  BusinessRepository,
  CreateBusinessData,
  CreateBusinessLocationData,
  ListBusinessesFilter,
  Paginated,
  UpdateBusinessData,
  UpdateBusinessLocationData,
  BusinessWithLocation,
} from "../domain/business.types";

function toEntity(row: {
  id: string;
  organizationId: string;
  name: string;
  industry: string | null;
  description: string | null;
  website: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  products: Prisma.JsonValue;
  services: Prisma.JsonValue;
  targetAudience: Prisma.JsonValue;
  competitors: Prisma.JsonValue;
  strengths: Prisma.JsonValue;
  brandVoice: string | null;
  allowedTopics: Prisma.JsonValue;
  bannedTopics: Prisma.JsonValue;
  extraNotes: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): BusinessEntity {
  return {
    ...row,
    products: (row.products ?? []) as unknown as BusinessEntity["products"],
    services: (row.services ?? []) as unknown as BusinessEntity["services"],
    targetAudience: (row.targetAudience ??
      []) as unknown as BusinessEntity["targetAudience"],
    competitors: (row.competitors ??
      []) as unknown as BusinessEntity["competitors"],
    strengths: (row.strengths ?? []) as unknown as string[],
    allowedTopics: (row.allowedTopics ?? []) as unknown as string[],
    bannedTopics: (row.bannedTopics ?? []) as unknown as string[],
  };
}

function toLocationEntity(row: {
  id: string;
  organizationId: string;
  businessId: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  primaryType: string | null;
  rating: number | null;
  userRatingCount: number | null;
  source: "MANUAL" | "SERPAPI";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  serpapiPlaceId?: string | null;
  serpapiLocationId?: string | null;
  serpapiPlaceLinkStatus?: "LINKED" | "DISCONNECTED" | null;
  mapsUrl?: string | null;
}): BusinessLocationEntity {
  return {
    ...row,
  };
}

function businessCreateInput(data: CreateBusinessData): Prisma.BusinessCreateInput {
  return {
    organization: { connect: { id: data.organizationId } },
    name: data.name,
    industry: data.industry,
    description: data.description,
    website: data.website,
    address: data.address,
    phone: data.phone,
    email: data.email,
    products: data.products as unknown as Prisma.InputJsonValue,
    services: data.services as unknown as Prisma.InputJsonValue,
    targetAudience: data.targetAudience as unknown as Prisma.InputJsonValue,
    competitors: data.competitors as unknown as Prisma.InputJsonValue,
    strengths: data.strengths,
    brandVoice: data.brandVoice,
    allowedTopics: data.allowedTopics,
    bannedTopics: data.bannedTopics,
    extraNotes: data.extraNotes,
    createdBy: data.createdBy,
  };
}

@Injectable()
export class PrismaBusinessRepository implements BusinessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBusinessData): Promise<BusinessEntity> {
    const row = await this.prisma.business.create({
      data: businessCreateInput(data),
    });
    return toEntity(row);
  }

  async findByIdInOrg(
    id: string,
    organizationId: string,
  ): Promise<BusinessEntity | null> {
    const row = await this.prisma.business.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    return row ? toEntity(row) : null;
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateBusinessData,
  ): Promise<BusinessEntity | null> {
    // updateMany để enforce org scope ngay trong câu lệnh (không phải chỉ check trước rồi update riêng —
    // tránh race condition giữa lúc check và lúc update).
    const { count } = await this.prisma.business.updateMany({
      where: { id, organizationId, deletedAt: null, isActive: true },
      data: {
        ...data,
        products: data.products as unknown as Prisma.InputJsonValue | undefined,
        services: data.services as unknown as Prisma.InputJsonValue | undefined,
        targetAudience: data.targetAudience as unknown as
          Prisma.InputJsonValue | undefined,
        competitors: data.competitors as unknown as
          Prisma.InputJsonValue | undefined,
        strengths: data.strengths,
        allowedTopics: data.allowedTopics,
        bannedTopics: data.bannedTopics,
      },
    });
    if (count === 0) return null;
    const row = await this.prisma.business.findUniqueOrThrow({ where: { id } });
    return toEntity(row);
  }

  async list(
    filter: ListBusinessesFilter,
  ): Promise<Paginated<BusinessListRecord>> {
    const where: Prisma.BusinessWhereInput = {
      organizationId: filter.organizationId,
      deletedAt: null,
      ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
      ...(filter.search
        ? { name: { contains: filter.search, mode: "insensitive" as const } }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.business.findMany({
        where,
        include: {
          _count: {
            select: { analysisSessions: true },
          },
        },
        orderBy: { [filter.sortBy ?? "updatedAt"]: filter.sortOrder ?? "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.business.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        business: toEntity(row),
        sessionCount: row._count.analysisSessions,
      })),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async findByIdWithLock(
    id: string,
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BusinessEntity | null> {
    const client = tx ?? this.prisma;
    await client.$queryRaw(
      Prisma.sql`SELECT "id" FROM "businesses"
        WHERE "id" = ${id} AND "organizationId" = ${organizationId}
        FOR UPDATE`,
    );
    const row = await client.business.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    return row ? toEntity(row) : null;
  }

  async archiveDraftSessions(
    businessId: string,
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const { count } = await client.analysisSession.updateMany({
      where: { businessId, organizationId, status: "DRAFT" },
      data: { status: "ARCHIVED", archivedAt: new Date() },
    });
    return count;
  }

  async countSessionsNotInStatuses(
    businessId: string,
    organizationId: string,
    statuses: AnalysisSessionStatus[],
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    return client.analysisSession.count({
      where: {
        businessId,
        organizationId,
        status: { notIn: statuses },
      },
    });
  }

  async updateIsActive(
    id: string,
    organizationId: string,
    isActive: boolean,
    tx?: Prisma.TransactionClient,
  ): Promise<BusinessEntity | null> {
    const client = tx ?? this.prisma;
    const { count } = await client.business.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { isActive },
    });
    if (count === 0) return null;
    const row = await client.business.findUniqueOrThrow({ where: { id } });
    return toEntity(row);
  }

  async createWithLocation(
    business: CreateBusinessData,
    location: Omit<CreateBusinessLocationData, "businessId">,
  ): Promise<BusinessWithLocation | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const businessRow = await tx.business.create({
          data: businessCreateInput(business),
        });
        const locationRow = await tx.businessLocation.create({
          data: {
            ...location,
            businessId: businessRow.id,
          },
        });
        return {
          business: toEntity(businessRow),
          location: toLocationEntity(locationRow),
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return null;
      }
      throw error;
    }
  }

  async createLocation(
    data: CreateBusinessLocationData,
  ): Promise<BusinessLocationEntity | null> {
    try {
      const row = await this.prisma.businessLocation.create({ data });
      return toLocationEntity(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return null;
      }
      throw error;
    }
  }



  async findLocationBySerpApiPlaceIdInOrg(
    organizationId: string,
    placeId: string,
  ): Promise<BusinessLocationEntity | null> {
    const row = await this.prisma.businessLocation.findFirst({
      where: { organizationId, serpapiPlaceId: placeId },
    });
    return row ? toLocationEntity(row as any) : null;
  }

  async listLocations(
    businessId: string,
    organizationId: string,
  ): Promise<BusinessLocationEntity[]> {
    const rows = await this.prisma.businessLocation.findMany({
      where: { businessId, organizationId },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    });
    return rows.map(toLocationEntity);
  }

  async findLocation(
    id: string,
    businessId: string,
    organizationId: string,
  ): Promise<BusinessLocationEntity | null> {
    const row = await this.prisma.businessLocation.findFirst({
      where: { id, businessId, organizationId },
    });
    return row ? toLocationEntity(row) : null;
  }

  async updateLocation(
    id: string,
    businessId: string,
    organizationId: string,
    data: UpdateBusinessLocationData,
  ): Promise<BusinessLocationEntity | null> {
    const updated = await this.prisma.businessLocation.updateMany({
      where: { id, businessId, organizationId },
      data,
    });
    if (updated.count === 0) return null;
    const row = await this.prisma.businessLocation.findUniqueOrThrow({
      where: { id },
    });
    return toLocationEntity(row);
  }

  async deleteLocation(
    id: string,
    businessId: string,
    organizationId: string,
  ): Promise<BusinessLocationEntity | null> {
    const updated = await this.prisma.businessLocation.updateMany({
      where: { id, businessId, organizationId, isActive: true },
      data: { isActive: false },
    });
    if (updated.count === 0) return null;
    const row = await this.prisma.businessLocation.findUniqueOrThrow({
      where: { id },
    });
    return toLocationEntity(row);
  }

  async hardDelete(
    id: string,
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    // Bot gán/task tham chiếu tới địa điểm (FK Restrict) — phải xóa trước location.
    // Bảng seeding_bot_* chưa được migrate vào DB nên phải kiểm tra trước khi xóa.
    if (await tableExists(client, "seeding_bot_tasks")) {
      await client.seedingBotTask.deleteMany({ where: { businessId: id } });
    }
    if (await tableExists(client, "seeding_bot_locations")) {
      await client.seedingBotLocation.deleteMany({ where: { businessId: id } });
    }

    // Cascade toàn bộ session của doanh nghiệp.
    const sessions = await client.analysisSession.findMany({
      where: { businessId: id, organizationId },
      select: { id: true },
    });
    for (const session of sessions) {
      await hardDeleteSessionCascade(client, session.id);
    }

    await client.businessLocation.deleteMany({
      where: { businessId: id, organizationId },
    });
    await client.business.deleteMany({ where: { id, organizationId } });
  }
}

/**
 * Xóa sạch mọi dữ liệu con của một AnalysisSession theo thứ tự FK (không có CASCADE cấp DB).
 * Cùng thứ tự với PrismaAnalysisSessionRepository.hardDelete.
 */
export async function hardDeleteSessionCascade(
  client: Prisma.TransactionClient,
  sessionId: string,
): Promise<void> {
  await client.insightReviewLog.deleteMany({ where: { analysisSessionId: sessionId } });
  await client.strategyInsight.deleteMany({ where: { analysisSessionId: sessionId } });
  await client.insight.deleteMany({ where: { analysisSessionId: sessionId } });

  await client.strategy.updateMany({
    where: { analysisSessionId: sessionId },
    data: { currentVersionId: null },
  });
  await client.strategyVersion.deleteMany({ where: { analysisSessionId: sessionId } });
  await client.strategy.deleteMany({ where: { analysisSessionId: sessionId } });

  await client.customerFeedback.updateMany({
    where: { analysisSessionId: sessionId },
    data: { duplicateOfId: null },
  });
  await client.customerFeedback.deleteMany({ where: { analysisSessionId: sessionId } });

  await client.processingJob.deleteMany({ where: { analysisSessionId: sessionId } });
  await client.importBatch.deleteMany({
    where: { dataSource: { analysisSessionId: sessionId } },
  });
  await client.dataSource.deleteMany({ where: { analysisSessionId: sessionId } });
  await client.analysisSession.deleteMany({ where: { id: sessionId } });
}

/**
 * Kiểm tra bảng có tồn tại trong DB hay không (SeedingBot tables chưa được migrate).
 */
async function tableExists(
  client: Prisma.TransactionClient,
  table: string,
): Promise<boolean> {
  const rows = await client.$queryRawUnsafe<Array<{ t: boolean }>>(
    `SELECT (to_regclass('public.${table}') IS NOT NULL) AS t`,
  );
  return rows[0]?.t ?? false;
}
