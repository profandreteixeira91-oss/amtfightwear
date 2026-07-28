// Gestão da competição pela academia: vínculo, atletas, staff, finanças,
// hospedagem, transporte, resultados e documentos. Todas as consultas usam
// requireSupabaseAuth — RLS por owner_id garante isolamento multi-tenant.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().regex(/^[0-9a-fA-F-]{32,36}$/);

// ============ Adicionar / listar ============

const addToCalendarSchema = z.object({
  competition_id: uuid,
  notes: z.string().optional().nullable(),
  professor_id: uuid.optional().nullable(),
  professor_name: z.string().optional().nullable(),
  visibility: z.enum(["all", "class", "belt", "custom"]).default("all"),
  target_class_ids: z.array(uuid).optional(),
  target_belt_ids: z.array(uuid).optional(),
});

export const addCompetitionToCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => addToCalendarSchema.parse(i))
  .handler(async ({ data, context }) => {
    const payload = {
      owner_id: context.userId,
      competition_id: data.competition_id,
      notes: data.notes ?? null,
      professor_id: data.professor_id ?? null,
      professor_name: data.professor_name ?? null,
      visibility: data.visibility,
      target_class_ids: data.target_class_ids ?? [],
      target_belt_ids: data.target_belt_ids ?? [],
      added_by: context.userId,
    };
    const { data: row, error } = await context.supabase
      .from("academy_competitions")
      .upsert(payload as never, { onConflict: "owner_id,competition_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // Notifica alunos elegíveis (broadcast simples)
    try {
      const { data: students } = await context.supabase
        .from("dojo_students")
        .select("id")
        .eq("owner_id", context.userId)
        .eq("status", "active");
      if (students && students.length) {
        const rows = students.map((s) => ({
          owner_id: context.userId,
          student_id: s.id,
          title: "Nova competição no calendário",
          body: data.notes ?? "Sua academia adicionou uma nova competição.",
          kind: "competition",
        }));
        await context.supabase.from("dojo_student_notifications").insert(rows as never);
      }
    } catch (e) {
      console.warn("notify students failed", e);
    }

    return row;
  });

// ============ Importação em massa ============

export const addCompetitionsBulkToCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      competition_ids: z.array(uuid).min(1).max(200),
      visibility: z.enum(["all", "class", "belt", "custom"]).default("all"),
      notes: z.string().optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const rows = data.competition_ids.map((cid) => ({
      owner_id: context.userId,
      competition_id: cid,
      visibility: data.visibility,
      notes: data.notes ?? null,
      target_class_ids: [],
      target_belt_ids: [],
      added_by: context.userId,
    }));
    const { data: inserted, error } = await context.supabase
      .from("academy_competitions")
      .upsert(rows as never, { onConflict: "owner_id,competition_id", ignoreDuplicates: false })
      .select("id, competition_id");
    if (error) throw new Error(error.message);

    // Broadcast único para alunos ativos
    try {
      const { data: students } = await context.supabase
        .from("dojo_students")
        .select("id")
        .eq("owner_id", context.userId)
        .eq("status", "active");
      if (students && students.length) {
        const count = data.competition_ids.length;
        const notifRows = students.map((s) => ({
          owner_id: context.userId,
          student_id: s.id,
          title: count > 1 ? `${count} novas competições` : "Nova competição no calendário",
          body: data.notes ?? `Sua academia adicionou ${count} ${count > 1 ? "competições" : "competição"} ao calendário.`,
          kind: "competition",
        }));
        await context.supabase.from("dojo_student_notifications").insert(notifRows as never);
      }
    } catch (e) {
      console.warn("bulk notify failed", e);
    }

    return { inserted: inserted?.length ?? 0 };
  });

export const listAcademyCompetitions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("academy_competitions")
      .select("*, competition:competitions(*)")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getAcademyCompetition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("academy_competitions")
      .select("*, competition:competitions(*)")
      .eq("id", data.id)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Competição não encontrada no seu calendário");
    return row;
  });

export const updateAcademyCompetition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: uuid,
      status: z.string().optional(),
      notes: z.string().nullable().optional(),
      professor_id: uuid.nullable().optional(),
      professor_name: z.string().nullable().optional(),
      visibility: z.enum(["all", "class", "belt", "custom"]).optional(),
      target_class_ids: z.array(uuid).optional(),
      target_belt_ids: z.array(uuid).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase
      .from("academy_competitions")
      .update(rest as never)
      .eq("id", id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeAcademyCompetition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("academy_competitions")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Atletas ============

const documentSchema = z.object({
  key: z.string(),
  label: z.string(),
  provided: z.boolean().default(false),
  file_url: z.string().url().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const athleteSchema = z.object({
  id: uuid.optional(),
  academy_competition_id: uuid,
  student_id: uuid,
  category: z.string().optional().nullable(),
  weight_class: z.string().optional().nullable(),
  weight_kg: z.number().optional().nullable(),
  belt_id: uuid.optional().nullable(),
  belt_name: z.string().optional().nullable(),
  age_group: z.string().optional().nullable(),
  status: z.enum(["interested", "confirmed", "registered", "weigh_in", "competing", "finished", "cancelled"]).optional(),
  paid: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  teacher_id: uuid.optional().nullable(),
  registration_number: z.string().optional().nullable(),
  amount_paid: z.number().optional().nullable(),
  payment_method: z.enum(["pix", "cash", "credit_card", "debit_card", "boleto", "bank_transfer", "other"]).optional().nullable(),
  documents: z.array(documentSchema).optional(),
});

export const upsertCompetitionAthlete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => athleteSchema.parse(i))
  .handler(async ({ data, context }) => {
    const payload = { ...data, owner_id: context.userId };

    // Status anterior para detectar transições
    let prevStatus: string | null = null;
    if (data.id) {
      const { data: prev } = await context.supabase
        .from("academy_competition_athletes")
        .select("status")
        .eq("id", data.id)
        .maybeSingle();
      prevStatus = (prev as { status: string | null } | null)?.status ?? null;
    }

    const { data: row, error } = data.id
      ? await context.supabase
          .from("academy_competition_athletes")
          .update(payload as never)
          .eq("id", data.id)
          .eq("owner_id", context.userId)
          .select("*")
          .single()
      : await context.supabase
          .from("academy_competition_athletes")
          .upsert(payload as never, { onConflict: "academy_competition_id,student_id" })
          .select("*")
          .single();
    if (error) throw new Error(error.message);

    // ==== Notificação automática ao atleta ====
    // Dispara ao inserir OU quando o status muda para confirmed/registered/cancelled.
    try {
      const newStatus = (row as { status: string | null }).status ?? data.status ?? null;
      const isNew = !data.id;
      const changed = prevStatus !== newStatus;
      const notifyStatuses = new Set(["confirmed", "registered", "cancelled"]);
      if (isNew || (changed && newStatus && notifyStatuses.has(newStatus))) {
        const { data: ac } = await context.supabase
          .from("academy_competitions")
          .select("competition:competitions(name, start_at, city, state)")
          .eq("id", data.academy_competition_id)
          .maybeSingle();
        const comp = (ac as { competition: { name: string; start_at: string | null; city: string | null; state: string | null } | null } | null)?.competition;
        const compName = comp?.name ?? "competição";
        const when = comp?.start_at ? new Date(comp.start_at).toLocaleDateString("pt-BR") : null;
        const where = [comp?.city, comp?.state].filter(Boolean).join("/") || null;
        const regNum = (row as { registration_number: string | null }).registration_number;

        let title = "Inscrição em competição";
        let body = `Você foi inscrito em ${compName}.`;
        if (newStatus === "confirmed") {
          title = "Presença confirmada";
          body = `Sua presença em ${compName} foi confirmada.`;
        } else if (newStatus === "registered") {
          title = "Inscrição efetivada";
          body = `Sua inscrição em ${compName} foi efetivada${regNum ? ` (nº ${regNum})` : ""}.`;
        } else if (newStatus === "cancelled") {
          title = "Inscrição cancelada";
          body = `Sua participação em ${compName} foi cancelada.`;
        }
        if (when || where) body += ` ${[when, where].filter(Boolean).join(" · ")}.`;

        await context.supabase.from("dojo_student_notifications").insert({
          owner_id: context.userId,
          student_id: data.student_id,
          title,
          body,
          kind: "competition",
        } as never);

        // Envia push web ao aluno
        try {
          const { safeNotifyStudent } = await import("@/lib/push/push.server");
          safeNotifyStudent(data.student_id, {
            title,
            body,
            url: "/app/competitions",
            tag: `competition-${data.academy_competition_id}-${newStatus ?? "new"}`,
            data: { academyCompetitionId: data.academy_competition_id, type: "competition" },
          }, "competition");
        } catch (pushErr) {
          console.warn("competition push failed", pushErr);
        }
      }
    } catch (e) {
      console.warn("notify athlete failed", e);
    }


    return row;
  });

export const listCompetitionAthletes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ academy_competition_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("academy_competition_athletes")
      .select("*, student:dojo_students(id, full_name, photo_url, birth_date), belt:dojo_belts(id, name, color_hex)")
      .eq("owner_id", context.userId)
      .eq("academy_competition_id", data.academy_competition_id)
      .order("created_at");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteCompetitionAthlete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("academy_competition_athletes")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Genérico: subtabelas ============

type SubTable =
  | "staff"
  | "finances"
  | "hotels"
  | "transport"
  | "results"
  | "documents";

const tableMap: Record<SubTable, string> = {
  staff: "academy_competition_staff",
  finances: "academy_competition_finances",
  hotels: "academy_competition_hotels",
  transport: "academy_competition_transport",
  results: "academy_competition_results",
  documents: "academy_competition_documents",
};

export const listCompetitionSubRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      academy_competition_id: uuid,
      table: z.enum(["staff", "finances", "hotels", "transport", "results", "documents"]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = (context.supabase as any).from(tableMap[data.table]);
    const { data: rows, error } = await client
      .select("*")
      .eq("owner_id", context.userId)
      .eq("academy_competition_id", data.academy_competition_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (rows ?? []) as any[];
  });

export const upsertCompetitionSubRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      table: z.enum(["staff", "finances", "hotels", "transport", "results", "documents"]),
      row: z.record(z.string(), z.unknown()),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = { ...(data.row as Record<string, unknown>), owner_id: context.userId };
    const id = payload.id as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = (context.supabase as any).from(tableMap[data.table]);
    const { data: row, error } = id
      ? await client.update(payload).eq("id", id).eq("owner_id", context.userId).select("*").single()
      : await client.insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return row as any;
  });

export const deleteCompetitionSubRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      table: z.enum(["staff", "finances", "hotels", "transport", "results", "documents"]),
      id: uuid,
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = (context.supabase as any).from(tableMap[data.table]);
    const { error } = await client
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Dashboard ============

export const getCompetitionsDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const nowIso = new Date().toISOString();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: rows } = await context.supabase
      .from("academy_competitions")
      .select("id, competition:competitions(start_at, scope)")
      .eq("owner_id", context.userId);

    type Row = { id: string; competition: { start_at: string | null; scope: string | null } | null };
    const list = (rows ?? []) as unknown as Row[];

    const future = list.filter((r) => r.competition?.start_at && r.competition.start_at >= nowIso);
    const thisMonth = future.filter((r) => r.competition!.start_at! >= monthStart.toISOString());
    const byScope = (s: string) => future.filter((r) => r.competition?.scope === s).length;

    const { count: athletesCount } = await context.supabase
      .from("academy_competition_athletes")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", context.userId);
    const { count: confirmedCount } = await context.supabase
      .from("academy_competition_athletes")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", context.userId)
      .in("status", ["confirmed", "registered"]);
    const { data: finances } = await context.supabase
      .from("academy_competition_finances")
      .select("amount, kind")
      .eq("owner_id", context.userId);
    const totalFinances = (finances ?? []).reduce((sum: number, r) => sum + Number((r as { amount: number | string }).amount || 0), 0);

    const { data: medals } = await context.supabase
      .from("academy_competition_results")
      .select("medal")
      .eq("owner_id", context.userId)
      .not("medal", "is", null);
    const medalCount = { gold: 0, silver: 0, bronze: 0 };
    for (const m of medals ?? []) {
      const v = (m as { medal: string | null }).medal;
      if (v === "gold") medalCount.gold++;
      else if (v === "silver") medalCount.silver++;
      else if (v === "bronze") medalCount.bronze++;
    }

    return {
      futureCount: future.length,
      thisMonthCount: thisMonth.length,
      internationalCount: byScope("international"),
      nationalCount: byScope("national"),
      regionalCount: byScope("regional") + byScope("state") + byScope("municipal"),
      athletesCount: athletesCount ?? 0,
      confirmedCount: confirmedCount ?? 0,
      totalFinances,
      medals: medalCount,
    };
  });
