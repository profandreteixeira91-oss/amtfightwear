import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const affiliateSchema = z.object({
  id: z.string().uuid().optional(),
  affiliation_number: z.string().min(1).max(60).optional(),
  status: z.enum(["em_analise", "ativo", "suspenso", "cancelado"]).optional(),
  academy_name: z.string().min(1).max(200),
  trade_name: z.string().max(200).optional().nullable(),
  legal_name: z.string().max(200).optional().nullable(),
  cnpj: z.string().max(32).optional().nullable(),
  state_registration: z.string().max(40).optional().nullable(),
  manager_name: z.string().max(160).optional().nullable(),
  manager_cpf: z.string().max(20).optional().nullable(),
  manager_rg: z.string().max(30).optional().nullable(),
  manager_email: z.string().max(200).optional().nullable(),
  manager_phone: z.string().max(40).optional().nullable(),
  zip: z.string().max(12).optional().nullable(),
  street: z.string().max(200).optional().nullable(),
  number: z.string().max(20).optional().nullable(),
  complement: z.string().max(120).optional().nullable(),
  neighborhood: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(4).optional().nullable(),
  country: z.string().max(4).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  whatsapp: z.string().max(40).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  website: z.string().max(300).optional().nullable(),
  socials: z.record(z.string(), z.any()).optional().nullable(),
  logo_url: z.string().max(600).optional().nullable(),
  banner_url: z.string().max(600).optional().nullable(),
  facade_url: z.string().max(600).optional().nullable(),
  gallery_urls: z.array(z.string()).optional().nullable(),
  modalities: z.array(z.string()).optional().nullable(),
  teacher: z.record(z.string(), z.any()).optional().nullable(),
  joined_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export const listAffiliates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("dojo_affiliates").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getAffiliate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("dojo_affiliates").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const saveAffiliate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => affiliateSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(rest)) if (v !== undefined) payload[k] = v;
    if (id) {
      const { error } = await (context.supabase as any)
        .from("dojo_affiliates").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    // Auto-generate affiliation number
    if (!payload.affiliation_number) {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
      payload.affiliation_number = `AF-${year}-${random}`;
    }
    const { data: row, error } = await (context.supabase as any)
      .from("dojo_affiliates").insert({ ...payload, owner_id: context.userId }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteAffiliate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("dojo_affiliates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ FINANCEIRO (usa dojo_invoices existentes) ============
export const listAffiliateInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ affiliate_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("dojo_invoices")
      .select("*")
      .eq("affiliate_id", data.affiliate_id)
      .order("due_date", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createAffiliateInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    affiliate_id: z.string().uuid(),
    description: z.string().min(1).max(300),
    amount: z.number().positive(),
    due_date: z.string(),
    kind: z.enum(["monthly", "annual", "single"]).default("single"),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: aff, error: affErr } = await (context.supabase as any)
      .from("dojo_affiliates").select("id, academy_name").eq("id", data.affiliate_id).maybeSingle();
    if (affErr) throw new Error(affErr.message);
    if (!aff) throw new Error("Filial não encontrada");

    const payload: any = {
      owner_id: context.userId,
      student_id: null,
      affiliate_id: data.affiliate_id,
      source: "affiliate",
      description: `${data.description} — ${aff.academy_name}`,
      amount: data.amount,
      due_date: data.due_date,
      status: "pending",
      metadata: { kind: data.kind },
    };
    const { data: inv, error } = await (context.supabase as any)
      .from("dojo_invoices").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: inv.id };
  });

// ============ CONTRATOS ============
export const listAffiliateContracts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ affiliate_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("dojo_affiliate_contracts").select("*")
      .eq("affiliate_id", data.affiliate_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveAffiliateContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid().optional(),
    affiliate_id: z.string().uuid(),
    title: z.string().max(200).optional(),
    html_content: z.string().min(1),
    variables: z.record(z.string(), z.any()).optional().nullable(),
    signature_status: z.enum(["draft", "pending", "signed", "cancelled"]).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (id) {
      const { error } = await (context.supabase as any)
        .from("dojo_affiliate_contracts").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await (context.supabase as any)
      .from("dojo_affiliate_contracts").insert({ ...rest, owner_id: context.userId }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteAffiliateContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("dojo_affiliate_contracts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
