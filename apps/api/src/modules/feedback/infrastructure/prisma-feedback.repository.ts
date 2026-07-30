import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";
import {
  CreateFeedbackData,
  FeedbackEntity,
  FeedbackProcessingStatus,
  FeedbackRepository,
  ListFeedbackFilter,
  Paginated,
  UpdateFeedbackData,
} from "../domain/feedback.types";

function toEntity(row: {
  id: string;
  analysisSessionId: string;
  dataSourceId: string;
  externalId: string | null;
  contentHash: string | null;
  rawContent: string;
  normalizedContent: string | null;
  reviewerName: string | null;
  rating: number | null;
  language: string | null;
  sourceUrl: string | null;
  publishedAt: Date | null;
  notes: string | null;
  processingStatus: string;
  duplicateOfId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): FeedbackEntity {
  return {
    ...row,
    processingStatus: row.processingStatus as FeedbackProcessingStatus,
  };
}

@Injectable()
export class PrismaFeedbackRepository implements FeedbackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateFeedbackData): Promise<FeedbackEntity> {
    const row = await this.prisma.customerFeedback.create({
      data: {
        analysisSessionId: data.analysisSessionId,
        dataSourceId: data.dataSourceId,
        rawContent: data.rawContent,
        contentHash: data.contentHash,
        reviewerName: data.reviewerName ?? null,
        rating: data.rating ?? null,
        language: data.language ?? null,
        sourceUrl: data.sourceUrl ?? null,
        publishedAt: data.publishedAt ?? null,
        notes: data.notes ?? null,
        processingStatus: "RAW",
      },
    });
    return toEntity(row);
  }

  async createMany(data: CreateFeedbackData[]): Promise<number> {
    if (data.length === 0) return 0;
    const result = await this.prisma.customerFeedback.createMany({
      data: data.map((item) => ({
        analysisSessionId: item.analysisSessionId,
        dataSourceId: item.dataSourceId,
        rawContent: item.rawContent,
        contentHash: item.contentHash,
        reviewerName: item.reviewerName ?? null,
        rating: item.rating ?? null,
        language: item.language ?? null,
        sourceUrl: item.sourceUrl ?? null,
        publishedAt: item.publishedAt ?? null,
        notes: item.notes ?? null,
        processingStatus: "RAW" as const,
      })),
    });
    return result.count;
  }

  async findByIdInSession(
    id: string,
    analysisSessionId: string,
    organizationId: string,
  ): Promise<FeedbackEntity | null> {
    const row = await this.prisma.customerFeedback.findFirst({
      where: {
        id,
        analysisSessionId,
        analysisSession: { organizationId },
      },
    });
    return row ? toEntity(row) : null;
  }

  async list(filter: ListFeedbackFilter): Promise<Paginated<FeedbackEntity>> {
    const where = {
      analysisSessionId: filter.analysisSessionId,
      analysisSession: { organizationId: filter.organizationId },
      ...(filter.processingStatus ? { processingStatus: filter.processingStatus } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.customerFeedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.customerFeedback.count({ where }),
    ]);

    return {
      items: rows.map(toEntity),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async update(
    id: string,
    analysisSessionId: string,
    organizationId: string,
    data: UpdateFeedbackData,
  ): Promise<FeedbackEntity | null> {
    const existing = await this.findByIdInSession(id, analysisSessionId, organizationId);
    if (!existing) return null;

    const row = await this.prisma.customerFeedback.update({
      where: { id },
      data: {
        ...(data.rating !== undefined ? { rating: data.rating } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
    return toEntity(row);
  }

  async exclude(
    id: string,
    analysisSessionId: string,
    organizationId: string,
  ): Promise<FeedbackEntity | null> {
    const existing = await this.findByIdInSession(id, analysisSessionId, organizationId);
    if (!existing) return null;

    const row = await this.prisma.customerFeedback.update({
      where: { id },
      data: { processingStatus: "EXCLUDED" },
    });
    return toEntity(row);
  }
}
