import { Injectable } from "@nestjs/common";
import { PrismaService } from "@seeding/database";
import {
  ReviewCrawlRepository,
  ReviewCrawlLocation,
  ReviewCrawlDataSourceSummary,
} from "../domain/review-crawl.types";
import { DataSourceEntity } from "../../data-sources/domain/data-source.types";

@Injectable()
export class PrismaReviewCrawlRepository implements ReviewCrawlRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findLocation(
    id: string,
    businessId: string,
    organizationId: string,
  ): Promise<ReviewCrawlLocation | null> {
    const row = await this.prisma.businessLocation.findFirst({
      where: { id, businessId, organizationId },
      select: { id: true, name: true, serpapiPlaceId: true },
    });
    return row ? { ...row, serpapiPlaceId: row.serpapiPlaceId ?? null } : null;
  }

  async createDataSource(data: {
    analysisSessionId: string;
    businessId: string;
    businessLocationId: string;
    name: string;
    createdBy: string | null;
  }): Promise<DataSourceEntity> {
    const row = await this.prisma.dataSource.create({
      data: {
        analysisSessionId: data.analysisSessionId,
        businessId: data.businessId,
        businessLocationId: data.businessLocationId,
        name: data.name,
        sourceType: "SERPAPI",
        createdBy: data.createdBy,
      },
    });
    return toDataSourceEntity(row);
  }

  async findActiveCrawlJob(
    sessionId: string,
    organizationId: string,
  ): Promise<{ id: string; dataSourceId: string | null; status: string } | null> {
    const row = await this.prisma.processingJob.findFirst({
      where: {
        analysisSessionId: sessionId,
        jobType: "REVIEW_CRAWLING",
        status: { in: ["PENDING", "RUNNING"] },
        analysisSession: { organizationId },
      },
      select: { id: true, dataSourceId: true, status: true },
      orderBy: { createdAt: "desc" },
    });
    return row ?? null;
  }

  async findDataSourceSummary(
    dataSourceId: string,
  ): Promise<ReviewCrawlDataSourceSummary | null> {
    const row = await this.prisma.dataSource.findUnique({
      where: { id: dataSourceId },
      select: { id: true, businessLocationId: true, name: true, status: true },
    });
    return row ? { ...row, businessLocationId: row.businessLocationId ?? null } : null;
  }

  async findReusableDataSource(params: {
    businessLocationId: string;
    organizationId: string;
    excludeSessionId: string;
  }): Promise<{ id: string; name: string; status: string; totalRecords: number | null } | null> {
    const row = await this.prisma.dataSource.findFirst({
      where: {
        businessLocationId: params.businessLocationId,
        status: "COMPLETED",
        analysisSession: {
          organizationId: params.organizationId,
          id: { not: params.excludeSessionId },
        },
      },
      select: { id: true, name: true, status: true, totalRecords: true },
      orderBy: { updatedAt: "desc" },
    });
    return row ?? null;
  }

  async copyFeedbacksFromDataSource(params: {
    fromDataSourceId: string;
    toDataSourceId: string;
    toSessionId: string;
  }): Promise<number> {
    const rows = await this.prisma.customerFeedback.findMany({
      where: { dataSourceId: params.fromDataSourceId },
      select: {
        externalId: true,
        contentHash: true,
        rawContent: true,
        reviewerName: true,
        rating: true,
        language: true,
        sourceUrl: true,
        publishedAt: true,
      },
    });
    if (rows.length === 0) return 0;

    const result = await this.prisma.customerFeedback.createMany({
      data: rows.map((row) => ({
        analysisSessionId: params.toSessionId,
        dataSourceId: params.toDataSourceId,
        externalId: row.externalId,
        contentHash: row.contentHash,
        rawContent: row.rawContent,
        reviewerName: row.reviewerName,
        rating: row.rating,
        language: row.language,
        sourceUrl: row.sourceUrl,
        publishedAt: row.publishedAt,
        processingStatus: "RAW",
      })),
      skipDuplicates: true,
    });

    if (result.count > 0) {
      await this.prisma.dataSource.update({
        where: { id: params.toDataSourceId },
        data: {
          status: "COMPLETED",
          totalRecords: { increment: result.count },
          validRecords: { increment: result.count },
        },
      });
    } else {
      await this.prisma.dataSource.update({
        where: { id: params.toDataSourceId },
        data: { status: "COMPLETED" },
      });
    }
    return result.count;
  }
}

function toDataSourceEntity(row: {
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
    sourceType: row.sourceType as DataSourceEntity["sourceType"],
    status: row.status as DataSourceEntity["status"],
  };
}
