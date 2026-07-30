import type { ImportBatchStatus, PaginatedResponse } from "@seeding/contracts";

export type { ImportBatchStatus };

export interface ImportBatchEntity {
  id: string;
  dataSourceId: string;
  fileName: string;
  fileSize: number;
  fileStorageKey: string;
  fileChecksum: string | null;
  mimeType: string | null;
  columnMapping: Record<string, string> | null;
  status: ImportBatchStatus;
  totalRows: number;
  validRows: number;
  errorRows: number;
  importedRows: number;
  errorFileKey: string | null;
  validationSummary: Record<string, number> | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateImportBatchData = {
  dataSourceId: string;
  fileName: string;
  fileSize: number;
  fileStorageKey: string;
  mimeType?: string | null;
  createdBy: string | null;
};

export interface ImportRepository {
  create(data: CreateImportBatchData): Promise<ImportBatchEntity>;

  findByIdInSession(
    id: string,
    analysisSessionId: string,
    organizationId: string,
  ): Promise<ImportBatchEntity | null>;

  updateMapping(
    id: string,
    analysisSessionId: string,
    organizationId: string,
    columnMapping: Record<string, string>,
  ): Promise<ImportBatchEntity | null>;

  updateStatus(
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
  ): Promise<ImportBatchEntity | null>;
}

export const IMPORT_REPOSITORY = Symbol("IMPORT_REPOSITORY");

export type Paginated<T> = PaginatedResponse<T>;
