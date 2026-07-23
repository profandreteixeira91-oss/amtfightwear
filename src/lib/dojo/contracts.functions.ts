import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMyAcademyForContract = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_academy_profile")
      .select("*")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });



const uuid = z.string().uuid();

const templateSchema = z.object({
  id: uuid.optional(),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  content: z.string().default(""),
  header_html: z.string().default(""),
  footer_html: z.string().default(""),
  page_size: z.enum(["A4", "Letter"]).default("A4"),
  page_orientation: z.enum(["portrait", "landscape"]).default("portrait"),
  margin_mm: z.number().int().min(5).max(40).default(18),
  show_page_numbers: z.boolean().default(true),
  is_default: z.boolean().optional(),
});

export const listContractTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_contract_templates")
      .select("*")
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getContractTemplate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("dojo_contract_templates")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

export const saveContractTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => templateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, owner_id: context.userId };
    const q = context.supabase.from("dojo_contract_templates");
    if (data.id) {
      const { data: row, error } = await q.update(payload).eq("id", data.id).select("*").single();
      if (error) throw error;
      return row;
    }
    const { data: row, error } = await q.insert(payload).select("*").single();
    if (error) throw error;
    return row;
  });

export const deleteContractTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_contract_templates").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const contractSchema = z.object({
  id: uuid.optional(),
  student_id: uuid,
  template_id: uuid.nullable().optional(),
  title: z.string().min(1).max(200),
  content: z.string().default(""),
  status: z.enum(["draft", "active", "signed", "cancelled"]).default("draft"),
  signed_at: z.string().nullable().optional(),
  plan_name: z.string().nullable().optional(),
  monthly_value: z.number().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  due_day: z.number().int().min(1).max(31).nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
});

export const listStudentContracts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { student_id: string }) => z.object({ student_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("dojo_student_contracts")
      .select("*")
      .eq("student_id", data.student_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

export const getStudentContract = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("dojo_student_contracts")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

export const saveStudentContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => contractSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, owner_id: context.userId };
    const q = context.supabase.from("dojo_student_contracts");
    if (data.id) {
      const { data: row, error } = await q.update(payload).eq("id", data.id).select("*").single();
      if (error) throw error;
      return row;
    }
    const { data: row, error } = await q.insert(payload).select("*").single();
    if (error) throw error;
    return row;
  });

export const deleteStudentContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_student_contracts").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
