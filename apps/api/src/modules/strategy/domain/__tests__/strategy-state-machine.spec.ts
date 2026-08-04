import { StrategyVersionStateMachine } from "../strategy-state-machine";

describe("StrategyVersionStateMachine", () => {
  it("AI_DRAFT -> DRAFT / WAITING_APPROVAL / SUPERSEDED / ARCHIVED", () => {
    expect(StrategyVersionStateMachine.canTransition("AI_DRAFT", "DRAFT")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("AI_DRAFT", "WAITING_APPROVAL")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("AI_DRAFT", "SUPERSEDED")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("AI_DRAFT", "ARCHIVED")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("AI_DRAFT", "APPROVED")).toBe(false);
  });

  it("DRAFT -> WAITING_APPROVAL / SUPERSEDED / ARCHIVED", () => {
    expect(StrategyVersionStateMachine.canTransition("DRAFT", "WAITING_APPROVAL")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("DRAFT", "SUPERSEDED")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("DRAFT", "ARCHIVED")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("DRAFT", "APPROVED")).toBe(false);
  });

  it("WAITING_APPROVAL -> APPROVED / NEEDS_REVISION / SUPERSEDED / ARCHIVED", () => {
    expect(StrategyVersionStateMachine.canTransition("WAITING_APPROVAL", "APPROVED")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("WAITING_APPROVAL", "NEEDS_REVISION")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("WAITING_APPROVAL", "SUPERSEDED")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("WAITING_APPROVAL", "ARCHIVED")).toBe(true);
  });

  it("NEEDS_REVISION -> DRAFT / WAITING_APPROVAL / SUPERSEDED / ARCHIVED", () => {
    expect(StrategyVersionStateMachine.canTransition("NEEDS_REVISION", "DRAFT")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("NEEDS_REVISION", "WAITING_APPROVAL")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("NEEDS_REVISION", "SUPERSEDED")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("NEEDS_REVISION", "ARCHIVED")).toBe(true);
  });

  it("APPROVED -> LOCKED / NEEDS_REVISION / SUPERSEDED / ARCHIVED", () => {
    expect(StrategyVersionStateMachine.canTransition("APPROVED", "LOCKED")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("APPROVED", "NEEDS_REVISION")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("APPROVED", "SUPERSEDED")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("APPROVED", "ARCHIVED")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("APPROVED", "WAITING_APPROVAL")).toBe(false);
  });

  it("LOCKED -> SUPERSEDED / ARCHIVED", () => {
    expect(StrategyVersionStateMachine.canTransition("LOCKED", "SUPERSEDED")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("LOCKED", "ARCHIVED")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("LOCKED", "APPROVED")).toBe(false);
    expect(StrategyVersionStateMachine.canTransition("LOCKED", "NEEDS_REVISION")).toBe(false);
  });

  it("SUPERSEDED -> ARCHIVED; ARCHIVED là trạng thái kết thúc", () => {
    expect(StrategyVersionStateMachine.canTransition("SUPERSEDED", "ARCHIVED")).toBe(true);
    expect(StrategyVersionStateMachine.canTransition("SUPERSEDED", "DRAFT")).toBe(false);
    expect(StrategyVersionStateMachine.canTransition("ARCHIVED", "SUPERSEDED")).toBe(false);
    expect(StrategyVersionStateMachine.canTransition("ARCHIVED", "DRAFT")).toBe(false);
  });

  it("assertCanTransition throw khi transition không hợp lệ", () => {
    expect(() =>
      StrategyVersionStateMachine.assertCanTransition("DRAFT", "APPROVED"),
    ).toThrow();
  });

  it("chỉ AI_DRAFT / DRAFT / NEEDS_REVISION là editable", () => {
    expect(StrategyVersionStateMachine.isEditable("AI_DRAFT")).toBe(true);
    expect(StrategyVersionStateMachine.isEditable("DRAFT")).toBe(true);
    expect(StrategyVersionStateMachine.isEditable("NEEDS_REVISION")).toBe(true);
    expect(StrategyVersionStateMachine.isEditable("WAITING_APPROVAL")).toBe(false);
    expect(StrategyVersionStateMachine.isEditable("APPROVED")).toBe(false);
    expect(StrategyVersionStateMachine.isEditable("LOCKED")).toBe(false);
    expect(StrategyVersionStateMachine.isEditable("SUPERSEDED")).toBe(false);
    expect(StrategyVersionStateMachine.isEditable("ARCHIVED")).toBe(false);
  });

  it("APPROVED/LOCKED/SUPERSEDED/ARCHIVED là immutable", () => {
    expect(StrategyVersionStateMachine.isImmutable("APPROVED")).toBe(true);
    expect(StrategyVersionStateMachine.isImmutable("LOCKED")).toBe(true);
    expect(StrategyVersionStateMachine.isImmutable("SUPERSEDED")).toBe(true);
    expect(StrategyVersionStateMachine.isImmutable("ARCHIVED")).toBe(true);
    expect(StrategyVersionStateMachine.isImmutable("AI_DRAFT")).toBe(false);
    expect(StrategyVersionStateMachine.isImmutable("DRAFT")).toBe(false);
    expect(StrategyVersionStateMachine.isImmutable("NEEDS_REVISION")).toBe(false);
  });

  it("chỉ ARCHIVED là inactive", () => {
    expect(StrategyVersionStateMachine.isActive("ARCHIVED")).toBe(false);
    expect(StrategyVersionStateMachine.isActive("AI_DRAFT")).toBe(true);
    expect(StrategyVersionStateMachine.isActive("APPROVED")).toBe(true);
    expect(StrategyVersionStateMachine.isActive("LOCKED")).toBe(true);
    expect(StrategyVersionStateMachine.isActive("SUPERSEDED")).toBe(true);
  });
});
