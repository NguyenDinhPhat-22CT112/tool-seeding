import { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { PrismaService } from "@seeding/database";
import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/configure-app";
import type {
  AnalysisSessionDetailResponse,
  ApiErrorResponse,
  BusinessDetailResponse,
  BusinessLocationResponse,
  BusinessListResponse,
  CreateBusinessFromSerpApiResponse,
  DeactivateBusinessResponse,
  SerpApiPreview,
  SerpApiAutocompleteResponse,
} from "@seeding/contracts";

type Role =
  | "ORG_ADMIN"
  | "ANALYST"
  | "INSIGHT_REVIEWER"
  | "STRATEGY_MANAGER"
  | "VIEWER";

interface HttpResult<T> {
  status: number;
  headers: Headers;
  body: T;
}

describe("Phase 1 API E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl: string;
  let organizationId: string;
  let otherOrganizationId: string;
  let businessId: string;
  let completedSessionId: string;
  let googleServer: Server;
  let googleDetailsRequests = 0;

  const adminUserId = "e2e_admin";
  const analystUserId = "e2e_analyst";

  function auth(
    role: Role,
    orgId = organizationId,
    userId = role === "ANALYST" ? analystUserId : adminUserId,
  ): Record<string, string> {
    return {
      "x-organization-id": orgId,
      "x-user-id": userId,
      "x-user-role": role,
    };
  }

  async function request<T>(
    path: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: unknown;
    } = {},
  ): Promise<HttpResult<T>> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body !== undefined
          ? { "content-type": "application/json" }
          : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    return {
      status: response.status,
      headers: response.headers,
      body: (await response.json()) as T,
    };
  }

  async function createSession(name: string): Promise<AnalysisSessionDetailResponse> {
    const result = await request<AnalysisSessionDetailResponse>(
      "/api/analysis-sessions",
      {
        method: "POST",
        headers: auth("ANALYST"),
        body: { businessId, name },
      },
    );
    expect(result.status).toBe(201);
    return result.body;
  }

  beforeAll(async () => {
    googleServer = createServer((request, response) => {
      response.setHeader("content-type", "application/json");
      if (
        request.method === "POST" &&
        request.url === "/v1/places:autocomplete"
      ) {
        response.end(
          JSON.stringify({
            suggestions: [
              {
                placePrediction: {
                  placeId: "fake_place_1",
                  text: { text: "Google Coffee, TP.HCM" },
                  structuredFormat: {
                    mainText: { text: "Google Coffee" },
                    secondaryText: { text: "1 Đồng Khởi, TP.HCM" },
                  },
                },
              },
            ],
          }),
        );
        return;
      }
      if (request.method === "GET" && request.url?.startsWith("/v1/places/")) {
        googleDetailsRequests += 1;
        const placeId = request.url.split("/").pop()?.split("?")[0] ?? "";
        const fieldMask = String(request.headers["x-goog-fieldmask"] ?? "");
        if (
          fieldMask.includes("regularOpeningHours") ||
          fieldMask.includes("reviews") ||
          fieldMask.includes("photos")
        ) {
          response.statusCode = 400;
          response.end(JSON.stringify({ error: "forbidden field mask" }));
          return;
        }
        response.end(
          JSON.stringify({
            id: placeId,
            displayName: {
              text:
                placeId === "fake_place_2"
                  ? "Google Coffee 2"
                  : "Google Coffee",
            },
            formattedAddress:
              placeId === "fake_place_2"
                ? "2 Đồng Khởi, TP.HCM"
                : "1 Đồng Khởi, TP.HCM",
            types: ["cafe"],
            primaryType: "cafe",
            businessStatus: "OPERATIONAL",
            googleMapsUri: `https://maps.google.com/${placeId}`,
            nationalPhoneNumber: "0900000000",
            websiteUri: "https://google-coffee.example",
            rating: 4.6,
            userRatingCount: 125,
          }),
        );
        return;
      }
      response.statusCode = 404;
      response.end(JSON.stringify({ error: "not found" }));
    });
    await new Promise<void>((resolve) =>
      googleServer.listen(0, "127.0.0.1", resolve),
    );
    const googleAddress = googleServer.address() as AddressInfo;
    process.env.SERPAPI_ENABLED = "true";
    process.env.SERPAPI_API_KEY = "e2e-google-key";
    process.env.SERPAPI_BASE_URL = `http://127.0.0.1:${googleAddress.port}/v1`;

    app = await NestFactory.create(AppModule, { logger: false });
    configureApp(app);
    await app.listen(0, "127.0.0.1");
    baseUrl = await app.getUrl();
    prisma = app.get(PrismaService);

    const [organization, otherOrganization] = await Promise.all([
      prisma.organization.create({
        data: { name: "E2E Organization", slug: `e2e-${Date.now()}` },
      }),
      prisma.organization.create({
        data: { name: "Other E2E Organization", slug: `e2e-other-${Date.now()}` },
      }),
    ]);
    organizationId = organization.id;
    otherOrganizationId = otherOrganization.id;
  });

  afterAll(async () => {
    await app.close();
    await new Promise<void>((resolve, reject) =>
      googleServer.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it("từ chối request thiếu hoặc sai header xác thực", async () => {
    const missing = await request<ApiErrorResponse>("/api/businesses");
    expect(missing.status).toBe(401);
    expect(missing.body.requestId).toBeTruthy();
    expect(missing.headers.get("x-request-id")).toBe(missing.body.requestId);

    const invalidRole = await request<ApiErrorResponse>("/api/businesses", {
      headers: {
        "x-organization-id": organizationId,
        "x-user-id": adminUserId,
        "x-user-role": "SUPER_ADMIN",
      },
    });
    expect(invalidRole.status).toBe(401);
  });

  it("enforce policy và tạo Business với dữ liệu đã normalize", async () => {
    const forbidden = await request<ApiErrorResponse>("/api/businesses", {
      method: "POST",
      headers: auth("VIEWER"),
      body: { name: "Không được tạo" },
    });
    expect(forbidden.status).toBe(403);

    const created = await request<BusinessDetailResponse>("/api/businesses", {
      method: "POST",
      headers: auth("ORG_ADMIN"),
      body: {
        name: "  ABC Coffee  ",
        industry: "  F&B  ",
        website: "",
        products: [{ name: "  Cà phê rang xay  " }],
        strengths: ["  Chất lượng  ", ""],
      },
    });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: "ABC Coffee",
      industry: "F&B",
      website: null,
      products: [{ name: "Cà phê rang xay" }],
      strengths: ["Chất lượng"],
      isActive: true,
    });
    businessId = created.body.id;
  });

  it("cô lập dữ liệu theo organization", async () => {
    const hidden = await request<ApiErrorResponse>(
      `/api/businesses/${businessId}`,
      { headers: auth("ORG_ADMIN", otherOrganizationId) },
    );
    expect(hidden.status).toBe(404);

    const list = await request<BusinessListResponse>("/api/businesses", {
      headers: auth("ORG_ADMIN", otherOrganizationId),
    });
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(0);
  });

  it("tìm, preview không cache và tạo Business từ Google Place", async () => {
    const autocomplete = await request<SerpApiAutocompleteResponse>(
      "/api/serpapi/autocomplete",
      {
        method: "POST",
        headers: auth("ORG_ADMIN"),
        body: {
          input: "Google Coffee",
          sessionToken: "e2e-session-1",
        },
      },
    );
    expect(autocomplete.status).toBe(200);
    expect(autocomplete.body.items[0]?.placeId).toBe("fake_place_1");

    const beforePreview = googleDetailsRequests;
    const firstPreview = await request<SerpApiPreview>(
      "/api/serpapi/preview",
      {
        method: "POST",
        headers: auth("ORG_ADMIN"),
        body: { placeId: "fake_place_1", sessionToken: "e2e-session-1" },
      },
    );
    const secondPreview = await request<SerpApiPreview>(
      "/api/serpapi/preview",
      {
        method: "POST",
        headers: auth("ORG_ADMIN"),
        body: { placeId: "fake_place_1", sessionToken: "e2e-session-1" },
      },
    );
    expect(firstPreview.status).toBe(200);
    expect(secondPreview.status).toBe(200);
    expect(firstPreview.body).not.toHaveProperty("regularOpeningHours");
    expect(googleDetailsRequests - beforePreview).toBe(2);

    const created = await request<CreateBusinessFromSerpApiResponse>(
      "/api/businesses/from-google-place",
      {
        method: "POST",
        headers: auth("ORG_ADMIN"),
        body: {
          placeId: "fake_place_1",
          overrides: {
            name: "Google Coffee do khách hàng nhập",
            industry: "F&B xác nhận",
            phone: null,
            website: "https://customer-owned.example",
            address: "Địa chỉ do khách hàng nhập",
          },
        },
      },
    );
    expect(created.status).toBe(201);
    expect(created.body.business).toMatchObject({
      name: "Google Coffee do khách hàng nhập",
      industry: "F&B xác nhận",
      phone: null,
      website: "https://customer-owned.example",
    });
    expect(created.body.location).toMatchObject({
      source: "SERPAPI",
      serpapiPlaceId: "fake_place_1",
      name: "Google Coffee do khách hàng nhập",
      address: "Địa chỉ do khách hàng nhập",
      phone: null,
      rating: null,
      userRatingCount: null,
    });

    const googleBusinessId = created.body.business.id;
    const locationId = created.body.location.id;
    const locations = await request<{ items: BusinessLocationResponse[] }>(
      `/api/businesses/${googleBusinessId}/locations`,
      { headers: auth("ORG_ADMIN") },
    );
    expect(locations.status).toBe(200);
    expect(locations.body.items).toHaveLength(1);

    const updated = await request<BusinessLocationResponse>(
      `/api/businesses/${googleBusinessId}/locations/${locationId}`,
      {
        method: "PATCH",
        headers: auth("ORG_ADMIN"),
        body: {
          name: "Chi nhánh Đồng Khởi",
          phone: "0988000000",
          website: "https://dong-khoi.example",
        },
      },
    );
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe("Chi nhánh Đồng Khởi");
    expect(updated.body.phone).toBe("0988000000");

    const manual = await request<BusinessLocationResponse>(
      `/api/businesses/${googleBusinessId}/locations`,
      {
        method: "POST",
        headers: auth("ORG_ADMIN"),
        body: {
          name: "Địa điểm thủ công",
          phone: "0909000000",
          website: "https://manual.example",
        },
      },
    );
    expect(manual.status).toBe(201);
    expect(manual.body).toMatchObject({
      source: "MANUAL",
      serpapiPlaceId: null,
      phone: "0909000000",
    });

    const added = await request<BusinessLocationResponse>(
      `/api/businesses/${googleBusinessId}/locations/from-google-place`,
      {
        method: "POST",
        headers: auth("ORG_ADMIN"),
        body: {
          placeId: "fake_place_2",
          name: "Chi nhánh do khách hàng nhập",
          phone: "0912345678",
          website: "https://branch.customer-owned.example",
        },
      },
    );
    expect(added.status).toBe(201);
    expect(added.body.serpapiPlaceId).toBe("fake_place_2");
    expect(added.body.phone).toBe("0912345678");

    const disconnected = await request<BusinessLocationResponse>(
      `/api/businesses/${googleBusinessId}/locations/${added.body.id}/disconnect-google`,
      { method: "POST", headers: auth("ORG_ADMIN") },
    );
    expect(disconnected.status).toBe(200);
    expect(disconnected.body).toMatchObject({
      source: "MANUAL",
      serpapiPlaceId: null,
      serpapiPlaceLinkStatus: "DISCONNECTED",
    });

    const beforeDuplicate = googleDetailsRequests;
    const duplicate = await request<ApiErrorResponse>(
      `/api/businesses/${googleBusinessId}/locations/from-google-place`,
      {
        method: "POST",
        headers: auth("ORG_ADMIN"),
        body: { placeId: "fake_place_1", name: "Không được tạo" },
      },
    );
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe("SERPAPI_PLACE_ALREADY_LINKED");
    expect(googleDetailsRequests).toBe(beforeDuplicate);
    expect(duplicate.body.error).toBe("Conflict");

    const hidden = await request<ApiErrorResponse>(
      `/api/businesses/${googleBusinessId}/locations`,
      { headers: auth("ORG_ADMIN", otherOrganizationId) },
    );
    expect(hidden.status).toBe(404);

    const period = new Date().toISOString().slice(0, 7);
    const detailsUsage = await prisma.externalApiUsage.findUniqueOrThrow({
      where: {
        scopeKey_provider_sku_period: {
          scopeKey: `ORG:${organizationId}`,
          provider: "SERPAPI",
          sku: "PLACE_DETAILS_ENTERPRISE",
          period,
        },
      },
    });
    expect(detailsUsage.requestCount).toBe(4);

    const status = await request<{
      configured: boolean;
      autocomplete: { used: number };
      placeDetails: { used: number };
    }>("/api/serpapi/status", { headers: auth("ORG_ADMIN") });
    expect(status.status).toBe(200);
    expect(status.body.configured).toBe(true);
    expect(status.body.autocomplete.used).toBeGreaterThanOrEqual(1);
    expect(status.body.placeDetails.used).toBe(4);

    await prisma.externalApiUsage.update({
      where: {
        scopeKey_provider_sku_period: {
          scopeKey: `ORG:${organizationId}`,
          provider: "SERPAPI",
          sku: "PLACE_DETAILS_ENTERPRISE",
          period,
        },
      },
      data: { requestCount: 20 },
    });
    const quotaBlocked = await request<ApiErrorResponse>(
      "/api/serpapi/preview",
      {
        method: "POST",
        headers: auth("ORG_ADMIN"),
        body: { placeId: "fake_place_3" },
      },
    );
    expect(quotaBlocked.status).toBe(429);
    expect(quotaBlocked.body.code).toBe("SERPAPI_QUOTA_EXCEEDED");
  });

  it("validate body và không cho client tự đặt status session", async () => {
    const invalid = await request<ApiErrorResponse>("/api/analysis-sessions", {
      method: "POST",
      headers: auth("ANALYST"),
      body: {
        businessId,
        name: "Session không hợp lệ",
        status: "COMPLETED",
      },
    });

    expect(invalid.status).toBe(400);
    expect(invalid.body.message).toContain("property status should not exist");
  });

  it("tạo, cập nhật DRAFT và bắt đầu session kèm Business snapshot", async () => {
    const created = await createSession("  Phân tích Q3  ");
    completedSessionId = created.id;
    expect(created).toMatchObject({
      name: "Phân tích Q3",
      status: "DRAFT",
      businessSnapshot: null,
      completedAt: null,
    });

    const updated = await request<AnalysisSessionDetailResponse>(
      `/api/analysis-sessions/${created.id}`,
      {
        method: "PATCH",
        headers: auth("ANALYST"),
        body: {
          objective: "  Hiểu phản hồi khách hàng  ",
          dateFrom: "2026-07-01",
          dateTo: "2026-07-31",
        },
      },
    );
    expect(updated.status).toBe(200);
    expect(updated.body.objective).toBe("Hiểu phản hồi khách hàng");

    const started = await request<AnalysisSessionDetailResponse>(
      `/api/analysis-sessions/${created.id}/start-data-collection`,
      { method: "POST", headers: auth("ANALYST") },
    );
    expect(started.status).toBe(200);
    expect(started.body.status).toBe("DATA_COLLECTION");
    expect(started.body.businessSnapshot).toMatchObject({
      id: businessId,
      name: "ABC Coffee",
      industry: "F&B",
    });
    expect(started.body.businessSnapshotAt).toBeTruthy();

    const businessUpdated = await request<BusinessDetailResponse>(
      `/api/businesses/${businessId}`,
      {
        method: "PATCH",
        headers: auth("ORG_ADMIN"),
        body: { name: "ABC Coffee New" },
      },
    );
    expect(businessUpdated.status).toBe(200);

    const detail = await request<AnalysisSessionDetailResponse>(
      `/api/analysis-sessions/${created.id}`,
      { headers: auth("ANALYST") },
    );
    expect(detail.body.businessSnapshot?.name).toBe("ABC Coffee");

    const editAfterStart = await request<ApiErrorResponse>(
      `/api/analysis-sessions/${created.id}`,
      {
        method: "PATCH",
        headers: auth("ANALYST"),
        body: { name: "Không được sửa" },
      },
    );
    expect(editAfterStart.status).toBe(400);
  });

  it("complete session và ghi completedAt", async () => {
    const completed = await request<AnalysisSessionDetailResponse>(
      `/api/analysis-sessions/${completedSessionId}/complete`,
      { method: "POST", headers: auth("ANALYST") },
    );

    expect(completed.status).toBe(200);
    expect(completed.body.status).toBe("COMPLETED");
    expect(completed.body.completedAt).toBeTruthy();
  });

  it("deactivate Business auto-archive DRAFT và chặn tạo session mới", async () => {
    const draft = await createSession("Draft sẽ archive");

    const deactivated = await request<DeactivateBusinessResponse>(
      `/api/businesses/${businessId}/deactivate`,
      { method: "POST", headers: auth("ORG_ADMIN") },
    );
    expect(deactivated.status).toBe(200);
    expect(deactivated.body.isActive).toBe(false);
    expect(deactivated.body.archivedDraftCount).toBe(1);

    const archived = await request<AnalysisSessionDetailResponse>(
      `/api/analysis-sessions/${draft.id}`,
      { headers: auth("ANALYST") },
    );
    expect(archived.body.status).toBe("ARCHIVED");
    expect(archived.body.archivedAt).toBeTruthy();

    const blockedCreate = await request<ApiErrorResponse>(
      "/api/analysis-sessions",
      {
        method: "POST",
        headers: auth("ANALYST"),
        body: { businessId, name: "Không thể tạo" },
      },
    );
    expect(blockedCreate.status).toBe(400);
  });

  it("rollback auto-archive DRAFT nếu deactivate bị session đang chạy chặn", async () => {
    const restored = await request<BusinessDetailResponse>(
      `/api/businesses/${businessId}/restore`,
      { method: "POST", headers: auth("ORG_ADMIN") },
    );
    expect(restored.status).toBe(200);

    const running = await createSession("Session đang chạy");
    const draft = await createSession("Draft phải rollback");
    const started = await request<AnalysisSessionDetailResponse>(
      `/api/analysis-sessions/${running.id}/start-data-collection`,
      { method: "POST", headers: auth("ANALYST") },
    );
    expect(started.status).toBe(200);

    const blocked = await request<ApiErrorResponse>(
      `/api/businesses/${businessId}/deactivate`,
      { method: "POST", headers: auth("ORG_ADMIN") },
    );
    expect(blocked.status).toBe(400);

    const draftAfterRollback = await request<AnalysisSessionDetailResponse>(
      `/api/analysis-sessions/${draft.id}`,
      { headers: auth("ANALYST") },
    );
    expect(draftAfterRollback.body.status).toBe("DRAFT");

    const business = await request<BusinessDetailResponse>(
      `/api/businesses/${businessId}`,
      { headers: auth("ORG_ADMIN") },
    );
    expect(business.body.isActive).toBe(true);
  });

  it("route lồng phân biệt Business không tồn tại và validate ID", async () => {
    const missing = await request<ApiErrorResponse>(
      "/api/businesses/missing_business/analysis-sessions",
      { headers: auth("ANALYST") },
    );
    expect(missing.status).toBe(404);

    const invalidId = await request<ApiErrorResponse>(
      "/api/businesses/bad%20id",
      { headers: auth("ORG_ADMIN") },
    );
    expect(invalidId.status).toBe(400);
  });
});
