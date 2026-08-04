import { Inject, Injectable } from "@nestjs/common";
import { RequestContext } from "../../../shared/context/request-context";
import { DomainError } from "../../../shared/exceptions/domain.exceptions";
import {
  ANALYSIS_SESSION_STATUS,
  ANALYSIS_SESSION_REPOSITORY,
  AnalysisSessionRepository,
} from "../../analysis-sessions/domain/analysis-session.types";
import {
  PROCESSING_JOB_REPOSITORY,
  ProcessingJobRepository,
} from "../../data-processing/domain/processing-job.types";
import { ProcessingQueuePublisher } from "../../data-processing/infrastructure/processing-queue.publisher";
import {
  REVIEW_CRAWL_REPOSITORY,
  ReviewCrawlRepository,
} from "../domain/review-crawl.types";
import { TriggerReviewCrawlDto } from "./review-crawl.dto";
import { ReviewCrawlMapper } from "./review-crawl.mapper";
import { ReviewCrawlPolicy } from "./review-crawl.policy";

@Injectable()
export class ReviewCrawlService {
  constructor(
    @Inject(REVIEW_CRAWL_REPOSITORY) private readonly repo: ReviewCrawlRepository,
    @Inject(ANALYSIS_SESSION_REPOSITORY)
    private readonly sessionRepo: AnalysisSessionRepository,
    @Inject(PROCESSING_JOB_REPOSITORY)
    private readonly jobRepo: ProcessingJobRepository,
    private readonly publisher: ProcessingQueuePublisher,
    private readonly policy: ReviewCrawlPolicy,
  ) {}

  async trigger(
    ctx: RequestContext,
    sessionId: string,
    dto: TriggerReviewCrawlDto,
  ) {
    this.policy.assertCanTrigger(ctx);

    const session = await this.sessionRepo.findByIdInOrg(sessionId, ctx.organizationId);
    if (!session) {
      throw new DomainError("SESSION_NOT_FOUND");
    }
    if (session.status !== ANALYSIS_SESSION_STATUS.DATA_COLLECTION) {
      throw new DomainError("SESSION_WRONG_STATE");
    }

    const location = await this.repo.findLocation(
      dto.businessLocationId,
      session.businessId,
      ctx.organizationId,
    );
    if (!location) {
      throw new DomainError("CRAWL_LOCATION_NOT_FOUND");
    }
    if (!location.serpapiPlaceId) {
      throw new DomainError("CRAWL_LOCATION_NOT_LINKED");
    }

    const existing = await this.repo.findActiveCrawlJob(sessionId, ctx.organizationId);
    if (existing) {
      const dataSource = existing.dataSourceId
        ? await this.repo.findDataSourceSummary(existing.dataSourceId)
        : null;
      if (!dataSource) {
        throw new DomainError("DATA_SOURCE_NOT_FOUND");
      }
      return ReviewCrawlMapper.toTriggerResponse({
        idempotent: true,
        dataSourceId: dataSource.id,
        jobId: existing.id,
        jobStatus: existing.status,
        businessLocationId: dataSource.businessLocationId ?? "",
        name: dataSource.name,
        dataSourceStatus: dataSource.status,
      });
    }

    const reusable = await this.repo.findReusableDataSource({
      businessLocationId: location.id,
      organizationId: ctx.organizationId,
      excludeSessionId: sessionId,
    });
    if (reusable) {
      const dataSource = await this.repo.createDataSource({
        analysisSessionId: sessionId,
        businessId: session.businessId,
        businessLocationId: location.id,
        name: `${location.name} - Google Reviews`,
        createdBy: ctx.userId,
      });

      const copied = await this.repo.copyFeedbacksFromDataSource({
        fromDataSourceId: reusable.id,
        toDataSourceId: dataSource.id,
        toSessionId: sessionId,
      });

      const job = await this.jobRepo.create({
        analysisSessionId: sessionId,
        jobType: "REVIEW_CRAWLING",
        dataSourceId: dataSource.id,
        payload: {
          placeId: location.serpapiPlaceId,
          dataSourceId: dataSource.id,
          nextToken: null,
          reusedFrom: reusable.id,
          copiedCount: copied,
        },
        createdBy: ctx.userId,
      });

      await this.jobRepo.markCompleted(job.id);

      return ReviewCrawlMapper.toTriggerResponse({
        idempotent: true,
        dataSourceId: dataSource.id,
        jobId: job.id,
        jobStatus: "COMPLETED",
        businessLocationId: location.id,
        name: dataSource.name,
        dataSourceStatus: "COMPLETED",
      });
    }

    const dataSource = await this.repo.createDataSource({
      analysisSessionId: sessionId,
      businessId: session.businessId,
      businessLocationId: location.id,
      name: `${location.name} - Google Reviews`,
      createdBy: ctx.userId,
    });

    const job = await this.jobRepo.create({
      analysisSessionId: sessionId,
      jobType: "REVIEW_CRAWLING",
      dataSourceId: dataSource.id,
      payload: {
        placeId: location.serpapiPlaceId,
        dataSourceId: dataSource.id,
        nextToken: null,
      },
      createdBy: ctx.userId,
    });

    await this.publisher.enqueue({
      processingJobId: job.id,
      analysisSessionId: sessionId,
      organizationId: ctx.organizationId,
      jobType: "REVIEW_CRAWLING",
      triggeredBy: ctx.userId,
    });

    return ReviewCrawlMapper.toTriggerResponse({
      idempotent: false,
      dataSourceId: dataSource.id,
      jobId: job.id,
      jobStatus: job.status,
      businessLocationId: location.id,
      name: dataSource.name,
      dataSourceStatus: dataSource.status,
    });
  }
}
