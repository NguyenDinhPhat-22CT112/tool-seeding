import { PrismaService } from "@seeding/database";
import {
  BusinessRuleViolationError,
} from "../../../../shared/exceptions/domain.exceptions";
import { RequestContext } from "../../../../shared/context/request-context";
import {
  BusinessEntity,
  BusinessRepository,
} from "../../domain/business.types";
import { BusinessService } from "../business.service";
import { BusinessPolicy } from "../business.policy";

const adminContext: RequestContext = {
  organizationId: "org_1",
  userId: "user_1",
  role: "ORG_ADMIN",
};

function business(overrides: Partial<BusinessEntity> = {}): BusinessEntity {
  return {
    id: "business_1",
    organizationId: "org_1",
    name: "ABC Coffee",
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
    isActive: true,
    createdBy: "user_1",
    createdAt: new Date("2026-07-27T00:00:00.000Z"),
    updatedAt: new Date("2026-07-27T00:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  };
}

function repository() {
  const create = vi.fn<BusinessRepository["create"]>();
  const findByIdInOrg = vi.fn<BusinessRepository["findByIdInOrg"]>();
  const update = vi.fn<BusinessRepository["update"]>();
  const list = vi.fn<BusinessRepository["list"]>();
  const findByIdWithLock = vi.fn<BusinessRepository["findByIdWithLock"]>();
  const archiveDraftSessions = vi.fn<BusinessRepository["archiveDraftSessions"]>();
  const countSessionsNotInStatuses = vi.fn<BusinessRepository["countSessionsNotInStatuses"]>();
  const updateIsActive = vi.fn<BusinessRepository["updateIsActive"]>();
  const createWithLocation = vi.fn<BusinessRepository["createWithLocation"]>();
  const createLocation = vi.fn<BusinessRepository["createLocation"]>();
  const findLocationBySerpApiPlaceIdInOrg =
    vi.fn<BusinessRepository["findLocationBySerpApiPlaceIdInOrg"]>();
  const listLocations = vi.fn<BusinessRepository["listLocations"]>();
  const findLocation = vi.fn<BusinessRepository["findLocation"]>();
  const updateLocation = vi.fn<BusinessRepository["updateLocation"]>();

  const repo: BusinessRepository = {
    create,
    findByIdInOrg,
    update,
    list,
    findByIdWithLock,
    archiveDraftSessions,
    countSessionsNotInStatuses,
    updateIsActive,
    createWithLocation,
    createLocation,
    findLocationBySerpApiPlaceIdInOrg,
    listLocations,
    findLocation,
    updateLocation,
  };
  return {
    repo,
    mocks: {
      create, findByIdInOrg, update, list,
      findByIdWithLock, archiveDraftSessions, countSessionsNotInStatuses, updateIsActive,
    },
  };
}

function prismaService() {
  return { $transaction: vi.fn() } as unknown as PrismaService;
}

describe("BusinessService", () => {
  it("dùng sessionCount có sẵn từ repository, không phát sinh N+1 query", async () => {
    const { repo, mocks } = repository();
    mocks.list.mockResolvedValue({
      items: [{ business: business(), sessionCount: 3 }],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    const service = new BusinessService(repo, prismaService(), new BusinessPolicy());

    const result = await service.list(adminContext, {});

    expect(result.items[0]?.sessionCount).toBe(3);
    expect(mocks.list).toHaveBeenCalledOnce();
  });

  it("không cho cập nhật Business inactive", async () => {
    const { repo, mocks } = repository();
    mocks.findByIdInOrg.mockResolvedValue(business({ isActive: false }));
    const service = new BusinessService(repo, prismaService(), new BusinessPolicy());

    await expect(
      service.update(adminContext, "business_1", { name: "Tên mới" }),
    ).rejects.toBeInstanceOf(BusinessRuleViolationError);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
