import { ContentStateMachine } from "../content-state-machine";

describe("ContentStateMachine", () => {
  it("DRAFT -> WAITING_APPROVAL / ARCHIVED", () => {
    expect(ContentStateMachine.canTransition("DRAFT", "WAITING_APPROVAL")).toBe(true);
    expect(ContentStateMachine.canTransition("DRAFT", "ARCHIVED")).toBe(true);
    expect(ContentStateMachine.canTransition("DRAFT", "APPROVED")).toBe(false);
    expect(ContentStateMachine.canTransition("DRAFT", "LOCKED")).toBe(false);
  });

  it("WAITING_APPROVAL -> APPROVED / NEEDS_REVISION / ARCHIVED", () => {
    expect(ContentStateMachine.canTransition("WAITING_APPROVAL", "APPROVED")).toBe(true);
    expect(ContentStateMachine.canTransition("WAITING_APPROVAL", "NEEDS_REVISION")).toBe(true);
    expect(ContentStateMachine.canTransition("WAITING_APPROVAL", "ARCHIVED")).toBe(true);
    expect(ContentStateMachine.canTransition("WAITING_APPROVAL", "LOCKED")).toBe(false);
  });

  it("NEEDS_REVISION -> WAITING_APPROVAL / ARCHIVED", () => {
    expect(ContentStateMachine.canTransition("NEEDS_REVISION", "WAITING_APPROVAL")).toBe(true);
    expect(ContentStateMachine.canTransition("NEEDS_REVISION", "ARCHIVED")).toBe(true);
    expect(ContentStateMachine.canTransition("NEEDS_REVISION", "APPROVED")).toBe(false);
  });

  it("APPROVED -> LOCKED / NEEDS_REVISION / ARCHIVED", () => {
    expect(ContentStateMachine.canTransition("APPROVED", "LOCKED")).toBe(true);
    expect(ContentStateMachine.canTransition("APPROVED", "NEEDS_REVISION")).toBe(true);
    expect(ContentStateMachine.canTransition("APPROVED", "ARCHIVED")).toBe(true);
    expect(ContentStateMachine.canTransition("APPROVED", "WAITING_APPROVAL")).toBe(false);
  });

  it("LOCKED -> NEEDS_REVISION (unlock) / ARCHIVED", () => {
    expect(ContentStateMachine.canTransition("LOCKED", "NEEDS_REVISION")).toBe(true);
    expect(ContentStateMachine.canTransition("LOCKED", "ARCHIVED")).toBe(true);
    expect(ContentStateMachine.canTransition("LOCKED", "APPROVED")).toBe(false);
    expect(ContentStateMachine.canTransition("LOCKED", "WAITING_APPROVAL")).toBe(false);
  });

  it("ARCHIVED là trạng thái kết thúc", () => {
    expect(ContentStateMachine.canTransition("ARCHIVED", "DRAFT")).toBe(false);
    expect(ContentStateMachine.canTransition("ARCHIVED", "APPROVED")).toBe(false);
    expect(ContentStateMachine.canTransition("ARCHIVED", "NEEDS_REVISION")).toBe(false);
  });

  it("assertCanTransition throw khi transition không hợp lệ", () => {
    expect(() => ContentStateMachine.assertCanTransition("DRAFT", "APPROVED")).toThrow();
  });

  it("chỉ DRAFT / NEEDS_REVISION là editable", () => {
    expect(ContentStateMachine.isEditable("DRAFT")).toBe(true);
    expect(ContentStateMachine.isEditable("NEEDS_REVISION")).toBe(true);
    expect(ContentStateMachine.isEditable("WAITING_APPROVAL")).toBe(false);
    expect(ContentStateMachine.isEditable("APPROVED")).toBe(false);
    expect(ContentStateMachine.isEditable("LOCKED")).toBe(false);
    expect(ContentStateMachine.isEditable("ARCHIVED")).toBe(false);
  });

  it("APPROVED/LOCKED/ARCHIVED là immutable", () => {
    expect(ContentStateMachine.isImmutable("APPROVED")).toBe(true);
    expect(ContentStateMachine.isImmutable("LOCKED")).toBe(true);
    expect(ContentStateMachine.isImmutable("ARCHIVED")).toBe(true);
    expect(ContentStateMachine.isImmutable("DRAFT")).toBe(false);
    expect(ContentStateMachine.isImmutable("NEEDS_REVISION")).toBe(false);
  });

  it("chỉ ARCHIVED là inactive", () => {
    expect(ContentStateMachine.isActive("ARCHIVED")).toBe(false);
    expect(ContentStateMachine.isActive("DRAFT")).toBe(true);
    expect(ContentStateMachine.isActive("LOCKED")).toBe(true);
  });
});
