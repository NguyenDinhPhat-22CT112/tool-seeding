import { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  DocumentBuilder,
  OpenAPIObject,
  SwaggerModule,
} from "@nestjs/swagger";
import { AppModule } from "../app.module";
import { configureApp } from "../configure-app";

describe("OpenAPI contract", () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    configureApp(app);
    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle("Contract test").setVersion("1").build(),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it("mô tả đúng các header xác thực tạm thời", () => {
    const operation = document.paths["/api/businesses"]?.get;
    const headerNames = operation?.parameters
      ?.filter((parameter) => "in" in parameter && parameter.in === "header")
      .map((parameter) => ("name" in parameter ? parameter.name : undefined));

    expect(headerNames).toEqual(
      expect.arrayContaining([
        "x-organization-id",
        "x-user-id",
        "x-user-role",
      ]),
    );
  });

  it("khai báo snapshot bằng schema chi tiết", () => {
    const detailSchema =
      document.components?.schemas?.AnalysisSessionDetailResponse;
    const snapshotProperty =
      detailSchema && "properties" in detailSchema
        ? detailSchema.properties?.businessSnapshot
        : undefined;

    expect(snapshotProperty).toEqual(
      expect.objectContaining({
        nullable: true,
        allOf: [
          {
            $ref: "#/components/schemas/BusinessProfileSnapshotResponse",
          },
        ],
      }),
    );
  });

  it("route lồng theo Business không nhận businessId trùng ở query", () => {
    const operation =
      document.paths["/api/businesses/{businessId}/analysis-sessions"]?.get;
    const duplicatedQuery = operation?.parameters?.find(
      (parameter) =>
        "in" in parameter &&
        parameter.in === "query" &&
        "name" in parameter &&
        parameter.name === "businessId",
    );

    expect(duplicatedQuery).toBeUndefined();
  });

  it("mô tả response conflict bằng error schema chuẩn", () => {
    const response =
      document.paths["/api/analysis-sessions/{id}"]?.patch?.responses?.["409"];

    expect(response).toBeDefined();
    expect(JSON.stringify(response)).toContain("ApiErrorResponseDto");
  });

  it("công bố đủ API SerpAPI và BusinessLocation", () => {
    expect(document.paths["/api/serpapi/autocomplete"]?.post).toBeDefined();
    expect(document.paths["/api/serpapi/preview"]?.post).toBeDefined();
    expect(document.paths["/api/businesses/from-serpapi"]?.post).toBeDefined();
    expect(
      document.paths["/api/businesses/{businessId}/locations"]?.get,
    ).toBeDefined();
    expect(
      document.paths[
        "/api/businesses/{businessId}/locations/from-serpapi"
      ]?.post,
    ).toBeDefined();

    const previewSchema = document.components?.schemas?.SerpApiPreviewResponse;
    const properties =
      previewSchema && "properties" in previewSchema
        ? previewSchema.properties
        : {};
    expect(properties).not.toHaveProperty("regularOpeningHours");
    expect(properties).not.toHaveProperty("reviews");
    expect(properties).not.toHaveProperty("photos");
  });
});
