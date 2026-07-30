/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { AllExceptionsFilter } from "../all-exceptions.filter";
import { DomainError } from "../../../shared/exceptions/domain.exceptions";

function createHost() {
  const response = {
    setHeader: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({
        url: "/api/businesses",
        headers: {},
      }),
    }),
  } as ArgumentsHost;

  return { host, response };
}

describe("AllExceptionsFilter", () => {
  it("giữ chi tiết lỗi validation và trả requestId", () => {
    const { host, response } = createHost();
    const filter = new AllExceptionsFilter();

    filter.catch(
      new BadRequestException({ message: ["name không hợp lệ"], error: "Bad Request" }),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.setHeader).toHaveBeenCalledWith(
      "x-request-id",
      expect.any(String),
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ["name không hợp lệ"],
        requestId: expect.any(String),
      }),
    );
  });

  it("không làm lộ nội dung exception chưa được xử lý", () => {
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const { host, response } = createHost();
    const filter = new AllExceptionsFilter();

    filter.catch(new Error("database password leaked"), host);

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: "Internal server error",
      }),
    );
    expect(response.json).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: "database password leaked" }),
    );
  });

  it("trả code từ DomainError", () => {
    const { host, response } = createHost();
    const filter = new AllExceptionsFilter();

    filter.catch(new DomainError("SESSION_NOT_FOUND"), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        code: "SESSION_NOT_FOUND",
        message: "Session không tồn tại",
      }),
    );
  });

  it("suy ra đúng nhãn HTTP khi custom exception không truyền error", () => {
    const { host, response } = createHost();
    const filter = new AllExceptionsFilter();

    filter.catch(
      new ConflictException({
        code: "GOOGLE_PLACE_ALREADY_LINKED",
        message: "Địa điểm đã được liên kết",
      }),
      host,
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        code: "GOOGLE_PLACE_ALREADY_LINKED",
        error: "Conflict",
      }),
    );
  });
});
