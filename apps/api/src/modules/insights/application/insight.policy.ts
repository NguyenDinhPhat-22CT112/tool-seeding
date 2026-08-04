import { Injectable } from "@nestjs/common";
import { RequestContext } from "../../../shared/context/request-context";
import { ForbiddenActionError } from "../../../shared/exceptions/domain.exceptions";

@Injectable()
export class InsightPolicy {
  /** Ai được tạo/ghi insight (thủ công hoặc chỉnh sửa). */
  canWrite(ctx: RequestContext): boolean {
    return (
      ctx.role === "ORG_ADMIN" || ctx.role === "ANALYST" || ctx.role === "INSIGHT_REVIEWER"
    );
  }

  /** Ai được approve/reject/trả lại insight. */
  canReview(ctx: RequestContext): boolean {
    return (
      ctx.role === "ORG_ADMIN" ||
      ctx.role === "INSIGHT_REVIEWER" ||
      ctx.role === "STRATEGY_MANAGER"
    );
  }

  /** Ai được merge/split/archive. */
  canManage(ctx: RequestContext): boolean {
    return this.canWrite(ctx);
  }

  canView(): boolean {
    return true; // mọi role trong org đều xem được
  }

  assertCanWrite(ctx: RequestContext): void {
    if (!this.canWrite(ctx)) {
      throw new ForbiddenActionError("Bạn không có quyền tạo/sửa insight");
    }
  }

  assertCanReview(ctx: RequestContext): void {
    if (!this.canReview(ctx)) {
      throw new ForbiddenActionError(
        "Bạn không có quyền duyệt insight (cần INSIGHT_REVIEWER/STRATEGY_MANAGER/ORG_ADMIN)",
      );
    }
  }

  assertCanManage(ctx: RequestContext): void {
    if (!this.canManage(ctx)) {
      throw new ForbiddenActionError(
        "Bạn không có quyền gộp/tách/lưu trữ insight",
      );
    }
  }
}
