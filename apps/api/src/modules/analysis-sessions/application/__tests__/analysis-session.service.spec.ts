/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await, @typescript-eslint/unbound-method */
import {
  BusinessRuleViolationError,
  InvalidStateTransitionError,
} from "../../../../shared/exceptions/domain.exceptions";
import { RequestContext } from "../../../../shared/context/request-context";
import {
  AnalysisSessionEntity,
  AnalysisSessionRepository,
} from "../../domain/analysis-session.types";
import { AnalysisSessionPolicy } from "../analysis-session.policy";
import { AnalysisSessionService } from "../analysis-session.service";

const context: RequestContext = {
  organizationId: "org_1",
  userId: "user_1",
  role: "ANALYST",
};

function session(
  overrides: Partial<AnalysisSessionEntity> = {},
): AnalysisSessionEntity {
  return {
    id: "session_1",
    organizationId: "org_1",
    businessId: "business_1",
    name: "Phân tích Q3",
    objective: null,
    focusProduct: null,
    dateFrom: null,
    dateTo: null,
    status: "DRAFT",
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

function repository() {
  const repo: AnalysisSessionRepository = {
    create: vi.fn(),
    findByIdInOrg: vi.fn(),
    updateFields: vi.fn(),
    startDataCollection: vi.fn(),
    transitionStatus: vi.fn(),
    list: vi.fn(),
    countFeedbacks: vi.fn(),
    businessExistsInOrg: vi.fn(),
  };
  return repo;
}

describe("AnalysisSessionService", () => {
  it("chặn tạo session nếu Business inactive tại thời điểm transaction chạy", async () => {
    const repo = repository();
    vi.mocked(repo.create).mockResolvedValue({ outcome: "BUSINESS_INACTIVE" });
    const service = new AnalysisSessionService(repo, new AnalysisSessionPolicy());

    await expect(
      service.create(context, { businessId: "business_1", name: "Q3" }),
    ).rejects.toBeInstanceOf(BusinessRuleViolationError);
  });

  it("bắt đầu thu thập dữ liệu bằng operation nguyên tử và trả snapshot", async () => {
    const repo = repository();
    const snapshot = {
      id: "business_1",
      name: "ABC",
      industry: null,
      description: null,
      website: null,
      address: null,
      phone: null,
      email: null,
      products: [],
      services: [],
      targetAudience: [],
      competitors: [],
      strengths: [],
      brandVoice: null,
      allowedTopics: [],
      bannedTopics: [],
      extraNotes: null,
      sourceUpdatedAt: "2026-07-28T00:00:00.000Z",
    };
    vi.mocked(repo.startDataCollection).mockResolvedValue({
      outcome: "UPDATED",
      session: session({
        status: "DATA_COLLECTION",
        businessSnapshot: snapshot,
        businessSnapshotAt: new Date("2026-07-28T01:00:00.000Z"),
      }),
    });
    vi.mocked(repo.countFeedbacks).mockResolvedValue(0);
    const service = new AnalysisSessionService(repo, new AnalysisSessionPolicy());

    const result = await service.startDataCollection(context, "session_1");

    expect(result.businessSnapshot).toEqual(snapshot);
    expect(repo.startDataCollection).toHaveBeenCalledWith("session_1", "org_1");
  });

  it("ghi completedAt khi complete session", async () => {
    const repo = repository();
    vi.mocked(repo.findByIdInOrg).mockResolvedValue(
      session({ status: "DATA_COLLECTION" }),
    );
    vi.mocked(repo.transitionStatus).mockImplementation(
      async (_id, _org, _current, _next, extra) =>
        session({
          status: "COMPLETED",
          completedAt: extra?.completedAt ?? null,
        }),
    );
    vi.mocked(repo.countFeedbacks).mockResolvedValue(2);
    const service = new AnalysisSessionService(repo, new AnalysisSessionPolicy());

    const result = await service.complete(context, "session_1");

    expect(result.completedAt).not.toBeNull();
    expect(repo.transitionStatus).toHaveBeenCalledWith(
      "session_1",
      "org_1",
      "DATA_COLLECTION",
      "COMPLETED",
      expect.objectContaining({ completedAt: expect.any(Date) }),
    );
  });

  it("cho phép xóa dateFrom bằng null khi session còn DRAFT", async () => {
    const repo = repository();
    vi.mocked(repo.findByIdInOrg).mockResolvedValue(
      session({ dateFrom: new Date("2026-07-01T00:00:00.000Z") }),
    );
    vi.mocked(repo.updateFields).mockImplementation(async (_id, _org, data) =>
      session({ dateFrom: data.dateFrom ?? null }),
    );
    vi.mocked(repo.countFeedbacks).mockResolvedValue(0);
    const service = new AnalysisSessionService(repo, new AnalysisSessionPolicy());

    const result = await service.update(context, "session_1", { dateFrom: null });

    expect(result.dateFrom).toBeNull();
    expect(repo.updateFields).toHaveBeenCalledWith(
      "session_1",
      "org_1",
      expect.objectContaining({ dateFrom: null }),
    );
  });

  it("trả conflict nếu session đổi trạng thái trong lúc cập nhật", async () => {
    const repo = repository();
    vi.mocked(repo.findByIdInOrg).mockResolvedValue(session());
    vi.mocked(repo.updateFields).mockResolvedValue(null);
    const service = new AnalysisSessionService(repo, new AnalysisSessionPolicy());

    await expect(
      service.update(context, "session_1", { name: "Tên mới" }),
    ).rejects.toBeInstanceOf(InvalidStateTransitionError);
  });

  it("route lồng trả not found thay vì danh sách rỗng khi Business không tồn tại", async () => {
    const repo = repository();
    vi.mocked(repo.businessExistsInOrg).mockResolvedValue(false);
    const service = new AnalysisSessionService(repo, new AnalysisSessionPolicy());

    await expect(
      service.listByBusiness(context, "business_other", {}),
    ).rejects.toMatchObject({ status: 404 });
    expect(repo.list).not.toHaveBeenCalled();
  });
});
