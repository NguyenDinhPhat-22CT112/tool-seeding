import type {
  DataSourceStatus,
  PaginatedResponse,
  SourceType,
} from "@seeding/contracts";

export type { DataSourceStatus, SourceType };

export interface DataSourceEntity {
  id: string;
  analysisSessionId: string;
  businessId: string;
  businessLocationId: string | null;
  name: string;
  sourceType: SourceType;
  status: DataSourceStatus;
  totalRecords: number | null;
  validRecords: number | null;
  errorRecords: number | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateDataSourceData = {
  analysisSessionId: string;
  businessId: string;
  businessLocationId?: string | null;
  name: string;
  sourceType: SourceType;
  createdBy: string | null;
};

export type UpdateDataSourceData = {
  name?: string;
  businessLocationId?: string | null;
};

export interface DataSourceRepository {
  create(data: CreateDataSourceData): Promise<DataSourceEntity>;

  findByIdInSession(
    id: string,
    analysisSessionId: string,
    organizationId: string,
  ): Promise<DataSourceEntity | null>;

  listBySession(
    analysisSessionId: string,
    organizationId: string,
  ): Promise<DataSourceEntity[]>;

  findManualBySession(
    analysisSessionId: string,
    organizationId: string,
  ): Promise<DataSourceEntity | null>;

  update(
    id: string,
    analysisSessionId: string,
    organizationId: string,
    data: UpdateDataSourceData,
  ): Promise<DataSourceEntity | null>;

  remove(
    id: string,
    analysisSessionId: string,
    organizationId: string,
  ): Promise<DataSourceEntity | null>;

  countFeedback(
    id: string,
    analysisSessionId: string,
    organizationId: string,
  ): Promise<number>;

  updateStatus(
    id: string,
    analysisSessionId: string,
    organizationId: string,
    status: DataSourceStatus,
  ): Promise<DataSourceEntity | null>;
}

export const DATA_SOURCE_REPOSITORY = Symbol("DATA_SOURCE_REPOSITORY");

export type Paginated<T> = PaginatedResponse<T>;
