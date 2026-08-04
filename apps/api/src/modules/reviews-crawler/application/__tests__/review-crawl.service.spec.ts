import { DomainError } from "../../../../shared/exceptions/domain.exceptions";
import { RequestContext } from "../../../../shared/context/request-context";
import { AnalysisSessionEntity } from "../../../analysis-sessions/domain/analysis-session.types";
import { AnalysisSessionRepository } from "../../../analysis-sessions/domain/analysis-session.types";
import { ProcessingJobRepository } from "../../../data-processing/domain/processing-job.types";
import { ProcessingQueuePublisher } from "../../../data-processing/infrastructure/processing-queue.publisher";
import {
  ReviewCrawlRepository,
} from "../../domain/review-crawl.types";
import { ReviewCrawlService } from "../review-crawl.service";
import { ReviewCrawlPolicy } from "../review-crawl.policy";

const adminContext: RequestContext = {
  organizationId: "org_1",
  userId: "user_1",
  role: "ORG_ADMIN",
};

function session(overrides: Partial<AnalysisSessionEntity> = {}): AnalysisSessionEntity {
  return {
    id: "sess_1",
    organizationId: "org_1",
    businessId: "biz_1",
    name: "Test",
    objective: null,
    focusProduct: null,
    dateFrom: null,
    dateTo: null,
    status: "DATA_COLLECTION",
    businessSnapshot: null,
    businessSnapshotAt: null,
    createdBy: "user_1",
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    archivedAt: null,
    ...overrides,
  };
}

function buildService() {
  const findLocation = vi.fn<ReviewCrawlRepository["findLocation"]>();
  const createDataSource = vi.fn<ReviewCrawlRepository["createDataSource"]>();
  const findActiveCrawlJob = vi.fn<ReviewCrawlRepository["findActiveCrawlJob"]>();
  const findDataSourceSummary = vi.fn<ReviewCrawlRepository["findDataSourceSummary"]>();
  const findReusableDataSource = vi.fn<ReviewCrawlRepository["findReusableDataSource"]>();
  const copyFeedbacksFromDataSource = vi.fn<ReviewCrawlRepository["copyFeedbacksFromDataSource"]>();

  const repo: ReviewCrawlRepository = {
    findLocation,
    createDataSource,
    findActiveCrawlJob,
    findDataSourceSummary,
    findReusableDataSource,
    copyFeedbacksFromDataSource,
  };

  const findByIdInOrg = vi.fn<AnalysisSessionRepository["findByIdInOrg"]>();
  const sessionRepo = { findByIdInOrg } as unknown as AnalysisSessionRepository;

  const jobCreate = vi.fn<ProcessingJobRepository["create"]>();
  const jobMarkCompleted = vi.fn<ProcessingJobRepository["markCompleted"]>();
  const jobRepo = { create: jobCreate, markCompleted: jobMarkCompleted } as unknown as ProcessingJobRepository;

  const enqueue = vi.fn<ProcessingQueuePublisher["enqueue"]>();
  const publisher = { enqueue } as unknown as ProcessingQueuePublisher;

  const service = new ReviewCrawlService(
    repo,
    sessionRepo,
    jobRepo,
    publisher,
    new ReviewCrawlPolicy(),
  );

  return {
    service,
    mocks: { findLocation, createDataSource, findActiveCrawlJob, findDataSourceSummary, findReusableDataSource, copyFeedbacksFromDataSource, findByIdInOrg, jobCreate, jobMarkCompleted, enqueue },
  };
}

describe("ReviewCrawlService", () => {
  it("tạo job REVIEW_CRAWLING khi location có serpapiPlaceId", async () => {
    const { service, mocks } = buildService();
    mocks.findByIdInOrg.mockResolvedValue(session());
    mocks.findLocation.mockResolvedValue({
      id: "loc_1",
      name: "Cửa hàng A",
      serpapiPlaceId: "ChIJxxxx",
    });
    mocks.findActiveCrawlJob.mockResolvedValue(null);
    mocks.findReusableDataSource.mockResolvedValue(null);
    mocks.createDataSource.mockResolvedValue({
      id: "ds_1",
      analysisSessionId: "sess_1",
      businessId: "biz_1",
      businessLocationId: "loc_1",
      name: "Cửa hàng A - Google Reviews",
      sourceType: "SERPAPI",
      status: "PENDING",
      totalRecords: null,
      validRecords: null,
      errorRecords: null,
      createdBy: "user_1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mocks.jobCreate.mockResolvedValue({
      id: "job_1",
      analysisSessionId: "sess_1",
      dataSourceId: "ds_1",
      importBatchId: null,
      jobType: "REVIEW_CRAWLING",
      bullmqJobId: null,
      status: "PENDING",
      progress: 0,
      totalItems: null,
      processedItems: null,
      failedItems: null,
      payload: null,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
      createdBy: "user_1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.trigger(adminContext, "sess_1", {
      businessLocationId: "loc_1",
    });

    expect(result.jobId).toBe("job_1");
    expect(result.dataSourceId).toBe("ds_1");
    expect(result.idempotent).toBe(false);
    expect(mocks.createDataSource).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisSessionId: "sess_1",
        businessLocationId: "loc_1",
        businessId: "biz_1",
      }),
    );
    expect(mocks.enqueue).toHaveBeenCalledOnce();
  });

  it("trả job đang chạy với idempotent=true khi đã có job active", async () => {
    const { service, mocks } = buildService();
    mocks.findByIdInOrg.mockResolvedValue(session());
    mocks.findLocation.mockResolvedValue({
      id: "loc_1",
      name: "Cửa hàng A",
      serpapiPlaceId: "ChIJxxxx",
    });
    mocks.findActiveCrawlJob.mockResolvedValue({ id: "job_1", dataSourceId: "ds_1", status: "RUNNING" });
    mocks.findDataSourceSummary.mockResolvedValue({
      id: "ds_1",
      businessLocationId: "loc_1",
      name: "Cửa hàng A - Google Reviews",
      status: "PROCESSING",
    });

    const result = await service.trigger(adminContext, "sess_1", { businessLocationId: "loc_1" });

    expect(result.idempotent).toBe(true);
    expect(result.jobId).toBe("job_1");
    expect(result.dataSourceId).toBe("ds_1");
    expect(mocks.createDataSource).not.toHaveBeenCalled();
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("reuse reviews từ dataSource COMPLETED cùng location khi không có job active", async () => {
    const { service, mocks } = buildService();
    mocks.findByIdInOrg.mockResolvedValue(session());
    mocks.findLocation.mockResolvedValue({
      id: "loc_1",
      name: "Cửa hàng A",
      serpapiPlaceId: "ChIJxxxx",
    });
    mocks.findActiveCrawlJob.mockResolvedValue(null);
    mocks.findReusableDataSource.mockResolvedValue({
      id: "ds_old",
      name: "Cửa hàng A - Google Reviews",
      status: "COMPLETED",
      totalRecords: 78,
    });
    mocks.createDataSource.mockResolvedValue({
      id: "ds_new",
      analysisSessionId: "sess_1",
      businessId: "biz_1",
      businessLocationId: "loc_1",
      name: "Cửa hàng A - Google Reviews",
      sourceType: "SERPAPI",
      status: "PENDING",
      totalRecords: null,
      validRecords: null,
      errorRecords: null,
      createdBy: "user_1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mocks.copyFeedbacksFromDataSource.mockResolvedValue(78);
    mocks.jobCreate.mockResolvedValue({
      id: "job_1",
      analysisSessionId: "sess_1",
      dataSourceId: "ds_new",
      importBatchId: null,
      jobType: "REVIEW_CRAWLING",
      bullmqJobId: null,
      status: "PENDING",
      progress: 0,
      totalItems: null,
      processedItems: null,
      failedItems: null,
      payload: null,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
      createdBy: "user_1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mocks.jobMarkCompleted.mockResolvedValue({
      id: "job_1",
      analysisSessionId: "sess_1",
      dataSourceId: "ds_new",
      importBatchId: null,
      jobType: "REVIEW_CRAWLING",
      bullmqJobId: null,
      status: "COMPLETED",
      progress: 100,
      totalItems: null,
      processedItems: null,
      failedItems: null,
      payload: null,
      errorMessage: null,
      startedAt: null,
      completedAt: new Date(),
      createdBy: "user_1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.trigger(adminContext, "sess_1", {
      businessLocationId: "loc_1",
    });

    expect(result.jobId).toBe("job_1");
    expect(result.jobStatus).toBe("COMPLETED");
    expect(result.dataSourceId).toBe("ds_new");
    expect(mocks.copyFeedbacksFromDataSource).toHaveBeenCalledWith({
      fromDataSourceId: "ds_old",
      toDataSourceId: "ds_new",
      toSessionId: "sess_1",
    });
    expect(mocks.enqueue).not.toHaveBeenCalled();
    expect(mocks.jobMarkCompleted).toHaveBeenCalledWith("job_1");
  });

  it("throw CRAWL_LOCATION_NOT_LINKED khi location chưa có serpapiPlaceId", async () => {
    const { service, mocks } = buildService();
    mocks.findByIdInOrg.mockResolvedValue(session());
    mocks.findLocation.mockResolvedValue({
      id: "loc_1",
      name: "Cửa hàng A",
      serpapiPlaceId: null,
    });

    await expect(
      service.trigger(adminContext, "sess_1", { businessLocationId: "loc_1" }),
    ).rejects.toThrow(expect.objectContaining({ code: "CRAWL_LOCATION_NOT_LINKED" }));
  });

  it("throw SESSION_WRONG_STATE khi session không ở DATA_COLLECTION", async () => {
    const { service, mocks } = buildService();
    mocks.findByIdInOrg.mockResolvedValue(session({ status: "PROCESSING" }));

    await expect(
      service.trigger(adminContext, "sess_1", { businessLocationId: "loc_1" }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
