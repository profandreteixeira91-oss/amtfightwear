import { describe, expect, test } from "bun:test";
import { setupStudentSchema, validateSetupRows } from "./setup-validation";

describe("setup input validation", () => {
  test("accepts minimal student and optional blank fields", () => {
    expect(setupStudentSchema.safeParse({ full_name: "Ana Silva", email: "", birth_date: "" }).success).toBe(true);
  });
  test("rejects impossible, future and malformed dates", () => {
    for (const birth_date of ["2025-02-30", "2999-01-01", "12/01/2000"]) {
      expect(setupStudentSchema.safeParse({ full_name: "Ana Silva", birth_date }).success).toBe(false);
    }
  });
  test("identifies invalid row before import", () => {
    expect(validateSetupRows([{ full_name: "Ana" }, { full_name: " ", email: "bad", status: "deleted" }])[0]).toContain("Linha 3");
  });
  test("keeps supported importer fields", () => {
    expect(setupStudentSchema.parse({ full_name: "Ana", guardian_name: "Maria" }).guardian_name).toBe("Maria");
  });
});