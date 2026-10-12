import { z } from "zod";

export const setupStudentSchema = z.object({
  full_name: z.string().trim().min(2).max(200),
  email: z.string().email().max(200).optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  birth_date: z.string().optional().refine((value) => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date.getTime() <= Date.now();
  }, "Data de nascimento inválida"),
  status: z.enum(["active", "inactive", "frozen"]).optional(),
}).passthrough();

export function validateSetupRows(rows: Record<string, string>[]): string[] {
  return rows.flatMap((row, index) => {
    const parsed = setupStudentSchema.safeParse(row);
    return parsed.success ? [] : [`Linha ${index + 2}: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`];
  });
}