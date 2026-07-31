import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Response } from "express";
import { PrismaService } from "@seeding/database";
import { RequestContext } from "../../../shared/context/request-context";
import { DomainError } from "../../../shared/exceptions/domain.exceptions";
import { sanitizeCell } from "../../../shared/security/content-sanitizer";
import { STORAGE_PROVIDER, StorageProvider } from "../../../integrations/storage/storage.interface";
import {
  validateFileExtension,
  validateFileSize,
  validateMagicBytes,
} from "../../../shared/security/file-validator";
import { sanitizeFilename } from "../../../shared/security/file-validator";
import { AnalysisSessionStateMachine } from "../../analysis-sessions/domain/analysis-session-state-machine";
import {
  ANALYSIS_SESSION_REPOSITORY,
  AnalysisSessionRepository,
} from "../../analysis-sessions/domain/analysis-session.types";
import {
  computeContentHash,
  CreateFeedbackData,
  FEEDBACK_REPOSITORY,
  FeedbackRepository,
} from "../../feedback/domain/feedback.types";
import {
  DATA_SOURCE_REPOSITORY,
  DataSourceRepository,
} from "../../data-sources/domain/data-source.types";
import { IMPORT_REPOSITORY, ImportRepository } from "../domain/import.types";
import { FileParserService } from "./file-parser.service";
import { MapImportColumnsDto } from "./import.dto";
import { ImportMapper } from "./import.mapper";
import { ImportPolicy } from "./import.policy";

interface RowValidationResult {
  valid: boolean;
  errorCodes: string[];
  data: CreateFeedbackData | null;
  originalData: Record<string, string>;
  rowNumber: number;
}

@Injectable()
export class ImportService {
  constructor(
    @Inject(IMPORT_REPOSITORY) private readonly repo: ImportRepository,
    @Inject(ANALYSIS_SESSION_REPOSITORY)
    private readonly sessionRepo: AnalysisSessionRepository,
    @Inject(DATA_SOURCE_REPOSITORY) private readonly dataSourceRepo: DataSourceRepository,
    @Inject(FEEDBACK_REPOSITORY) private readonly feedbackRepo: FeedbackRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly fileParser: FileParserService,
    private readonly policy: ImportPolicy,
    private readonly prisma: PrismaService,
  ) {}

  async upload(
    ctx: RequestContext,
    sessionId: string,
    file: Express.Multer.File,
  ) {
    this.policy.assertCanImport(ctx);
    const session = await this.assertSessionAllowsData(ctx, sessionId);

    const sizeResult = validateFileSize(file.size);
    if (!sizeResult.valid) throw new DomainError("IMPORT_FILE_TOO_LARGE");

    const extResult = validateFileExtension(file.originalname);
    if (!extResult.valid) throw new DomainError("IMPORT_UNSUPPORTED_TYPE");

    const magicResult = validateMagicBytes(file.buffer, file.mimetype);
    if (!magicResult.valid) throw new DomainError("IMPORT_UNSUPPORTED_TYPE");

    const sourceType = file.originalname.toLowerCase().endsWith(".csv") ? "CSV" : "EXCEL";
    const dataSource = await this.dataSourceRepo.create({
      analysisSessionId: sessionId,
      businessId: session.businessId,
      name: sanitizeFilename(file.originalname),
      sourceType,
      createdBy: ctx.userId,
    });

    const storageKey = randomUUID();
    await this.storage.save(storageKey, file.buffer, file.mimetype);

    let headers: string[];
    try {
      headers = this.fileParser.parseHeaders(file.buffer, file.originalname);
    } catch {
      throw new DomainError("IMPORT_PARSE_ERROR");
    }

    const batch = await this.repo.create({
      dataSourceId: dataSource.id,
      fileName: sanitizeFilename(file.originalname),
      fileSize: file.size,
      fileStorageKey: storageKey,
      mimeType: file.mimetype,
      createdBy: ctx.userId,
    });

    const updated = await this.repo.updateStatus(
      batch.id,
      sessionId,
      ctx.organizationId,
      "MAPPING",
    );

    return {
      batchId: batch.id,
      headers,
      batch: ImportMapper.toResponse(updated ?? batch, headers),
    };
  }

  async getBatch(ctx: RequestContext, sessionId: string, batchId: string) {
    const batch = await this.findBatchOrThrow(ctx, sessionId, batchId);
    return ImportMapper.toResponse(batch);
  }

  async mapColumns(
    ctx: RequestContext,
    sessionId: string,
    batchId: string,
    dto: MapImportColumnsDto,
  ) {
    this.policy.assertCanImport(ctx);
    const batch = await this.findBatchOrThrow(ctx, sessionId, batchId);

    if (batch.status !== "MAPPING") {
      throw new DomainError("IMPORT_WRONG_STATE");
    }

    const hasContent = Object.values(dto.columnMapping).includes("content");
    if (!hasContent) {
      throw new DomainError("IMPORT_CONTENT_COL_REQUIRED");
    }

    const updated = await this.repo.updateMapping(
      batchId,
      sessionId,
      ctx.organizationId,
      dto.columnMapping,
    );
    if (!updated) throw new DomainError("IMPORT_NOT_FOUND");
    return ImportMapper.toResponse(updated);
  }

  async preview(ctx: RequestContext, sessionId: string, batchId: string) {
    this.policy.assertCanImport(ctx);
    const batch = await this.findBatchOrThrow(ctx, sessionId, batchId);

    if (batch.status !== "MAPPING" || !batch.columnMapping) {
      throw new DomainError("IMPORT_WRONG_STATE");
    }

    const buffer = await this.storage.read(batch.fileStorageKey);
    const parsed = this.fileParser.parseWithMapping(
      buffer,
      batch.fileName,
      batch.columnMapping,
      10,
    );

    return {
      rows: parsed.rows,
      totalPreviewRows: parsed.rows.length,
    };
  }

  async confirm(ctx: RequestContext, sessionId: string, batchId: string) {
    this.policy.assertCanImport(ctx);
    const batch = await this.findBatchOrThrow(ctx, sessionId, batchId);

    if (batch.status !== "MAPPING") {
      return ImportMapper.toResponse(batch);
    }

    if (!batch.columnMapping) {
      throw new DomainError("IMPORT_CONTENT_COL_REQUIRED");
    }

    await this.repo.updateStatus(batchId, sessionId, ctx.organizationId, "VALIDATING");

    const buffer = await this.storage.read(batch.fileStorageKey);
    const parsed = this.fileParser.parseWithMapping(
      buffer,
      batch.fileName,
      batch.columnMapping,
    );

    const validated = parsed.rows.map((row, index) =>
      this.validateRow(row, index + 2, sessionId, batch.dataSourceId),
    );

    const validRows = validated.filter((r) => r.valid);
    const errorRows = validated.filter((r) => !r.valid);

    if (validRows.length === 0) {
      const errorFileKey = await this.writeErrorCsv(errorRows);
      await this.repo.updateStatus(
        batchId,
        sessionId,
        ctx.organizationId,
        "FAILED",
        {
          totalRows: parsed.rows.length,
          validRows: 0,
          errorRows: errorRows.length,
          importedRows: 0,
          errorFileKey,
          validationSummary: this.summarizeErrors(errorRows),
        },
      );
      throw new DomainError("IMPORT_ALL_ROWS_INVALID");
    }

    let errorFileKey: string | null = null;
    if (errorRows.length > 0) {
      errorFileKey = await this.writeErrorCsv(errorRows);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const imported = await this.feedbackRepo.createMany(
        validRows.map((r) => r.data!),
        tx,
      );
      return this.repo.updateStatus(
        batchId,
        sessionId,
        ctx.organizationId,
        "COMPLETED",
        {
          totalRows: parsed.rows.length,
          validRows: validRows.length,
          errorRows: errorRows.length,
          importedRows: imported,
          errorFileKey,
          validationSummary: this.summarizeErrors(errorRows),
        },
        tx,
      );
    });

    return ImportMapper.toResponse(updated!);
  }

  async downloadErrors(
    ctx: RequestContext,
    sessionId: string,
    batchId: string,
    res: Response,
  ) {
    const batch = await this.findBatchOrThrow(ctx, sessionId, batchId);
    if (!batch.errorFileKey) {
      throw new DomainError("IMPORT_NOT_FOUND", "Không có file lỗi");
    }

    const buffer = await this.storage.read(batch.errorFileKey);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="import-errors-${batchId}.csv"`,
    );
    res.send(buffer);
  }

  private validateRow(
    row: Record<string, string>,
    rowNumber: number,
    sessionId: string,
    dataSourceId: string,
  ): RowValidationResult {
    const errorCodes: string[] = [];
    const content = (row.content ?? "").trim();

    if (!content) errorCodes.push("FEEDBACK_CONTENT_EMPTY");

    let rating: number | null = null;
    if (row.rating != null && row.rating !== "") {
      rating = Number(row.rating);
      if (Number.isNaN(rating) || rating < 1 || rating > 5) {
        errorCodes.push("FEEDBACK_INVALID_RATING");
        rating = null;
      }
    }

    let publishedAt: Date | null = null;
    if (row.publishedAt != null && row.publishedAt !== "") {
      const parsed = new Date(row.publishedAt);
      if (Number.isNaN(parsed.getTime())) {
        errorCodes.push("INVALID_PUBLISHED_AT");
      } else {
        publishedAt = parsed;
      }
    }

    if (errorCodes.length > 0) {
      return { valid: false, errorCodes, data: null, originalData: row, rowNumber };
    }

    return {
      valid: true,
      errorCodes: [],
      data: {
        analysisSessionId: sessionId,
        dataSourceId,
        rawContent: content,
        contentHash: computeContentHash(content),
        rating,
        reviewerName: row.reviewerName ?? null,
        language: row.language ?? null,
        sourceUrl: row.sourceUrl ?? null,
        publishedAt,
        notes: row.notes ?? null,
      },
      originalData: row,
      rowNumber,
    };
  }

  private summarizeErrors(errorRows: RowValidationResult[]): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const row of errorRows) {
      for (const code of row.errorCodes) {
        summary[code] = (summary[code] ?? 0) + 1;
      }
    }
    return summary;
  }

  private async writeErrorCsv(errorRows: RowValidationResult[]): Promise<string> {
    const header = "row_number,error_codes,original_data\n";
    const lines = errorRows.map((row) => {
      const codes = row.errorCodes.join("|");
      const original = sanitizeCell(JSON.stringify(row.originalData));
      return `${row.rowNumber},${codes},${original}`;
    });
    const csv = header + lines.join("\n");
    const key = randomUUID();
    await this.storage.save(key, Buffer.from(csv, "utf8"), "text/csv");
    return key;
  }

  private async findBatchOrThrow(
    ctx: RequestContext,
    sessionId: string,
    batchId: string,
  ) {
    const batch = await this.repo.findByIdInSession(batchId, sessionId, ctx.organizationId);
    if (!batch) throw new DomainError("IMPORT_NOT_FOUND");
    return batch;
  }

  private async assertSessionAllowsData(ctx: RequestContext, sessionId: string) {
    const session = await this.sessionRepo.findByIdInOrg(sessionId, ctx.organizationId);
    if (!session) throw new DomainError("SESSION_NOT_FOUND");
    if (session.status !== "DATA_COLLECTION") {
      throw new DomainError("SESSION_WRONG_STATE");
    }
    if (!AnalysisSessionStateMachine.acceptsNewData(session.status)) {
      throw new DomainError("SESSION_WRONG_STATE");
    }
    return session;
  }
}
