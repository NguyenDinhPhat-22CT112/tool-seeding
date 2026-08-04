import { RequestContext } from "../../../../shared/context/request-context";
import { ForbiddenActionError } from "../../../../shared/exceptions/domain.exceptions";
import { StrategyPolicy } from "../strategy.policy";

function ctx(role: RequestContext["role"]): RequestContext {
  return { organizationId: "org_1", userId: "user_1", role };
}

describe("StrategyPolicy", () => {
  const policy = new StrategyPolicy();

  it("viết/sửa chiến lược chỉ dành cho STRATEGY_MANAGER / ORG_ADMIN", () => {
    expect(policy.canWrite(ctx("ORG_ADMIN"))).toBe(true);
    expect(policy.canWrite(ctx("STRATEGY_MANAGER"))).toBe(true);
    expect(policy.canWrite(ctx("ANALYST"))).toBe(false);
    expect(policy.canWrite(ctx("INSIGHT_REVIEWER"))).toBe(false);
    expect(policy.canWrite(ctx("VIEWER"))).toBe(false);
  });

  it("duyệt chiến lược chỉ dành cho STRATEGY_MANAGER / ORG_ADMIN", () => {
    expect(policy.canReview(ctx("ORG_ADMIN"))).toBe(true);
    expect(policy.canReview(ctx("STRATEGY_MANAGER"))).toBe(true);
    expect(policy.canReview(ctx("ANALYST"))).toBe(false);
    expect(policy.canReview(ctx("INSIGHT_REVIEWER"))).toBe(false);
  });

  it("quản lý (revision/lock/archive) theo quyền viết", () => {
    expect(policy.canManage(ctx("ORG_ADMIN"))).toBe(true);
    expect(policy.canManage(ctx("STRATEGY_MANAGER"))).toBe(true);
    expect(policy.canManage(ctx("ANALYST"))).toBe(false);
    expect(policy.canManage(ctx("VIEWER"))).toBe(false);
  });

  it("xem là mọi role", () => {
    expect(policy.canView()).toBe(true);
  });

  it("assertCanWrite / assertCanReview / assertCanManage ném ForbiddenActionError", () => {
    expect(() => policy.assertCanWrite(ctx("ANALYST"))).toThrow(ForbiddenActionError);
    expect(() => policy.assertCanReview(ctx("VIEWER"))).toThrow(ForbiddenActionError);
    expect(() => policy.assertCanManage(ctx("INSIGHT_REVIEWER"))).toThrow(ForbiddenActionError);
    expect(() => policy.assertCanWrite(ctx("STRATEGY_MANAGER"))).not.toThrow();
    expect(() => policy.assertCanReview(ctx("ORG_ADMIN"))).not.toThrow();
  });
});
