import type { ImportBatchResponse } from "@seeding/contracts";
import { ImportBatchEntity } from "../domain/import.types";

export class ImportMapper {
  static toResponse(
    entity: ImportBatchEntity,
    headers?: string[],
  ): ImportBatchResponse {
    return {
      id: entity.id,
      dataSourceId: entity.dataSourceId,
      fileName: entity.fileName,
      fileSize: entity.fileSize,
      status: entity.status,
      totalRows: entity.totalRows,
      validRows: entity.validRows,
      errorRows: entity.errorRows,
      importedRows: entity.importedRows,
      columnMapping: entity.columnMapping,
      ...(headers ? { headers } : {}),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
