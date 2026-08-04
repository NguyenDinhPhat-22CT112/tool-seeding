/* eslint-disable @typescript-eslint/unbound-method */
import { RequestContext } from "../../../../shared/context/request-context";
import { AnalysisSessionRepository } from "../../../analysis-sessions/domain/analysis-session.types";
import {
  StrategyEntity,
  StrategyRepository,
  StrategyVersionDetailEntity,
  StrategyVersionEntity,
} from "../../domain/strategy.types";
import { StrategyPolicy } from "../strategy.policy";
import { StrategyService } from "../strategy.service";

const managerContext: RequestContext = {
  organizationId: "org_1",
  userId: "manager_1",
  role: "STRATEGY_MANAGER",
};

const analystContext: RequestContext = {
  organizationId: "org_1",
  userId: "analyst_1",
  role: "ANALYST",
};

const strategyRepo: StrategyRepository = {
  findBySession: vi.fn(),
  findByIdInSession: vi.fn(),
  findVersionDetailByIdInSession: vi.fn(),
  findCurrentVersionDetail: vi.fn(),
  listVersions: vi.fn(),
  updateVersionContent: vi.fn(),
  transitionVersion: vi.fn(),
  createRevision: vi.fn(),
  repointCurrentVersion: vi.fn(),
  countVersions: vi.fn(),
};

const sessionRepo: AnalysisSessionRepository = {
  findByIdInOrg: vi.fn(),
} as unknown as AnalysisSessionRepository;

function build() {
  const policy = new StrategyPolicy();
  const service = new StrategyService(strategyRepo, sessionRepo, policy);
  return { service, policy };
}

function version(overrides: Partial<StrategyVersionEntity> = {}): StrategyVersionEntity {
  return {
    id: "version_1",
    strategyId: "strategy_1",
    analysisSessionId: "session_1",
    versionNo: 1,
    status: "AI_DRAFT",
    context: null,
    objectives: [],
    targetSegments: [],
    priorityProblems: [],
    mainMessages: [],
    responsePrinciples: [],
    contentThemes: [],
    risks: [],
    kpis: [],
    additionalNotes: null,
    aiModel: "gpt-4o",
    promptVersion: "v1",
    editedBy: null,
    editReason: null,
    reviewedBy: null,
    reviewedAt: null,
    approvedBy: null,
    approvedAt: null,
    reviewComment: null,
    lockedAt: null,
    createdAt: new Date("2026-07-30T00:00:00.000Z"),
    updatedAt: new Date("2026-07-30T00:00:00.000Z"),
    ...overrides,
  };
}

function versionDetail(
  overrides: Partial<StrategyVersionDetailEntity> = {},
): StrategyVersionDetailEntity {
  return { ...version(overrides), insights: [], ...overrides };
}

function strategy(overrides: Partial<StrategyEntity> = {}): StrategyEntity {
  return {
    id: "strategy_1",
    analysisSessionId: "session_1",
    name: "Chiến lược Zen Coffee",
    currentVersionId: "version_1",
    createdBy: "SYSTEM",
    createdAt: new Date("2026-07-30T00:00:00.000Z"),
    updatedAt: new Date("2026-07-30T00:00:00.000Z"),
    archivedAt: null,
    ...overrides,
  };
}

describe("StrategyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sessionRepo.findByIdInOrg).mockResolvedValue({
      id: "session_1",
      organizationId: "org_1",
      businessId: "business_1",
      name: "Phân tích Zen Coffee",
      objective: null,
      focusProduct: null,
      dateFrom: null,
      dateTo: null,
      status: "STRATEGY_BUILDING",
      businessSnapshot: null,
      businessSnapshotAt: null,
      createdBy: "user_1",
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      archivedAt: null,
    });
  });

  it("updateVersion chỉ cho phép sửa version editable (AI_DRAFT/DRAFT/NEEDS_REVISION)", async () => {
    vi.mocked(strategyRepo.findVersionDetailByIdInSession).mockResolvedValue(
      versionDetail(),
    );
    vi.mocked(strategyRepo.updateVersionContent).mockResolvedValue(version());
    const { service } = build();

    const result = await service.updateVersion(managerContext, "session_1", "version_1", {
      objectives: ["Tăng doanh thu"],
      editReason: "Chốt mục tiêu",
    });

    expect(strategyRepo.updateVersionContent).toHaveBeenCalledWith(
      "version_1",
      "session_1",
      expect.objectContaining({ objectives: ["Tăng doanh thu"], editedBy: "manager_1" }),
    );
    expect(result.status).toBe("AI_DRAFT");
  });

  it("updateVersion từ chối sửa version đã APPROVED (immutable)", async () => {
    vi.mocked(strategyRepo.findVersionDetailByIdInSession).mockResolvedValue(
      versionDetail({ status: "APPROVED" }),
    );
    const { service } = build();
    await expect(
      service.updateVersion(managerContext, "session_1", "version_1", {
        objectives: ["X"],
      }),
    ).rejects.toMatchObject({ code: "STRATEGY_LOCKED_IMMUTABLE" });
  });

  it("updateVersion yêu cầu quyền STRATEGY_MANAGER/ORG_ADMIN", async () => {
    const { service } = build();
    await expect(
      service.updateVersion(analystContext, "session_1", "version_1", {
        objectives: ["X"],
      }),
    ).rejects.toMatchObject({ name: "ForbiddenActionError" });
  });

  it("reject bắt buộc có comment", async () => {
    vi.mocked(strategyRepo.findVersionDetailByIdInSession).mockResolvedValue(
      versionDetail({ status: "WAITING_APPROVAL" }),
    );
    const { service } = build();
    await expect(
      service.rejectVersion(managerContext, "session_1", "version_1", { comment: "  " }),
    ).rejects.toMatchObject({ code: "STRATEGY_REVISION_NEEDS_COMMENT" });
  });

  it("reject version WAITING_APPROVAL -> NEEDS_REVISION kèm comment + reviewer", async () => {
    let current = versionDetail({ status: "WAITING_APPROVAL" });
    vi.mocked(strategyRepo.findVersionDetailByIdInSession).mockImplementation(
      () => Promise.resolve(current),
    );
    vi.mocked(strategyRepo.transitionVersion).mockImplementation((id, sessionId, opts) => {
      current = { ...current, status: opts.nextStatus, ...(opts.fields ?? {}) };
      return Promise.resolve(current);
    });
    const { service } = build();

    const result = await service.rejectVersion(managerContext, "session_1", "version_1", {
      comment: "Thiếu insight về giá",
    });

    expect(strategyRepo.transitionVersion).toHaveBeenCalledWith(
      "version_1",
      "session_1",
      expect.objectContaining({
        expectedStatus: "WAITING_APPROVAL",
        nextStatus: "NEEDS_REVISION",
      }),
    );
    const opts = vi.mocked(strategyRepo.transitionVersion).mock.calls[0][2];
    expect(opts.fields?.reviewComment).toBe("Thiếu insight về giá");
    expect(opts.fields?.reviewedBy).toBe("manager_1");
    expect(result.status).toBe("NEEDS_REVISION");
  });

  it("approve version WAITING_APPROVAL -> APPROVED (chỉ STRATEGY_MANAGER/ORG_ADMIN)", async () => {
    let current = versionDetail({ status: "WAITING_APPROVAL" });
    vi.mocked(strategyRepo.findVersionDetailByIdInSession).mockImplementation(
      () => Promise.resolve(current),
    );
    vi.mocked(strategyRepo.transitionVersion).mockImplementation((id, sessionId, opts) => {
      current = { ...current, status: opts.nextStatus, ...(opts.fields ?? {}) };
      return Promise.resolve(current);
    });
    const { service } = build();

    const result = await service.approveVersion(managerContext, "session_1", "version_1");

    expect(strategyRepo.transitionVersion).toHaveBeenCalledWith(
      "version_1",
      "session_1",
      expect.objectContaining({
        expectedStatus: "WAITING_APPROVAL",
        nextStatus: "APPROVED",
      }),
    );
    const opts = vi.mocked(strategyRepo.transitionVersion).mock.calls[0][2];
    expect(opts.fields?.approvedBy).toBe("manager_1");
    expect(result.status).toBe("APPROVED");
  });

  it("lock version APPROVED -> LOCKED", async () => {
    let current = versionDetail({ status: "APPROVED" });
    vi.mocked(strategyRepo.findVersionDetailByIdInSession).mockImplementation(
      () => Promise.resolve(current),
    );
    vi.mocked(strategyRepo.transitionVersion).mockImplementation((id, sessionId, opts) => {
      current = { ...current, status: opts.nextStatus, ...(opts.fields ?? {}) };
      return Promise.resolve(current);
    });
    const { service } = build();
    const result = await service.lockVersion(managerContext, "session_1", "version_1");
    expect(strategyRepo.transitionVersion).toHaveBeenCalledWith(
      "version_1",
      "session_1",
      expect.objectContaining({ expectedStatus: "APPROVED", nextStatus: "LOCKED" }),
    );
    expect(result.status).toBe("LOCKED");
  });

  it("createRevision chỉ được tạo từ version APPROVED/LOCKED", async () => {
    vi.mocked(strategyRepo.findBySession).mockResolvedValue(strategy());
    vi.mocked(strategyRepo.findVersionDetailByIdInSession).mockResolvedValue(
      versionDetail({ status: "DRAFT" }),
    );
    const { service } = build();
    await expect(
      service.createRevision(managerContext, "session_1", { name: "Chiến lược v2" }),
    ).rejects.toMatchObject({ code: "STRATEGY_WRONG_STATE" });
  });

  it("createRevision tạo version mới từ version APPROVED và repoint current", async () => {
    vi.mocked(strategyRepo.findBySession).mockResolvedValue(strategy());
    vi.mocked(strategyRepo.findVersionDetailByIdInSession).mockResolvedValue(
      versionDetail({ status: "APPROVED" }),
    );
    vi.mocked(strategyRepo.createRevision).mockResolvedValue(
      versionDetail({ id: "version_2", versionNo: 2, status: "DRAFT" }),
    );
    const { service } = build();

    const result = await service.createRevision(managerContext, "session_1", {
      name: "Chiến lược v2",
      editReason: "Thêm kênh TikTok",
    });

    expect(strategyRepo.createRevision).toHaveBeenCalledWith(
      expect.objectContaining({
        strategyId: "strategy_1",
        currentVersionId: "version_1",
        editedBy: "manager_1",
        editReason: "Thêm kênh TikTok",
      }),
    );
    expect(result.id).toBe("version_2");
    expect(result.versionNo).toBe(2);
  });

  it("archiveVersion khi là currentVersion sẽ repoint currentVersionId về null", async () => {
    vi.mocked(strategyRepo.findVersionDetailByIdInSession).mockResolvedValue(
      versionDetail({ status: "SUPERSEDED" }),
    );
    vi.mocked(strategyRepo.transitionVersion).mockResolvedValue(
      version({ status: "ARCHIVED" }),
    );
    vi.mocked(strategyRepo.findByIdInSession).mockResolvedValue(strategy());
    const { service } = build();

    await service.archiveVersion(managerContext, "session_1", "version_1");

    expect(strategyRepo.repointCurrentVersion).toHaveBeenCalledWith(
      "strategy_1",
      "session_1",
      null,
    );
  });
});
