import { Injectable } from "@nestjs/common";
import { RequestContext } from "../../../shared/context/request-context";
import { DomainError } from "../../../shared/exceptions/domain.exceptions";

@Injectable()
export class ReviewCrawlPolicy {
  canTrigger(ctx: RequestContext): boolean {
    return ctx.role === "ORG_ADMIN" || ctx.role === "ANALYST";
  }

  assertCanTrigger(ctx: RequestContext): void {
    if (!this.canTrigger(ctx)) {
      throw new DomainError("FORBIDDEN");
    }
  }
}
