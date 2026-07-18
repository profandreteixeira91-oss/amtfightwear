import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PROVIDERS, type NormalizedCompetition, type ProviderId } from "@/lib/dojo/competitions/providers";

const providerEnum = z.enum([
  "manual","smoothcomp","sou_competidor","bjj_tour","ibjjf","uaejjf","cbjj","cbjje","fjjrio","fpjjb","fjjsp","other",
]);

const athleteStatusEnum = z.enum([
  "pre_registered","registered","payment_pending","confirmed","cancelled",
]);

const competitionSchema = z.object({
  id: z.string().uuid().optional(),
  provider: providerEnum.default("manual"),
  external_id: z.string().nullable().optional(),
  external_url: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  name: z.string().min(1),
  banner_url: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  registration_deadline: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  venue_name: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  organizer: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  modality: z.string().nullable().optional(),
  with_gi: z.boolean().nullable().optional(),
  age_groups: z.array(z.string()).optional(),
  belts: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  entry_fee: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  status: z.string().optional(),
});

// ================= LIST / GET =================
export const listCompetitions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_competitions")
      .select("*")
      .order("starts_at", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCompetition = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: comp, error } = await context.supabase
      .from("dojo_competitions")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const [athletesRes, attachmentsRes] = await Promise.all([
      context.supabase
        .from("dojo_competition_athletes")
        .select("*, student:dojo_students(id, full_name, photo_url, cpf, phone, current_belt_id, belt:dojo_belts(name, color_hex))")
        .eq("competition_id", data.id)
        .order("created_at", { ascending: true }),
      context.supabase
        .from("dojo_competition_attachments")
        .select("*")
        .eq("competition_id", data.id)
        .order("created_at", { ascending: false }),
    ]);
    if (athletesRes.error) throw new Error(athletesRes.error.message);
    if (attachmentsRes.error) throw new Error(attachmentsRes.error.message);

    return {
      competition: comp,
      athletes: athletesRes.data ?? [],
      attachments: attachmentsRes.data ?? [],
    };
  });

// ================= UPSERT / DELETE =================
export const upsertCompetition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => competitionSchema.parse(i))
  .handler(async ({ data, context }) => {
    const payload = { ...data, owner_id: context.userId };
    const { data: row, error } = data.id
      ? await context.supabase.from("dojo_competitions").update(payload).eq("id", data.id).select().single()
      : await context.supabase.from("dojo_competitions").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCompetition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_competitions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ================= ATHLETES =================
const athleteSchema = z.object({
  id: z.string().uuid().optional(),
  competition_id: z.string().uuid(),
  student_id: z.string().uuid(),
  category: z.string().nullable().optional(),
  weight: z.number().nullable().optional(),
  belt: z.string().nullable().optional(),
  age_group: z.string().nullable().optional(),
  status: athleteStatusEnum.optional(),
  notes: z.string().nullable().optional(),
});

export const addCompetitionAthlete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => athleteSchema.parse(i))
  .handler(async ({ data, context }) => {
    // Uniqueness enforced by DB unique constraint. Return a friendly error.
    const payload = {
      ...data,
      owner_id: context.userId,
      registered_by: context.userId,
    };
    const { data: row, error } = await context.supabase
      .from("dojo_competition_athletes")
      .insert(payload)
      .select("*, student:dojo_students(id, full_name, photo_url, cpf, phone, belt:dojo_belts(name, color_hex))")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("Este atleta já está inscrito nesta competição.");
      throw new Error(error.message);
    }
    return row;
  });

export const updateCompetitionAthlete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => athleteSchema.extend({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("dojo_competition_athletes")
      .update(rest)
      .eq("id", id)
      .select("*, student:dojo_students(id, full_name, photo_url, cpf, phone, belt:dojo_belts(name, color_hex))")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const removeCompetitionAthlete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_competition_athletes")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ================= STUDENT SEARCH =================
export const searchStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ q: z.string().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const q = (data.q ?? "").trim();
    let query = context.supabase
      .from("dojo_students")
      .select("id, full_name, photo_url, cpf, phone, birth_date, current_degree, belt:dojo_belts(name, color_hex)")
      .order("full_name", { ascending: true })
      .limit(30);
    if (q) {
      const like = `%${q}%`;
      query = query.or(`full_name.ilike.${like},cpf.ilike.${like},phone.ilike.${like}`);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ================= PROVIDER SYNC =================
export const syncCompetitions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const owner_id = context.userId;
    const summary: { provider: ProviderId; inserted: number; updated: number; errors?: string }[] = [];

    for (const p of PROVIDERS) {
      if (!p.fetchUpcoming) continue;
      try {
        const items: NormalizedCompetition[] = await p.fetchUpcoming();
        let inserted = 0;
        let updated = 0;
        for (const it of items) {
          const row = { ...it, owner_id };
          if (it.external_id) {
            const { data: existing } = await context.supabase
              .from("dojo_competitions")
              .select("id")
              .eq("owner_id", owner_id)
              .eq("provider", p.id)
              .eq("external_id", it.external_id)
              .maybeSingle();
            if (existing?.id) {
              await context.supabase.from("dojo_competitions").update(row as any).eq("id", existing.id);
              updated++;
            } else {
              await context.supabase.from("dojo_competitions").insert(row as any);
              inserted++;
            }
          } else {
            await context.supabase.from("dojo_competitions").insert(row as any);
            inserted++;
          }
        }
        summary.push({ provider: p.id, inserted, updated });
      } catch (e: any) {
        summary.push({ provider: p.id, inserted: 0, updated: 0, errors: e?.message ?? "erro" });
      }
    }
    return { summary };
  });
