import { FeedbackPolicy } from "../feedback.policy";
import { RequestContext } from "../../../../shared/context/request-context";

function ctx(role: RequestContext["role"]): RequestContext {
  return { organizationId: "org_1", userId: "user_1", role };
}

describe("FeedbackPolicy", () => {
  const policy = new FeedbackPolicy();

  it("Org Admin và Analyst được tạo/sửa/xóa feedback", () => {
    expect(policy.canCreate(ctx("ORG_ADMIN"))).toBe(true);
    expect(policy.canCreate(ctx("ANALYST"))).toBe(true);
    expect(policy.canCreate(ctx("VIEWER"))).toBe(false);
    expect(policy.canUpdate(ctx("ANALYST"))).toBe(true);
    expect(policy.canDelete(ctx("ANALYST"))).toBe(true);
  });

  it("Reviewer và Viewer không được tạo feedback", () => {
    expect(() => policy.assertCanCreate(ctx("INSIGHT_REVIEWER"))).toThrow();
    expect(() => policy.assertCanCreate(ctx("VIEWER"))).toThrow();
  });
});
