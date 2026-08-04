import { RequestContext } from "../../../../shared/context/request-context";
import { ForbiddenActionError } from "../../../../shared/exceptions/domain.exceptions";
import { InsightPolicy } from "../insight.policy";

function ctx(role: RequestContext["role"]): RequestContext {
  return { organizationId: "org_1", userId: "user_1", role };
}

describe("InsightPolicy", () => {
  const policy = new InsightPolicy();

  it("ORG_ADMIN / ANALYST / INSIGHT_REVIEWER được viết insight", () => {
    expect(policy.canWrite(ctx("ORG_ADMIN"))).toBe(true);
    expect(policy.canWrite(ctx("ANALYST"))).toBe(true);
    expect(policy.canWrite(ctx("INSIGHT_REVIEWER"))).toBe(true);
    expect(policy.canWrite(ctx("VIEWER"))).toBe(false);
    expect(policy.canWrite(ctx("STRATEGY_MANAGER"))).toBe(false);
  });

  it("duyệt insight chỉ dành cho INSIGHT_REVIEWER / STRATEGY_MANAGER / ORG_ADMIN", () => {
    expect(policy.canReview(ctx("ORG_ADMIN"))).toBe(true);
    expect(policy.canReview(ctx("INSIGHT_REVIEWER"))).toBe(true);
    expect(policy.canReview(ctx("STRATEGY_MANAGER"))).toBe(true);
    expect(policy.canReview(ctx("ANALYST"))).toBe(false);
    expect(policy.canReview(ctx("VIEWER"))).toBe(false);
  });

  it("merge/split/archive theo quyền viết", () => {
    expect(policy.canManage(ctx("ANALYST"))).toBe(true);
    expect(policy.canManage(ctx("INSIGHT_REVIEWER"))).toBe(true);
    expect(policy.canManage(ctx("VIEWER"))).toBe(false);
  });

  it("assertCanReview ném ForbiddenActionError với role không có quyền", () => {
    expect(() => policy.assertCanReview(ctx("ANALYST"))).toThrow(ForbiddenActionError);
    expect(() => policy.assertCanWrite(ctx("VIEWER"))).toThrow(ForbiddenActionError);
    expect(() => policy.assertCanReview(ctx("INSIGHT_REVIEWER"))).not.toThrow();
  });
});
