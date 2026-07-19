// Biblioteca central: busca pública (autenticada) e detalhes.
// Todas as consultas usam a chave publishable — RLS `SELECT to authenticated` cuida do acesso.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
      const term = `%${data.q}%`;
      query = query.or(`name.ilike.${term},organization.ilike.${term},city.ilike.${term}`);
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
