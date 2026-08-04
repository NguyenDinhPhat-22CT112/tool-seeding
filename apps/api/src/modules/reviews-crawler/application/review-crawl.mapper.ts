import { ApiProperty } from "@nestjs/swagger";

export interface TriggerReviewCrawlResponse {
  idempotent: boolean;
  dataSourceId: string;
  jobId: string;
  jobStatus: string;
  crawl: {
    dataSourceId: string;
    businessLocationId: string;
    name: string;
    status: string;
  };
}

export class ReviewCrawlSummaryDto {
  @ApiProperty()
  dataSourceId!: string;
  @ApiProperty()
  businessLocationId!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty()
  status!: string;
}

export class TriggerReviewCrawlResponseDto implements TriggerReviewCrawlResponse {
  @ApiProperty()
  idempotent!: boolean;
  @ApiProperty()
  dataSourceId!: string;
  @ApiProperty()
  jobId!: string;
  @ApiProperty()
  jobStatus!: string;
  @ApiProperty({ type: () => ReviewCrawlSummaryDto })
  crawl!: ReviewCrawlSummaryDto;
}

export class ReviewCrawlMapper {
  static toTriggerResponse(params: {
    idempotent: boolean;
    dataSourceId: string;
    jobId: string;
    jobStatus: string;
    businessLocationId: string;
    name: string;
    dataSourceStatus: string;
  }): TriggerReviewCrawlResponse {
    return {
      idempotent: params.idempotent,
      dataSourceId: params.dataSourceId,
      jobId: params.jobId,
      jobStatus: params.jobStatus,
      crawl: {
        dataSourceId: params.dataSourceId,
        businessLocationId: params.businessLocationId,
        name: params.name,
        status: params.dataSourceStatus,
      },
    };
  }
}
