import { Injectable } from "@nestjs/common";
import { PrismaService } from "@seeding/database";
import {
  CreateDataSourceData,
  DataSourceEntity,
  DataSourceRepository,
  DataSourceStatus,
  SourceType,
} from "../domain/data-source.types";

function toEntity(row: {
  id: string;
  analysisSessionId: string;
  businessId: string;
  businessLocationId: string | null;
  name: string;
  sourceType: string;
  status: string;
  totalRecords: number | null;
  validRecords: number | null;
  errorRecords: number | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}): DataSourceEntity {
  return {
    ...row,
    sourceType: row.sourceType as SourceType,
    status: row.status as DataSourceStatus,
  };
}

@Injectable()
export class PrismaDataSourceRepository implements DataSourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDataSourceData): Promise<DataSourceEntity> {
    const row = await this.prisma.dataSource.create({
      data: {
        analysisSessionId: data.analysisSessionId,
        businessId: data.businessId,
        businessLocationId: data.businessLocationId ?? null,
        name: data.name,
        sourceType: data.sourceType,
        createdBy: data.createdBy,
      },
    });
    return toEntity(row);
  }

  async findByIdInSession(
    id: string,
    analysisSessionId: string,
    organizationId: string,
  ): Promise<DataSourceEntity | null> {
    const row = await this.prisma.dataSource.findFirst({
      where: {
        id,
        analysisSessionId,
        analysisSession: { organizationId },
      },
    });
    return row ? toEntity(row) : null;
  }

  async listBySession(
    analysisSessionId: string,
    organizationId: string,
  ): Promise<DataSourceEntity[]> {
    const rows = await this.prisma.dataSource.findMany({
      where: {
        analysisSessionId,
        analysisSession: { organizationId },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toEntity);
  }

  async findManualBySession(
    analysisSessionId: string,
    organizationId: string,
  ): Promise<DataSourceEntity | null> {
    const row = await this.prisma.dataSource.findFirst({
      where: {
        analysisSessionId,
        sourceType: "MANUAL",
        analysisSession: { organizationId },
      },
    });
    return row ? toEntity(row) : null;
  }

  async updateStatus(
    id: string,
    analysisSessionId: string,
    organizationId: string,
    status: DataSourceStatus,
  ): Promise<DataSourceEntity | null> {
    const existing = await this.findByIdInSession(id, analysisSessionId, organizationId);
    if (!existing) return null;

    const row = await this.prisma.dataSource.update({
      where: { id },
      data: { status },
    });
    return toEntity(row);
  }
}
