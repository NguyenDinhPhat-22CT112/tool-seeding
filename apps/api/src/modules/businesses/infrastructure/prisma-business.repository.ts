import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import {
  BusinessEntity,
  BusinessLocationEntity,
  BusinessListRecord,
  BusinessRepository,
  CreateBusinessData,
  CreateBusinessLocationData,
  DeactivateBusinessResult,
  ListBusinessesFilter,
  Paginated,
  RestoreBusinessResult,
  UpdateBusinessData,
  UpdateBusinessLocationData,
  BusinessWithLocation,
} from "../domain/business.types";

/** DRAFT được auto-archive; các session non-terminal còn lại chặn deactivate. */
const TERMINAL_SESSION_STATUSES = ["COMPLETED", "ARCHIVED"] as const;

/** Internal error — dùng để rollback transaction khi deactivate bị chặn bởi session non-terminal. */
class DeactivateBlockedError extends Error {
  constructor(
    public readonly business: BusinessEntity,
    public readonly blockingCount: number,
  ) {
    super("Deactivate blocked");
  }
}

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

  async deactivate(
    id: string,
    organizationId: string,
  ): Promise<DeactivateBusinessResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "businesses"
          WHERE "id" = ${id} AND "organizationId" = ${organizationId}
          FOR UPDATE`,
      );
      const existing = await tx.business.findFirst({
        where: { id, organizationId, deletedAt: null },
      });
      if (!existing) {
        return { business: null, blockingSessionCount: 0, archivedDraftCount: 0, changed: false };
      }
      if (!existing.isActive) {
        return {
          business: toEntity(existing),
          blockingSessionCount: 0,
          archivedDraftCount: 0,
          changed: false,
        };
      }

      // BUS-05: Tự động archive tất cả session DRAFT — chúng chưa có data thực sự,
      // an toàn để archive. Điều này ngăn DRAFT chặn deactivate vô lý.
      const { count: archivedDraftCount } = await tx.analysisSession.updateMany({
        where: {
          businessId: id,
          organizationId,
          status: "DRAFT",
        },
        data: {
          status: "ARCHIVED",
          archivedAt: new Date(),
        },
      });

      // Đếm session non-terminal còn lại (DATA_COLLECTION, PROCESSING, ...) — chặn deactivate.
      const blockingSessionCount = await tx.analysisSession.count({
        where: {
          businessId: id,
          organizationId,
          status: { notIn: [...TERMINAL_SESSION_STATUSES] },
        },
      });
      if (blockingSessionCount > 0) {
        // Rollback toàn bộ transaction (bao gồm archive DRAFT ở trên).
        throw new DeactivateBlockedError(toEntity(existing), blockingSessionCount);
      }

      const updated = await tx.business.update({
        where: { id },
        data: { isActive: false },
      });
      return {
        business: toEntity(updated),
        blockingSessionCount: 0,
        archivedDraftCount,
        changed: true,
      };
    }).catch((err) => {
      if (err instanceof DeactivateBlockedError) {
        return {
          business: err.business,
          blockingSessionCount: err.blockingCount,
          archivedDraftCount: 0,
          changed: false,
        };
      }
      throw err;
    });
  }

  async restore(
    id: string,
    organizationId: string,
  ): Promise<RestoreBusinessResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "businesses"
          WHERE "id" = ${id} AND "organizationId" = ${organizationId}
          FOR UPDATE`,
      );
      const existing = await tx.business.findFirst({
        where: { id, organizationId, deletedAt: null },
      });
      if (!existing) {
        return { business: null, changed: false };
      }
      if (existing.isActive) {
        return { business: toEntity(existing), changed: false };
      }

      const updated = await tx.business.update({
        where: { id },
        data: { isActive: true },
      });
      return { business: toEntity(updated), changed: true };
    });
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
}
