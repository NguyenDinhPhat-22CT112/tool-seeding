import { Injectable } from "@nestjs/common";
import { RequestContext } from "../../../shared/context/request-context";
import { ForbiddenActionError } from "../../../shared/exceptions/domain.exceptions";

@Injectable()
export class StrategyPolicy {
  /** Ai được tạo/sửa nội dung chiến lược. */
  canWrite(ctx: RequestContext): boolean {
    return ctx.role === "ORG_ADMIN" || ctx.role === "STRATEGY_MANAGER";
  }

  /** Ai được approve/reject/trả lại chiến lược. */
  canReview(ctx: RequestContext): boolean {
    return ctx.role === "ORG_ADMIN" || ctx.role === "STRATEGY_MANAGER";
  }

  /** Ai được tạo revision / lock / archive / yêu cầu chỉnh sửa lại. */
  canManage(ctx: RequestContext): boolean {
    return ctx.role === "ORG_ADMIN" || ctx.role === "STRATEGY_MANAGER";
  }

  /** Mọi role trong org đều xem được chiến lược. */
  canView(): boolean {
    return true;
  }

  assertCanWrite(ctx: RequestContext): void {
    if (!this.canWrite(ctx)) {
      throw new ForbiddenActionError(
        "Bạn không có quyền tạo/sửa chiến lược (cần STRATEGY_MANAGER/ORG_ADMIN)",
      );
    }
  }

  assertCanReview(ctx: RequestContext): void {
    if (!this.canReview(ctx)) {
      throw new ForbiddenActionError(
        "Bạn không có quyền duyệt chiến lược (cần STRATEGY_MANAGER/ORG_ADMIN)",
      );
    }
  }

  assertCanManage(ctx: RequestContext): void {
    if (!this.canManage(ctx)) {
      throw new ForbiddenActionError(
        "Bạn không có quyền quản lý chiến lược (cần STRATEGY_MANAGER/ORG_ADMIN)",
      );
    }
  }
}
