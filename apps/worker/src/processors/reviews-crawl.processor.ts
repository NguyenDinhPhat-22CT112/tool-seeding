import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job } from "bullmq";
import { createHash } from "node:crypto";
import {
  SerpApiClient,
  SerpApiClientError,
  SerpApiQuotaExceededError,
  SerpApiUsageDb,
  SerpApiUsageTracker,
} from "@seeding/serpapi-client";
import { PrismaService } from "@seeding/database";
import { JobRepositoryService } from "../services/job-repository.service";
import { globalFileLogger } from "../common/file-logger";

const CHECK_CANCELLATION_EVERY = 2;
const MAX_PAGES = 25;

@Injectable()
export class ReviewsCrawlProcessor {
  private readonly logger = new Logger(ReviewsCrawlProcessor.name);
  private readonly client: SerpApiClient;
  private readonly usageTracker: SerpApiUsageTracker;

  constructor(
    private readonly jobRepo: JobRepositoryService,
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.client = new SerpApiClient({
      enabled: config.get("SERPAPI_ENABLED", "false") === "true",
      apiKey: config.get<string>("SERPAPI_KEY") ?? undefined,
      baseUrl: config.get("SERPAPI_BASE_URL", "https://serpapi.com"),
      timeoutMs: Number(config.get("SERPAPI_TIMEOUT_MS", 10000)),
      languageCode: config.get("SERPAPI_LANGUAGE_CODE", "vi"),
      regionCode: config.get("SERPAPI_REGION_CODE", "VN"),
    });
    this.usageTracker = new SerpApiUsageTracker(toUsageDb(this.prisma), {
      AUTOCOMPLETE_REQUESTS: { global: Number.MAX_SAFE_INTEGER, organization: Number.MAX_SAFE_INTEGER },
      PLACE_DETAILS_ENTERPRISE: { global: Number.MAX_SAFE_INTEGER, organization: Number.MAX_SAFE_INTEGER },
      REVIEWS_REQUESTS: {
        global: Number(config.get("SERPAPI_REVIEWS_MONTHLY_LIMIT", 1000)),
        organization: Number(config.get("SERPAPI_REVIEWS_ORG_MONTHLY_LIMIT", 50)),
      },
    });
  }

  async process(job: Job): Promise<void> {
    const data = job.data as {
      version: number;
      processingJobId: string;
      analysisSessionId: string;
      organizationId: string;
      jobType: string;
    };

    const { processingJobId, analysisSessionId, organizationId } = data;
    const startedAt = Date.now();

    await globalFileLogger.log("INFO", "ReviewsCrawlProcessor.process called", {
      processingJobId,
      analysisSessionId,
      organizationId,
      jobType: data.jobType,
      bullmqJobId: job.id,
    });

    this.logger.log({ processingJobId, analysisSessionId }, "Reviews crawl started");

    await this.jobRepo.markRunning(processingJobId, job.id!);

    const crawlJob = await this.jobRepo.findCrawlJob(processingJobId);
    if (!crawlJob || !crawlJob.dataSourceId) {
      await this.jobRepo.markFailed(processingJobId, "Job data missing");
      return;
    }

    const payload = crawlJob.payload as { placeId?: string; nextToken?: string | null } | null;
    const placeId = payload?.placeId;
    if (!placeId) {
      await this.jobRepo.markFailed(processingJobId, "placeId missing in payload");
      return;
    }

    const dataSource = await this.jobRepo.findDataSource(crawlJob.dataSourceId);
    if (!dataSource) {
      await this.jobRepo.markFailed(processingJobId, "DataSource not found");
      return;
    }

    await this.jobRepo.markDataSourceStatus(dataSource.id, "PROCESSING");

    let nextToken: string | null = payload?.nextToken ?? null;
    let page = 0;
    let totalFetched = 0;
    let totalInserted = 0;

    try {
      do {
        await this.usageTracker.consume(organizationId, "REVIEWS_REQUESTS");

        const result = await this.client.getReviewsPage({
          placeId,
          nextToken: nextToken ?? undefined,
          sortBy: "date_of_rating",
        });

        const mapped = result.reviews.map((review) => ({
          externalId: review.reviewId,
          rawContent: review.text,
          contentHash: createHash("sha256").update(review.text.trim().normalize("NFC")).digest("hex"),
          reviewerName: review.reviewerName,
          rating: review.rating,
          publishedAt: review.publishedAt ? new Date(review.publishedAt) : null,
        }));

        totalFetched += mapped.length;
        const inserted = await this.jobRepo.insertCrawledReviews({
          analysisSessionId,
          dataSourceId: dataSource.id,
          reviews: mapped,
        });
        totalInserted += inserted;

        nextToken = result.nextToken;
        page += 1;

        await this.jobRepo.updateCrawlJobPayload(processingJobId, {
          placeId,
          dataSourceId: dataSource.id,
          nextToken,
        });

        if (page % CHECK_CANCELLATION_EVERY === 0) {
          const cancelled = await this.jobRepo.checkCancelled(processingJobId);
          if (cancelled) {
            this.logger.warn({ processingJobId }, "Reviews crawl cancelled by user");
            await this.jobRepo.markDataSourceStatus(dataSource.id, "FAILED");
            return;
          }
        }

        const totalKnown = result.totalReviews ?? null;
        const progress = computeProgress(page, totalFetched, totalKnown);
        await job.updateProgress(progress);
      } while (nextToken && page < MAX_PAGES);

      await this.jobRepo.markDataSourceStatus(dataSource.id, "COMPLETED");
      await this.jobRepo.markCompleted(processingJobId);

      const durationMs = Date.now() - startedAt;
      await globalFileLogger.log("INFO", "ReviewsCrawlProcessor completed", {
        processingJobId,
        page,
        totalFetched,
        totalInserted,
        durationMs,
      });

      this.logger.log({
        processingJobId,
        page,
        totalFetched,
        totalInserted,
        durationMs,
      }, "Reviews crawl completed");
    } catch (error) {
      if (error instanceof SerpApiQuotaExceededError) {
        await globalFileLogger.log("ERROR", "SerpAPI quota exceeded", {
          processingJobId,
          scope: error.scope,
        });
        this.logger.warn({ processingJobId, scope: error.scope }, "SerpAPI quota exceeded");
        await this.jobRepo.markDataSourceStatus(dataSource.id, "FAILED");
        await this.jobRepo.markFailed(processingJobId, "SerpAPI quota exceeded");
        return;
      }
      if (error instanceof SerpApiClientError) {
        await globalFileLogger.log("ERROR", "SerpAPI client error", {
          processingJobId,
          error: error.message,
        });
        await this.jobRepo.markDataSourceStatus(dataSource.id, "FAILED");
        await this.jobRepo.markFailed(processingJobId, error.message);
        return;
      }
      await globalFileLogger.log("ERROR", "Reviews crawl failed with unknown error", {
        processingJobId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      await this.jobRepo.markDataSourceStatus(dataSource.id, "FAILED");
      throw error;
    }
  }
}

function computeProgress(page: number, fetched: number, totalKnown: number | null): number {
  if (totalKnown && totalKnown > 0) {
    return Math.min(100, Math.round((fetched / totalKnown) * 100));
  }
  return Math.min(100, page * 10);
}

/** Bridge Prisma → SerpApiUsageDb (overloaded $transaction của Prisma không khớp interface). */
function toUsageDb(prisma: PrismaService): SerpApiUsageDb {
  return {
    $transaction: <R>(fn: (tx: SerpApiUsageDb) => Promise<R>) =>
      prisma.$transaction((tx) => fn(tx as unknown as SerpApiUsageDb)),
    externalApiUsage: prisma.externalApiUsage,
  };
}
