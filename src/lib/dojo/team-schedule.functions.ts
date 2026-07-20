import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

// ============ ESCALA (view consolidada) ============

export const listTeamSchedule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        from: z.string(), // YYYY-MM-DD
        to: z.string(),
        teacher_id: uuid.nullable().optional(),
        unit_id: uuid.nullable().optional(),
        modality: z.string().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("dojo_team_schedule_view")
      .select("*")
      .gte("occurrence_date", data.from)
      .lte("occurrence_date", data.to)
      .order("occurrence_date")
      .order("start_time");

    if (data.teacher_id) {
      // Filtrar por professor efetivo (titular ou substituto)
      q = q.or(
        `class_teacher_id.eq.${data.teacher_id},substitute_teacher_id.eq.${data.teacher_id},original_teacher_id.eq.${data.teacher_id}`,
      );
    }
    if (data.unit_id) q = q.eq("unit_id", data.unit_id);
    if (data.modality) q = q.eq("modality", data.modality);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============ GERAÇÃO DE OCORRÊNCIAS ============
// Materializa ocorrências das aulas recorrentes dentro do intervalo.

export const generateOccurrences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        from: z.string(),
        to: z.string(),
        class_id: uuid.nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    // 1. Buscar schedules ativos
    let schedulesQ = context.supabase
      .from("dojo_class_schedules")
      .select("id, class_id, weekday, start_time, end_time, owner_id, dojo_classes!inner(status)")
      .eq("owner_id", context.userId);
    if (data.class_id) schedulesQ = schedulesQ.eq("class_id", data.class_id);

    const { data: schedules, error } = await schedulesQ;
    if (error) throw new Error(error.message);

    const active = (schedules ?? []).filter(
      (s: any) => s.dojo_classes?.status === "active",
    );

    // 2. Iterar entre from-to e criar registros (idempotente por unique key)
    const rows: any[] = [];
    const start = new Date(data.from + "T00:00:00Z");
    const end = new Date(data.to + "T00:00:00Z");
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const wd = d.getUTCDay(); // 0-6
      for (const s of active) {
        if (Number(s.weekday) !== wd) continue;
        const dateStr = d.toISOString().slice(0, 10);
        rows.push({
          owner_id: context.userId,
          class_id: s.class_id,
          schedule_id: s.id,
          occurrence_date: dateStr,
          start_time: s.start_time,
          end_time: s.end_time,
          status: "scheduled",
        });
      }
    }

    if (rows.length === 0) return { created: 0 };

    const { error: upErr } = await context.supabase
      .from("dojo_class_occurrences")
      .upsert(rows, { onConflict: "class_id,occurrence_date,schedule_id", ignoreDuplicates: true });
    if (upErr) throw new Error(upErr.message);

    return { created: rows.length };
  });

// ============ SUBSTITUIÇÃO ============

const substituteSchema = z.object({
  occurrence_id: uuid,
  substitute_teacher_id: uuid,
  reason: z.enum(["ferias", "licenca", "evento", "competicao", "afastamento", "emergencia", "outro"]),
  reason_detail: z.string().max(500).nullable().optional(),
  // Se true: aplica também às próximas ocorrências da mesma aula até period_end
  apply_to_period: z.boolean().optional(),
  period_end: z.string().nullable().optional(),
});

export const substituteTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => substituteSchema.parse(i))
  .handler(async ({ data, context }) => {
    // 1. Buscar ocorrência
    const { data: occ, error: occErr } = await context.supabase
      .from("dojo_class_occurrences")
      .select("id, class_id, occurrence_date, original_teacher_id, dojo_classes!inner(teacher_id)")
      .eq("id", data.occurrence_id)
      .maybeSingle();
    if (occErr) throw new Error(occErr.message);
    if (!occ) throw new Error("Ocorrência não encontrada");

    // 2. Congelar professor original (se ainda não estava)
    const originalTeacherId =
      (occ as any).original_teacher_id ?? (occ as any).dojo_classes?.teacher_id ?? null;

    const affectedOccurrenceIds: string[] = [data.occurrence_id];

    // Aplicar em período se solicitado
    if (data.apply_to_period && data.period_end) {
      const { data: futureOccs } = await context.supabase
        .from("dojo_class_occurrences")
        .select("id")
        .eq("class_id", (occ as any).class_id)
        .gte("occurrence_date", (occ as any).occurrence_date)
        .lte("occurrence_date", data.period_end);
      for (const fo of futureOccs ?? []) {
        if (!affectedOccurrenceIds.includes(fo.id)) affectedOccurrenceIds.push(fo.id);
      }
    }

    // 3. Atualizar cada ocorrência
    const { error: updErr } = await context.supabase
      .from("dojo_class_occurrences")
      .update({
        original_teacher_id: originalTeacherId,
        substitute_teacher_id: data.substitute_teacher_id,
        substitute_reason: data.reason,
        substitute_reason_detail: data.reason_detail ?? null,
        substituted_at: new Date().toISOString(),
        substituted_by: context.userId,
      })
      .in("id", affectedOccurrenceIds);
    if (updErr) throw new Error(updErr.message);

    // 4. Registrar histórico permanente (uma linha por ocorrência)
    const rows = affectedOccurrenceIds.map((oid) => ({
      owner_id: context.userId,
      original_teacher_id: originalTeacherId,
      substitute_teacher_id: data.substitute_teacher_id,
      class_id: (occ as any).class_id,
      occurrence_id: oid,
      scope: data.apply_to_period ? "period" : "occurrence",
      period_start: (occ as any).occurrence_date,
      period_end: data.period_end ?? (occ as any).occurrence_date,
      reason: data.reason,
      reason_detail: data.reason_detail ?? null,
      created_by: context.userId,
    }));
    const { error: histErr } = await context.supabase
      .from("dojo_team_substitutions")
      .insert(rows);
    if (histErr) throw new Error(histErr.message);

    return { ok: true, affected: affectedOccurrenceIds.length };
  });

export const revertSubstitution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ occurrence_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_class_occurrences")
      .update({
        substitute_teacher_id: null,
        substitute_reason: null,
        substitute_reason_detail: null,
        substituted_at: null,
        substituted_by: null,
      })
      .eq("id", data.occurrence_id);
    if (error) throw new Error(error.message);

    // NÃO apaga histórico: apenas marca no registro que foi revertida
    await context.supabase
      .from("dojo_team_substitutions")
      .update({ metadata: { reverted: true, reverted_at: new Date().toISOString() } })
      .eq("occurrence_id", data.occurrence_id);

    return { ok: true };
  });

export const listSubstitutions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        teacher_id: uuid.nullable().optional(),
        limit: z.number().int().positive().max(200).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("dojo_team_substitutions")
      .select(
        "*, original_teacher:dojo_team_members!dojo_team_substitutions_original_teacher_id_fkey(id, full_name, photo_url), substitute_teacher:dojo_team_members!dojo_team_substitutions_substitute_teacher_id_fkey(id, full_name, photo_url), dojo_classes(id, name, modality)",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);

    if (data.teacher_id) {
      q = q.or(`original_teacher_id.eq.${data.teacher_id},substitute_teacher_id.eq.${data.teacher_id}`);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
