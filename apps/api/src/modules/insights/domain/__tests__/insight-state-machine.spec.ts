import { InsightStateMachine } from "../insight-state-machine";

describe("InsightStateMachine", () => {
  it("cho phép DRAFT -> WAITING_REVIEW (gửi duyệt)", () => {
    expect(InsightStateMachine.canTransition("DRAFT", "WAITING_REVIEW")).toBe(true);
  });

  it("cho phép DRAFT -> ARCHIVED nhưng không nhảy thẳng DRAFT -> APPROVED", () => {
    expect(InsightStateMachine.canTransition("DRAFT", "ARCHIVED")).toBe(true);
    expect(InsightStateMachine.canTransition("DRAFT", "APPROVED")).toBe(false);
  });

  it("WAITING_REVIEW -> APPROVED / REJECTED / NEEDS_REANALYSIS / ARCHIVED", () => {
    expect(InsightStateMachine.canTransition("WAITING_REVIEW", "APPROVED")).toBe(true);
    expect(InsightStateMachine.canTransition("WAITING_REVIEW", "REJECTED")).toBe(true);
    expect(InsightStateMachine.canTransition("WAITING_REVIEW", "NEEDS_REANALYSIS")).toBe(true);
    expect(InsightStateMachine.canTransition("WAITING_REVIEW", "ARCHIVED")).toBe(true);
  });

  it("APPROVED chỉ có thể trả về NEEDS_REANALYSIS hoặc archive", () => {
    expect(InsightStateMachine.canTransition("APPROVED", "NEEDS_REANALYSIS")).toBe(true);
    expect(InsightStateMachine.canTransition("APPROVED", "ARCHIVED")).toBe(true);
    expect(InsightStateMachine.canTransition("APPROVED", "REJECTED")).toBe(false);
    expect(InsightStateMachine.canTransition("APPROVED", "WAITING_REVIEW")).toBe(false);
  });

  it("REJECTED có thể sửa lại rồi submit, trả lại phân tích, hoặc về DRAFT", () => {
    expect(InsightStateMachine.canTransition("REJECTED", "WAITING_REVIEW")).toBe(true);
    expect(InsightStateMachine.canTransition("REJECTED", "NEEDS_REANALYSIS")).toBe(true);
    expect(InsightStateMachine.canTransition("REJECTED", "DRAFT")).toBe(true);
    expect(InsightStateMachine.canTransition("REJECTED", "ARCHIVED")).toBe(true);
  });

  it("NEEDS_REANALYSIS -> WAITING_REVIEW / DRAFT / ARCHIVED", () => {
    expect(InsightStateMachine.canTransition("NEEDS_REANALYSIS", "WAITING_REVIEW")).toBe(true);
    expect(InsightStateMachine.canTransition("NEEDS_REANALYSIS", "DRAFT")).toBe(true);
    expect(InsightStateMachine.canTransition("NEEDS_REANALYSIS", "ARCHIVED")).toBe(true);
  });

  it("ARCHIVED là trạng thái kết thúc — không đi ra đâu được", () => {
    expect(InsightStateMachine.canTransition("ARCHIVED", "DRAFT")).toBe(false);
    expect(InsightStateMachine.canTransition("ARCHIVED", "WAITING_REVIEW")).toBe(false);
    expect(InsightStateMachine.canTransition("ARCHIVED", "APPROVED")).toBe(false);
  });

  it("assertCanTransition throw khi transition không hợp lệ", () => {
    expect(() =>
      InsightStateMachine.assertCanTransition("DRAFT", "APPROVED"),
    ).toThrow();
  });

  it("chỉ DRAFT và NEEDS_REANALYSIS là editable", () => {
    expect(InsightStateMachine.isEditable("DRAFT")).toBe(true);
    expect(InsightStateMachine.isEditable("NEEDS_REANALYSIS")).toBe(true);
    expect(InsightStateMachine.isEditable("WAITING_REVIEW")).toBe(false);
    expect(InsightStateMachine.isEditable("APPROVED")).toBe(false);
    expect(InsightStateMachine.isEditable("ARCHIVED")).toBe(false);
  });

  it("chỉ WAITING_REVIEW là reviewable", () => {
    expect(InsightStateMachine.isReviewable("WAITING_REVIEW")).toBe(true);
    expect(InsightStateMachine.isReviewable("DRAFT")).toBe(false);
    expect(InsightStateMachine.isReviewable("APPROVED")).toBe(false);
  });

  it("ARCHIVED là inactive, còn lại đều active để merge/split", () => {
    expect(InsightStateMachine.isActive("ARCHIVED")).toBe(false);
    expect(InsightStateMachine.isActive("DRAFT")).toBe(true);
    expect(InsightStateMachine.isActive("APPROVED")).toBe(true);
    expect(InsightStateMachine.isActive("REJECTED")).toBe(true);
  });
});
