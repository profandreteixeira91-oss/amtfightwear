// Biblioteca central: busca pública (autenticada) e detalhes.
// Todas as consultas usam a chave publishable — RLS `SELECT to authenticated` cuida do acesso.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { classify } from "@/lib/dojo/competitions/classifier";

const listSchema = z.object({
  q: z.string().trim().optional(),
  country: z.string().trim().optional(),
  state: z.string().trim().optional(),
  city: z.string().trim().optional(),
  scope: z.enum(["international", "national", "regional", "state", "municipal"]).optional(),
  organization: z.string().trim().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  registrationOpen: z.boolean().optional(),
  maxPrice: z.number().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(30),
});

// Campos textuais varridos pela busca livre. Inclui todas as fontes cadastradas
// (source_code) para permitir buscas do tipo "cbjj", "manual" etc.
const SEARCH_FIELDS = [
  "name",
  "organization",
  "description",
  "modality",
  "city",
  "state",
  "country",
  "venue",
  "address",
  "source_code",
] as const;

// Escapa vírgula e parênteses que quebrariam o filtro PostgREST `.or(...)`.
function escapeOrToken(v: string): string {
  return v.replace(/,/g, "\\,").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// Divide a query em tokens respeitando "aspas" para frases exatas.
function tokenizeQuery(q: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]+)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(q)) !== null) {
    const t = (m[1] ?? m[2] ?? "").trim();
    if (t.length >= 1) tokens.push(t);
  }
  return tokens;
}

export const listCompetitions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => listSchema.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("competitions")
      .select(
        "id, name, organization, scope, tier, country, state, city, venue, start_at, end_at, registration_deadline, price, currency, official_url, registration_url, categories, belts, source_code, classification",
        { count: "exact" },
      )
      .order("start_at", { ascending: true, nullsFirst: false });

    if (data.q) {
      // Cada token vira uma cláusula OR entre TODOS os campos; múltiplas
      // chamadas `.or()` são combinadas com AND — assim uma busca por
      // "sao paulo master" exige todos os termos, mas cada um pode aparecer
      // em qualquer campo cadastrado (nome, cidade, organização, fonte...).
      const tokens = tokenizeQuery(data.q);
      for (const t of tokens) {
        const safe = escapeOrToken(t);
        const like = `*${safe}*`;
        const clauses = SEARCH_FIELDS.map((f) => `${f}.ilike.${like}`).join(",");
        query = query.or(clauses);
      }
    }
    if (data.country) query = query.eq("country", data.country);
    if (data.state) query = query.eq("state", data.state);
    if (data.city) query = query.ilike("city", `%${data.city}%`);
    if (data.scope) query = query.eq("scope", data.scope);
    if (data.organization) query = query.ilike("organization", `%${data.organization}%`);
    if (data.fromDate) query = query.gte("start_at", data.fromDate);
    if (data.toDate) query = query.lte("start_at", data.toDate);
    if (data.registrationOpen) query = query.gt("registration_deadline", new Date().toISOString());
    if (typeof data.maxPrice === "number") query = query.lte("price", data.maxPrice);

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    query = query.range(from, to);

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

export const getCompetition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("competitions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Competição não encontrada");
    return row;
  });

export const listCompetitionFilters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: countries } = await context.supabase
      .from("competitions")
      .select("country")
      .not("country", "is", null);
    const { data: states } = await context.supabase
      .from("competitions")
      .select("state")
      .not("state", "is", null);
    const { data: orgs } = await context.supabase
      .from("competitions")
      .select("organization")
      .not("organization", "is", null);
    const uniq = (rows: Array<Record<string, string | null>> | null, k: string) =>
      Array.from(new Set((rows ?? []).map((r) => r[k]).filter((v): v is string => !!v))).sort();
    return {
      countries: uniq(countries as Array<Record<string, string | null>> | null, "country"),
      states: uniq(states as Array<Record<string, string | null>> | null, "state"),
      organizations: uniq(orgs as Array<Record<string, string | null>> | null, "organization"),
    };
  });

const manualSchema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório"),
  organization: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  modality: z.string().trim().optional().nullable(),
  scope: z.enum(["international", "national", "regional", "state", "municipal"]).optional(),
  country: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  venue: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  start_at: z.string().optional().nullable(),
  end_at: z.string().optional().nullable(),
  registration_deadline: z.string().optional().nullable(),
  price: z.number().nullable().optional(),
  currency: z.string().trim().optional().nullable(),
  official_url: z.string().trim().optional().nullable(),
  registration_url: z.string().trim().optional().nullable(),
  contact_email: z.string().trim().optional().nullable(),
  contact_phone: z.string().trim().optional().nullable(),
});

/**
 * Cria uma competição manual na biblioteca. Fica marcada com source_code="manual"
 * e um external_id único para conviver com a chave (source_code, external_id).
 */
export const createManualCompetition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => manualSchema.parse(i))
  .handler(async ({ data, context }) => {
    const cls = classify({
      name: data.name,
      organization: data.organization ?? null,
      description: data.description ?? null,
      country: data.country ?? null,
      state: data.state ?? null,
      city: data.city ?? null,
      scopeHint: data.scope,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const externalId = `manual:${context.userId}:${Date.now()}`;
    const record = {
      source_id: null,
      source_code: "manual",
      external_id: externalId,
      name: data.name,
      organization: data.organization ?? null,
      description: data.description ?? null,
      modality: data.modality ?? null,
      country: data.country ?? null,
      state: data.state ?? null,
      city: data.city ?? null,
      address: data.address ?? null,
      venue: data.venue ?? null,
      start_at: data.start_at || null,
      end_at: data.end_at || null,
      registration_deadline: data.registration_deadline || null,
      price: typeof data.price === "number" ? data.price : null,
      currency: data.currency || "BRL",
      official_url: data.official_url || null,
      registration_url: data.registration_url || null,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      scope: data.scope ?? cls.scope,
      tier: cls.tier,
      classification: cls as unknown as never,
      last_seen_at: new Date().toISOString(),
    };
    const { data: row, error } = await supabaseAdmin
      .from("competitions")
      .insert(record as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });
