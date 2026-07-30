import {
  createParamDecorator,
  ExecutionContext,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import type { OrgRole } from "@seeding/contracts";

/**
 * Vai trò trong tổ chức — khớp enum OrgRole trong Prisma schema.
 * Đặt lại ở đây để tầng application không phải import trực tiếp Prisma types.
 */
const ORG_ROLES: OrgRole[] = [
  "ORG_ADMIN",
  "ANALYST",
  "INSIGHT_REVIEWER",
  "STRATEGY_MANAGER",
  "VIEWER",
];

/**
 * Ngữ cảnh request — mọi use case đều nhận vào đây thay vì tự đọc header/token.
 * Khi Auth thật (Giai đoạn sau) hoàn thành, chỉ cần thay middleware bên dưới
 * bằng một JWT guard thật sự tạo ra object này — không cần sửa domain/application layer.
 */
export interface RequestContext {
  organizationId: string;
  userId: string;
  role: OrgRole;
}

const REQUEST_CONTEXT_KEY = "requestContext";

/**
 * TODO(Auth): Đây là middleware TẠM THỜI.
 * Hiện đọc 3 header: x-organization-id, x-user-id, x-user-role.
 * Khi có JWT thật, thay bằng AuthGuard giải mã token và set req[REQUEST_CONTEXT_KEY].
 * Không có middleware/guard nào khác trong hệ thống được phép tự suy ra organizationId
 * từ nơi khác (query, body...) — luôn phải đi qua context này để tránh lộ dữ liệu
 * giữa các organization.
 */
@Injectable()
export class TemporaryRequestContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const organizationId = req.header("x-organization-id");
    const userId = req.header("x-user-id");
    const roleHeader = req.header("x-user-role");

    if (
      !organizationId ||
      !userId ||
      !roleHeader ||
      !ORG_ROLES.includes(roleHeader as OrgRole)
    ) {
      throw new UnauthorizedException(
        "Thiếu hoặc không hợp lệ x-organization-id / x-user-id / x-user-role",
      );
    }

    const ctx: RequestContext = {
      organizationId,
      userId,
      role: roleHeader as OrgRole,
    };
    (req as Request & Record<string, unknown>)[REQUEST_CONTEXT_KEY] = ctx;
    next();
  }
}

/**
 * Decorator để inject RequestContext vào controller:
 *   create(@Ctx() ctx: RequestContext, @Body() dto: CreateBusinessDto)
 */
export const Ctx = createParamDecorator(
  (_data: unknown, executionContext: ExecutionContext): RequestContext => {
    const req = executionContext
      .switchToHttp()
      .getRequest<Request & Record<string, unknown>>();
    const ctx = req[REQUEST_CONTEXT_KEY] as RequestContext | undefined;
    if (!ctx) {
      throw new UnauthorizedException("RequestContext chưa được thiết lập");
    }
    return ctx;
  },
);
