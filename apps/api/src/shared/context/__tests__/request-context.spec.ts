import { UnauthorizedException } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { TemporaryRequestContextMiddleware } from "../request-context";

function request(headers: Record<string, string | undefined>): Request {
  return {
    header: (name: string) => headers[name],
  } as Request;
}

describe("TemporaryRequestContextMiddleware", () => {
  const middleware = new TemporaryRequestContextMiddleware();
  const response = {} as Response;

  it("từ chối role không thuộc contract", () => {
    expect(() =>
      middleware.use(
        request({
          "x-organization-id": "org_1",
          "x-user-id": "user_1",
          "x-user-role": "SUPER_ADMIN",
        }),
        response,
        vi.fn() as NextFunction,
      ),
    ).toThrow(UnauthorizedException);
  });

  it("chấp nhận đầy đủ header hợp lệ", () => {
    const next = vi.fn();

    middleware.use(
      request({
        "x-organization-id": "org_1",
        "x-user-id": "user_1",
        "x-user-role": "ANALYST",
      }),
      response,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
  });
});
