import { Injectable } from "@nestjs/common";
import { RequestContext } from "../../../shared/context/request-context";
import { DomainError } from "../../../shared/exceptions/domain.exceptions";

/**
 * Phân quyền module Content — tạm thời chỉ ORG_ADMIN được write/review.
 * Phân quyền chi tiết theo role sẽ bổ sung sau (xem kế hoạch).
 */
@Injectable()
export class ContentPolicy {
  canWrite(ctx: RequestContext): boolean {
    return ctx.role === "ORG_ADMIN";
  }

  canReview(ctx: RequestContext): boolean {
    return ctx.role === "ORG_ADMIN";
  }

  canView(): boolean {
    return true;
  }

  assertCanWrite(ctx: RequestContext): void {
    if (!this.canWrite(ctx)) {
      throw new DomainError("FORBIDDEN");
    }
  }

  assertCanReview(ctx: RequestContext): void {
    if (!this.canReview(ctx)) {
      throw new DomainError("FORBIDDEN");
    }
  }
}
