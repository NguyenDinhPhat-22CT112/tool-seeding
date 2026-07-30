import type { DataSourceResponse } from "@seeding/contracts";
import { DataSourceEntity } from "../domain/data-source.types";

export class DataSourceMapper {
  static toResponse(entity: DataSourceEntity): DataSourceResponse {
    return {
      id: entity.id,
      analysisSessionId: entity.analysisSessionId,
      businessId: entity.businessId,
      businessLocationId: entity.businessLocationId,
      name: entity.name,
      sourceType: entity.sourceType,
      status: entity.status,
      totalRecords: entity.totalRecords,
      validRecords: entity.validRecords,
      errorRecords: entity.errorRecords,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
