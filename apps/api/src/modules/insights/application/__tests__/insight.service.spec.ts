/* eslint-disable @typescript-eslint/unbound-method */
import { PrismaService } from "@seeding/database";
import { RequestContext } from "../../../../shared/context/request-context";
import {
  AnalysisSessionEntity,
  AnalysisSessionRepository,
} from "../../../analysis-sessions/domain/analysis-session.types";
import { FeedbackRepository } from "../../../feedback/domain/feedback.types";
import {
  InsightDetailEntity,
  InsightEntity,
  InsightRepository,
} from "../../domain/insight.types";
import { InsightPolicy } from "../insight.policy";
import { InsightService } from "../insight.service";

const reviewerContext: RequestContext = {
  organizationId: "org_1",
  userId: "reviewer_1",
  role: "INSIGHT_REVIEWER",
};

const analystContext: RequestContext = {
  organizationId: "org_1",
  userId: "analyst_1",
  role: "ANALYST",
};

const prisma = {
  $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({}),
} as unknown as PrismaService;

function session(overrides: Partial<AnalysisSessionEntity> = {}): AnalysisSessionEntity {
  return {
    id: "session_1",
    organizationId: "org_1",
    businessId: "business_1",
    name: "Phân tích Q3",
    objective: null,
    focusProduct: null,
    dateFrom: null,
    dateTo: null,
    status: "INSIGHT_REVIEW",
    businessSnapshot: null,
    businessSnapshotAt: null,
    createdBy: "user_1",
    createdAt: new Date("2026-07-28T00:00:00.000Z"),
    updatedAt: new Date("2026-07-28T00:00:00.000Z"),
    completedAt: null,
    archivedAt: null,
    ...overrides,
  };
}

function insight(overrides: Partial<InsightEntity> = {}): InsightEntity {
  return {
    id: "insight_1",
    analysisSessionId: "session_1",
    title: "Khách thích không gian yên tĩnh",
    description: "Nhiều khách nhắc đến quán ít ồn.",
    origin: "INFERRED",
    priority: 4,
    confidence: 0.8,
    frequencyCount: 10,
    frequencyPct: 25,
    status: "DRAFT",
    isFlagged: false,
    parentInsightId: null,
    reviewedBy: null,
    reviewedAt: null,
    reviewComment: null,
    createdBy: "SYSTEM",
    createdAt: new Date("2026-07-28T00:00:00.000Z"),
    updatedAt: new Date("2026-07-28T00:00:00.000Z"),
    archivedAt: null,
    ...overrides,
  };
}

function detail(overrides: Partial<InsightDetailEntity> = {}): InsightDetailEntity {
  const base = insight(overrides);
  return { ...base, evidences: [], reviewLogs: [], ...overrides };
}

function repository() {
  const repo: InsightRepository = {
    create: vi.fn(),
    findByIdInSession: vi.fn(),
    findDetailByIdInSession: vi.fn(),
    findManyByIdsInSession: vi.fn(),
    listEvidencesForInsights: vi.fn(),
    list: vi.fn(),
    updateFields: vi.fn(),
    transition: vi.fn(),
    archiveByIds: vi.fn(),
    createEvidences: vi.fn(),
    appendReviewLog: vi.fn(),
  };
  return repo;
}

function build(
  repo: InsightRepository,
  sessionRepo: Partial<AnalysisSessionRepository> = {},
  feedbackRepo: Partial<FeedbackRepository> = {},
) {
  const policy = new InsightPolicy();
  const sessionRepository = {
    findByIdInOrg: vi.fn().mockResolvedValue(session()),
    ...sessionRepo,
  } as unknown as AnalysisSessionRepository;
  const feedbackRepository = {
    findByIdInSession: vi.fn(),
    ...feedbackRepo,
  } as unknown as FeedbackRepository;
  const service = new InsightService(
    repo,
    sessionRepository,
    feedbackRepository,
    prisma,
    policy,
  );
  return { service, sessionRepository, feedbackRepository };
}

describe("InsightService", () => {
  it("tạo insight DRAFT thủ công và liên kết evidence hợp lệ", async () => {
    const repo = repository();
    const created = insight({ id: "insight_new", status: "DRAFT" });
    vi.mocked(repo.create).mockResolvedValue(created);
    vi.mocked(repo.findDetailByIdInSession).mockResolvedValue(detail({ id: "insight_new" }));
    const { service, feedbackRepository } = build(repo);
    vi.mocked(feedbackRepository.findByIdInSession).mockResolvedValue({
      id: "fb_1",
      analysisSessionId: "session_1",
      dataSourceId: "ds_1",
      externalId: null,
      contentHash: "hash",
      rawContent: "text",
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
    });

    const result = await service.create(analystContext, "session_1", {
      title: "  Khách thích yên tĩnh  ",
      description: "  Nhiều khách nhắc đến  ",
      evidenceFeedbackIds: ["fb_1", "fb_ghost"],
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: "DRAFT", title: "Khách thích yên tĩnh" }),
      expect.anything(),
    );
    expect(repo.createEvidences).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ insightId: "insight_new", feedbackId: "fb_1" }),
      ]),
      expect.anything(),
    );
    expect(result.status).toBe("DRAFT");
  });

  it("chặn tạo insight khi nội dung trống", async () => {
    const repo = repository();
    const { service } = build(repo);
    await expect(
      service.create(analystContext, "session_1", { title: "  ", description: "abc" }),
    ).rejects.toMatchObject({ code: "INSIGHT_CONTENT_EMPTY" });
  });

  it("chặn mọi thao tác khi session không còn ở giai đoạn review/strategy", async () => {
    const repo = repository();
    const { service } = build(repo, { findByIdInOrg: vi.fn().mockResolvedValue(session({ status: "DATA_COLLECTION" })) });
    await expect(
      service.approve(reviewerContext, "session_1", "insight_1", {}),
    ).rejects.toMatchObject({ code: "SESSION_WRONG_STATE" });
    expect(repo.transition).not.toHaveBeenCalled();
  });

  it("từ chối insight bắt buộc có lý do", async () => {
    const repo = repository();
    vi.mocked(repo.findByIdInSession).mockResolvedValue(insight({ status: "WAITING_REVIEW" }));
    const { service } = build(repo);
    await expect(
      service.reject(reviewerContext, "session_1", "insight_1", {}),
    ).rejects.toMatchObject({ code: "INSIGHT_REJECT_NEEDS_COMMENT" });
  });

  it("duyệt insight chuyển WAITING_REVIEW -> APPROVED", async () => {
    const repo = repository();
    vi.mocked(repo.findByIdInSession).mockResolvedValue(insight({ status: "WAITING_REVIEW" }));
    vi.mocked(repo.transition).mockResolvedValue(insight({ status: "APPROVED", reviewedBy: "reviewer_1" }));
    vi.mocked(repo.findDetailByIdInSession).mockResolvedValue(detail({ status: "APPROVED", reviewedBy: "reviewer_1" }));
    const { service } = build(repo);

    const result = await service.approve(reviewerContext, "session_1", "insight_1", { comment: "OK" });

    expect(repo.transition).toHaveBeenCalledWith(
      "insight_1",
      "session_1",
      expect.objectContaining({ action: "APPROVED", nextStatus: "APPROVED" }),
    );
    expect(result.status).toBe("APPROVED");
  });

  it("trả lỗi INSIGHT_WRONG_STATE khi duyệt insight đã duyệt", async () => {
    const repo = repository();
    vi.mocked(repo.findByIdInSession).mockResolvedValue(insight({ status: "APPROVED" }));
    const { service } = build(repo);
    await expect(
      service.approve(reviewerContext, "session_1", "insight_1", {}),
    ).rejects.toMatchObject({ code: "INSIGHT_WRONG_STATE" });
  });

  it("trả lỗi INSIGHT_WRONG_STATE khi sửa insight đang chờ duyệt", async () => {
    const repo = repository();
    vi.mocked(repo.findByIdInSession).mockResolvedValue(insight({ status: "WAITING_REVIEW" }));
    const { service } = build(repo);
    await expect(
      service.update(analystContext, "session_1", "insight_1", { title: "Mới" }),
    ).rejects.toMatchObject({ code: "INSIGHT_WRONG_STATE" });
  });

  it("gộp cần ít nhất 2 insight", async () => {
    const repo = repository();
    const { service } = build(repo);
    await expect(
      service.merge(analystContext, "session_1", {
        insightIds: ["insight_1"],
        title: "Tổng hợp",
        description: "Mô tả",
      }),
    ).rejects.toMatchObject({ code: "INSIGHT_MERGE_MIN_TWO" });
  });

  it("gộp trả INSIGHT_NOT_FOUND nếu một nguồn không thuộc session", async () => {
    const repo = repository();
    vi.mocked(repo.findManyByIdsInSession).mockResolvedValue([insight({ id: "i1" })]);
    const { service } = build(repo);
    await expect(
      service.merge(analystContext, "session_1", {
        insightIds: ["i1", "i_other"],
        title: "Tổng hợp",
        description: "Mô tả",
      }),
    ).rejects.toMatchObject({ code: "INSIGHT_NOT_FOUND" });
  });

  it("gộp tạo insight WAITING_REVIEW, gom evidence và archive nguồn", async () => {
    const repo = repository();
    vi.mocked(repo.findManyByIdsInSession).mockResolvedValue([
      insight({ id: "i1", priority: 5, confidence: 0.9 }),
      insight({ id: "i2", priority: 3, confidence: 0.5 }),
    ]);
    vi.mocked(repo.listEvidencesForInsights).mockResolvedValue([
      {
        id: "ev_1",
        analysisSessionId: "session_1",
        insightId: "i1",
        feedbackId: "fb_1",
        excerpt: "yên tĩnh",
        relevance: 0.9,
        createdAt: new Date(),
      },
      {
        id: "ev_2",
        analysisSessionId: "session_1",
        insightId: "i1",
        feedbackId: "fb_1",
        excerpt: "trùng",
        relevance: 0.8,
        createdAt: new Date(),
      },
    ]);
    const merged = insight({ id: "merged_1", status: "WAITING_REVIEW", priority: 5 });
    vi.mocked(repo.create).mockResolvedValue(merged);
    vi.mocked(repo.findDetailByIdInSession).mockResolvedValue(detail({ id: "merged_1", status: "WAITING_REVIEW", priority: 5 }));
    const { service } = build(repo);

    const result = await service.merge(analystContext, "session_1", {
      insightIds: ["i1", "i2"],
      title: "Tổng hợp",
      description: "Mô tả",
    });

    expect(result.status).toBe("WAITING_REVIEW");
    expect(result.priority).toBe(5);
    expect(repo.createEvidences).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ insightId: "merged_1", feedbackId: "fb_1" }),
      ]),
      expect.anything(),
    );
    expect(repo.archiveByIds).toHaveBeenCalledWith(
      ["i1", "i2"],
      "session_1",
      "merged_1",
      "MERGED",
      "analyst_1",
      expect.anything(),
    );
  });

  it("tách phần không có evidence bị chặn", async () => {
    const repo = repository();
    vi.mocked(repo.findByIdInSession).mockResolvedValue(insight({ id: "src", status: "DRAFT" }));
    vi.mocked(repo.listEvidencesForInsights).mockResolvedValue([]);
    const { service } = build(repo);
    await expect(
      service.split(analystContext, "session_1", "src", {
        parts: [
          { title: "P1", description: "D1", evidenceFeedbackIds: ["fb_1"] },
          { title: "P2", description: "D2", evidenceFeedbackIds: [] },
        ],
      }),
    ).rejects.toMatchObject({ code: "INSIGHT_SPLIT_NEEDS_EVIDENCE" });
  });

  it("tách tạo các insight con và archive nguồn", async () => {
    const repo = repository();
    vi.mocked(repo.findByIdInSession).mockResolvedValue(insight({ id: "src", status: "APPROVED" }));
    vi.mocked(repo.listEvidencesForInsights).mockResolvedValue([
      {
        id: "ev_1",
        analysisSessionId: "session_1",
        insightId: "src",
        feedbackId: "fb_1",
        excerpt: "a",
        relevance: 0.9,
        createdAt: new Date(),
      },
      {
        id: "ev_2",
        analysisSessionId: "session_1",
        insightId: "src",
        feedbackId: "fb_2",
        excerpt: "b",
        relevance: 0.7,
        createdAt: new Date(),
      },
    ]);
    vi.mocked(repo.create).mockResolvedValue(insight({ id: "child_1", status: "WAITING_REVIEW" }));
    vi.mocked(repo.findDetailByIdInSession).mockResolvedValue(detail({ id: "src", status: "ARCHIVED" }));
    const { service } = build(repo);

    await service.split(analystContext, "session_1", "src", {
      parts: [
        { title: "P1", description: "D1", evidenceFeedbackIds: ["fb_1"] },
        { title: "P2", description: "D2", evidenceFeedbackIds: ["fb_2"] },
      ],
    });

    expect(repo.create).toHaveBeenCalledTimes(2);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ parentInsightId: "src", status: "WAITING_REVIEW" }),
      expect.anything(),
    );
    expect(repo.archiveByIds).toHaveBeenCalledWith(
      ["src"],
      "session_1",
      null,
      "SPLIT",
      "analyst_1",
      expect.anything(),
    );
  });
});
