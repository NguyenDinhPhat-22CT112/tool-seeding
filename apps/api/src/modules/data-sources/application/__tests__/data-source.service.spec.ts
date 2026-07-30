import { DomainError } from "../../../../shared/exceptions/domain.exceptions";
import { RequestContext } from "../../../../shared/context/request-context";
import { AnalysisSessionEntity } from "../../../analysis-sessions/domain/analysis-session.types";
import { AnalysisSessionRepository } from "../../../analysis-sessions/domain/analysis-session.types";
import {
  DataSourceEntity,
  DataSourceRepository,
} from "../../domain/data-source.types";
import { DataSourceService } from "../data-source.service";
import { DataSourcePolicy } from "../data-source.policy";

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

function dataSourceRepo() {
  const create = vi.fn<DataSourceRepository["create"]>();
  const listBySession = vi.fn<DataSourceRepository["listBySession"]>();
  const findManualBySession = vi.fn<DataSourceRepository["findManualBySession"]>();
  const findByIdInSession = vi.fn<DataSourceRepository["findByIdInSession"]>();
  const updateStatus = vi.fn<DataSourceRepository["updateStatus"]>();

  const repo: DataSourceRepository = {
    create,
    listBySession,
    findManualBySession,
    findByIdInSession,
    updateStatus,
  };
  return { repo, mocks: { create, listBySession } };
}

function sessionRepo() {
  const findByIdInOrg = vi.fn<AnalysisSessionRepository["findByIdInOrg"]>();
  const repo = { findByIdInOrg } as unknown as AnalysisSessionRepository;
  return { repo, mocks: { findByIdInOrg } };
}

describe("DataSourceService", () => {
  it("tạo data source khi session ở DATA_COLLECTION", async () => {
    const { repo, mocks } = dataSourceRepo();
    const { repo: sRepo, mocks: sMocks } = sessionRepo();
    sMocks.findByIdInOrg.mockResolvedValue(session());

    const entity: DataSourceEntity = {
      id: "ds_1",
      analysisSessionId: "sess_1",
      businessId: "biz_1",
      businessLocationId: null,
      name: "Excel Q3",
      sourceType: "EXCEL",
      status: "PENDING",
      totalRecords: null,
      validRecords: null,
      errorRecords: null,
      createdBy: "user_1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mocks.create.mockResolvedValue(entity);

    const service = new DataSourceService(repo, sRepo, new DataSourcePolicy());
    const result = await service.create(adminContext, "sess_1", {
      name: "Excel Q3",
      sourceType: "EXCEL",
    });

    expect(result.id).toBe("ds_1");
    expect(mocks.create).toHaveBeenCalledOnce();
  });

  it("throw SESSION_WRONG_STATE khi session không ở DATA_COLLECTION", async () => {
    const { repo } = dataSourceRepo();
    const { repo: sRepo, mocks: sMocks } = sessionRepo();
    sMocks.findByIdInOrg.mockResolvedValue(session({ status: "DRAFT" }));

    const service = new DataSourceService(repo, sRepo, new DataSourcePolicy());

    await expect(
      service.create(adminContext, "sess_1", { name: "Test", sourceType: "MANUAL" }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
