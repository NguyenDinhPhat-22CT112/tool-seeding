import { Injectable } from "@nestjs/common";
import { Prisma } from "@seeding/database";
import { PrismaService } from "@seeding/database";
import {
  CreateImportBatchData,
  ImportBatchEntity,
  ImportBatchStatus,
  ImportRepository,
} from "../domain/import.types";

function toEntity(row: {
  id: string;
  dataSourceId: string;
  fileName: string;
  fileSize: number;
  fileStorageKey: string;
  fileChecksum: string | null;
  mimeType: string | null;
  columnMapping: Prisma.JsonValue;
  status: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  importedRows: number;
  errorFileKey: string | null;
  validationSummary: Prisma.JsonValue;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ImportBatchEntity {
  return {
    ...row,
    columnMapping: row.columnMapping as Record<string, string> | null,
    status: row.status as ImportBatchStatus,
    validationSummary: row.validationSummary as Record<string, number> | null,
  };
}

@Injectable()
export class PrismaImportRepository implements ImportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateImportBatchData): Promise<ImportBatchEntity> {
    const row = await this.prisma.importBatch.create({
      data: {
        dataSourceId: data.dataSourceId,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileStorageKey: data.fileStorageKey,
        mimeType: data.mimeType ?? null,
        status: "UPLOADING",
        createdBy: data.createdBy,
      },
    });
    return toEntity(row);
  }

  async findByIdInSession(
    id: string,
    analysisSessionId: string,
    organizationId: string,
  ): Promise<ImportBatchEntity | null> {
    const row = await this.prisma.importBatch.findFirst({
      where: {
        id,
        dataSource: {
          analysisSessionId,
          analysisSession: { organizationId },
        },
      },
    });
    return row ? toEntity(row) : null;
  }

  async updateMapping(
    id: string,
    analysisSessionId: string,
    organizationId: string,
    columnMapping: Record<string, string>,
  ): Promise<ImportBatchEntity | null> {
    const existing = await this.findByIdInSession(id, analysisSessionId, organizationId);
    if (!existing) return null;

    const row = await this.prisma.importBatch.update({
      where: { id },
      data: { columnMapping },
    });
    return toEntity(row);
  }

  async updateStatus(
    id: string,
    analysisSessionId: string,
    organizationId: string,
    status: ImportBatchStatus,
    extra?: Partial<
      Pick<
        ImportBatchEntity,
        | "totalRows"
        | "validRows"
        | "errorRows"
        | "importedRows"
        | "errorFileKey"
        | "validationSummary"
      >
    >,
    tx?: Prisma.TransactionClient,
  ): Promise<ImportBatchEntity | null> {
    const client = tx ?? this.prisma;
    const existing = await this.findByIdInSession(id, analysisSessionId, organizationId);
    if (!existing) return null;

    const row = await client.importBatch.update({
      where: { id },
      data: {
        status,
        ...(extra?.totalRows !== undefined ? { totalRows: extra.totalRows } : {}),
        ...(extra?.validRows !== undefined ? { validRows: extra.validRows } : {}),
        ...(extra?.errorRows !== undefined ? { errorRows: extra.errorRows } : {}),
        ...(extra?.importedRows !== undefined ? { importedRows: extra.importedRows } : {}),
        ...(extra?.errorFileKey !== undefined ? { errorFileKey: extra.errorFileKey } : {}),
        ...(extra?.validationSummary !== undefined
          ? { validationSummary: extra.validationSummary as object }
          : {}),
      },
    });
    return toEntity(row);
  }
}
