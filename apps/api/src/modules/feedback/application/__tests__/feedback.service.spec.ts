import { DomainError } from "../../../../shared/exceptions/domain.exceptions";
import { RequestContext } from "../../../../shared/context/request-context";
import {
  AnalysisSessionEntity,
  AnalysisSessionRepository,
} from "../../../analysis-sessions/domain/analysis-session.types";
import {
  DataSourceEntity,
  DataSourceRepository,
} from "../../../data-sources/domain/data-source.types";
import {
  computeContentHash,
  FeedbackEntity,
  FeedbackRepository,
} from "../../domain/feedback.types";
import { FeedbackService } from "../feedback.service";
import { FeedbackPolicy } from "../feedback.policy";

const adminContext: RequestContext = {
  organizationId: "org_1",
  userId: "user_1",
  role: "ORG_ADMIN",
};

function session(): AnalysisSessionEntity {
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
  };
}

function feedback(overrides: Partial<FeedbackEntity> = {}): FeedbackEntity {
  return {
    id: "fb_1",
    analysisSessionId: "sess_1",
    dataSourceId: "ds_1",
    externalId: null,
    contentHash: computeContentHash("Great coffee"),
    rawContent: "Great coffee",
    normalizedContent: null,
    reviewerName: null,
    rating: 5,
    language: null,
    sourceUrl: null,
    publishedAt: null,
    notes: null,
    processingStatus: "RAW",
    duplicateOfId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("FeedbackService", () => {
  it("POST manual tự tạo DataSource MANUAL nếu chưa có", async () => {
    const createFeedback = vi.fn<FeedbackRepository["create"]>();
    const findByIdInSession = vi.fn<FeedbackRepository["findByIdInSession"]>();
    const list = vi.fn<FeedbackRepository["list"]>();
    const update = vi.fn<FeedbackRepository["update"]>();
    const exclude = vi.fn<FeedbackRepository["exclude"]>();

    const feedbackRepo: FeedbackRepository = {
      create: createFeedback,
      findByIdInSession,
      list,
      update,
      exclude,
    };

    const findByIdInOrg = vi.fn<AnalysisSessionRepository["findByIdInOrg"]>();
    findByIdInOrg.mockResolvedValue(session());
    const sessionRepo = { findByIdInOrg } as unknown as AnalysisSessionRepository;

    const findManualBySession = vi.fn<DataSourceRepository["findManualBySession"]>();
    findManualBySession.mockResolvedValue(null);
    const createDataSource = vi.fn<DataSourceRepository["create"]>();
    const manualDs: DataSourceEntity = {
      id: "ds_manual",
      analysisSessionId: "sess_1",
      businessId: "biz_1",
      businessLocationId: null,
      name: "Nhập tay",
      sourceType: "MANUAL",
      status: "PENDING",
      totalRecords: null,
      validRecords: null,
      errorRecords: null,
      createdBy: "user_1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    createDataSource.mockResolvedValue(manualDs);

    const dataSourceRepo: DataSourceRepository = {
      create: createDataSource,
      findManualBySession,
      findByIdInSession: vi.fn(),
      listBySession: vi.fn(),
      updateStatus: vi.fn(),
    };

    createFeedback.mockResolvedValue(feedback({ dataSourceId: "ds_manual" }));

    const service = new FeedbackService(
      feedbackRepo,
      sessionRepo,
      dataSourceRepo,
      new FeedbackPolicy(),
    );

    await service.create(adminContext, "sess_1", { rawContent: "Great coffee", rating: 5 });

    expect(findManualBySession).toHaveBeenCalledOnce();
    expect(createDataSource).toHaveBeenCalledOnce();
    expect(createFeedback).toHaveBeenCalledOnce();
  });

  it("tính contentHash tự động", () => {
    const hash = computeContentHash("  Great coffee  ");
    expect(hash).toBe(computeContentHash("Great coffee"));
    expect(hash).toHaveLength(64);
  });

  it("throw FEEDBACK_INVALID_RATING khi rating ngoài 1-5", async () => {
    const feedbackRepo = {
      create: vi.fn(),
      findByIdInSession: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      exclude: vi.fn(),
    } as unknown as FeedbackRepository;

    const findByIdInOrg = vi.fn<AnalysisSessionRepository["findByIdInOrg"]>();
    findByIdInOrg.mockResolvedValue(session());
    const sessionRepo = { findByIdInOrg } as unknown as AnalysisSessionRepository;

    const dataSourceRepo = {
      findManualBySession: vi.fn(),
      create: vi.fn(),
    } as unknown as DataSourceRepository;

    const service = new FeedbackService(
      feedbackRepo,
      sessionRepo,
      dataSourceRepo,
      new FeedbackPolicy(),
    );

    await expect(
      service.create(adminContext, "sess_1", { rawContent: "Test", rating: 6 }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
