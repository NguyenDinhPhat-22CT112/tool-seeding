import { applyDecorators } from "@nestjs/common";
import { ApiHeader, ApiUnauthorizedResponse } from "@nestjs/swagger";
import type { OrgRole } from "@seeding/contracts";
import { ApiErrorResponseDto } from "../../common";

const ROLES: OrgRole[] = [
  "ORG_ADMIN",
  "ANALYST",
  "INSIGHT_REVIEWER",
  "STRATEGY_MANAGER",
  "VIEWER",
];

/** Chỉ dùng trong Giai đoạn 1, thay bằng Bearer auth khi JWT guard được triển khai. */
export function ApiTemporaryAuth() {
  return applyDecorators(
    ApiHeader({
      name: "x-organization-id",
      required: true,
      description: "Organization hiện tại",
    }),
    ApiHeader({
      name: "x-user-id",
      required: true,
      description: "Người dùng hiện tại",
    }),
    ApiHeader({
      name: "x-user-role",
      required: true,
      enum: ROLES,
      description: "Vai trò của người dùng trong organization",
    }),
    ApiUnauthorizedResponse({
      type: ApiErrorResponseDto,
      description: "Thiếu hoặc không hợp lệ một trong các header xác thực tạm thời",
    }),
  );
}
