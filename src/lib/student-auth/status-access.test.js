import { describe, expect, it } from "vitest";
import { canStudentCheckIn, canStudentUseApp } from "./status-access";

describe("status do aluno", () => {
  it("somente active pode fazer check-in", () => {
    expect(canStudentCheckIn("active")).toBe(true);
    for (const status of ["inactive", "frozen", "trial", "invited", null]) {
      expect(canStudentCheckIn(status)).toBe(false);
    }
  });
  it("frozen não tem acesso ao app", () => {
    expect(canStudentUseApp("frozen")).toBe(false);
    expect(canStudentUseApp("active")).toBe(true);
  });
});