import type { DataSourceEntity } from "../../data-sources/domain/data-source.types";

export interface ReviewCrawlPayload {
  placeId: string;
  dataSourceId: string;
  nextToken: string | null;
}

export interface ReviewCrawlLocation {
  id: string;
  name: string;
  serpapiPlaceId: string | null;
}

export interface ReviewCrawlDataSourceSummary {
  id: string;
  businessLocationId: string | null;
  name: string;
  status: string;
}

export interface ReviewCrawlRepository {
  findLocation(
    id: string,
    businessId: string,
    organizationId: string,
  ): Promise<ReviewCrawlLocation | null>;

  createDataSource(data: {
    analysisSessionId: string;
    businessId: string;
    businessLocationId: string;
    name: string;
    createdBy: string | null;
  }): Promise<DataSourceEntity>;

  findActiveCrawlJob(
    sessionId: string,
    organizationId: string,
  ): Promise<{ id: string; dataSourceId: string | null; status: string } | null>;

  findDataSourceSummary(
    dataSourceId: string,
  ): Promise<ReviewCrawlDataSourceSummary | null>;

  /** DataSource COMPLETED gần nhất của cùng businessLocation trong org (khác session hiện tại) để reuse reviews. */
  findReusableDataSource(params: {
    businessLocationId: string;
    organizationId: string;
    excludeSessionId: string;
  }): Promise<{ id: string; name: string; status: string; totalRecords: number | null } | null>;

  /** Copy toàn bộ feedback từ dataSource cũ sang dataSource + session mới (reuse, không gọi SerpAPI). */
  copyFeedbacksFromDataSource(params: {
    fromDataSourceId: string;
    toDataSourceId: string;
    toSessionId: string;
  }): Promise<number>;
}

export const REVIEW_CRAWL_REPOSITORY = Symbol("REVIEW_CRAWL_REPOSITORY");
