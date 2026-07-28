import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertOwnership(supabase: any, userId: string, studentId: string) {
  const { data } = await supabase
    .from("dojo_students")
    .select("id, owner_id")
    .eq("id", studentId)
    .maybeSingle();
  if (!data) throw new Error("Aluno não encontrado");
  if (data.owner_id !== userId) {
    const { data: isMine } = await supabase.rpc("is_my_student", { _id: studentId });
    if (isMine) return data;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Sem permissão");
  }
  return data;
}


// ---------- Fundamentos (por modalidade) ----------
export const listFundamentals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ modality: z.string().trim().min(1).optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("dojo_technical_fundamentals")
      .select("*")
      .eq("owner_id", userId)
      .eq("archived", false);
    if (data.modality) q = q.eq("modality", data.modality);
    const { data: rows, error } = await q
      .order("modality", { ascending: true })
      .order("order_index", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertFundamental = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        modality: z.string().trim().min(1),
        name: z.string().trim().min(1).max(120),
        description: z.string().trim().max(500).optional().nullable(),
        orderIndex: z.number().int().min(0).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload: any = {
      owner_id: userId,
      modality: data.modality,
      name: data.name,
      description: data.description ?? null,
      order_index: data.orderIndex ?? 0,
    };
    if (data.id) {
      const { error } = await supabase
        .from("dojo_technical_fundamentals")
        .update(payload)
        .eq("id", data.id)
        .eq("owner_id", userId);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabase
      .from("dojo_technical_fundamentals")
      .insert(payload)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true, id: row?.id };
  });

export const deleteFundamental = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("dojo_technical_fundamentals")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Semeia um conjunto padrão de fundamentos para a modalidade, se ainda não houver
export const seedDefaultFundamentals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ modality: z.string().trim().min(1) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { count } = await supabase
      .from("dojo_technical_fundamentals")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("modality", data.modality);
    if ((count ?? 0) > 0) return { seeded: 0 };

    const presets: Record<string, string[]> = {
      "jiu-jitsu": ["Guarda", "Passagem de guarda", "Raspagem", "Finalização", "Defesa pessoal", "Escapes", "Condicionamento"],
      "judo": ["Nage-waza (projeções)", "Katame-waza (solo)", "Kumi-kata (pegadas)", "Ukemi (quedas)", "Tai-sabaki", "Randori", "Kata"],
      "muay-thai": ["Boxe", "Chutes", "Joelhos", "Cotovelos", "Clinch", "Esquivas", "Condicionamento"],
      "boxe": ["Jab", "Direto", "Cruzado", "Uppercut", "Esquivas", "Footwork", "Guarda"],
      "mma": ["Striking", "Wrestling", "Jiu-jitsu", "Clinch", "Ground and pound", "Condicionamento"],
      "karate": ["Kihon", "Kata", "Kumite", "Chutes", "Socos", "Bloqueios", "Deslocamento"],
      "taekwondo": ["Chutes", "Poomsae", "Kyorugi", "Deslocamento", "Defesa", "Condicionamento"],
    };
    const key = data.modality.toLowerCase().trim();
    const list = presets[key] ?? ["Técnica", "Defesa", "Ataque", "Deslocamento", "Condicionamento"];

    const rows = list.map((name, i) => ({
      owner_id: userId,
      modality: data.modality,
      name,
      order_index: i,
    }));
    const { error } = await supabase.from("dojo_technical_fundamentals").insert(rows);
    if (error) throw new Error(error.message);
    return { seeded: rows.length };
  });

// ---------- Notas do aluno ----------
export const listStudentTechnicalScores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({ studentId: z.string().uuid(), modality: z.string().trim().min(1).optional() })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertOwnership(supabase, userId, data.studentId);

    let fq = supabase
      .from("dojo_technical_fundamentals")
      .select("id, name, description, order_index, modality")
      .eq("owner_id", userId)
      .eq("archived", false);
    if (data.modality) fq = fq.eq("modality", data.modality);
    const { data: funds } = await fq.order("order_index", { ascending: true });

    const ids = (funds ?? []).map((f: any) => f.id);
    const { data: scores } = ids.length
      ? await supabase
          .from("dojo_student_technical_scores")
          .select("id, fundamental_id, score, notes, assessed_at, assessor")
          .eq("student_id", data.studentId)
          .in("fundamental_id", ids)
      : { data: [] as any[] };

    const map = new Map((scores ?? []).map((s: any) => [s.fundamental_id, s]));
    return (funds ?? []).map((f: any) => ({
      fundamental: f,
      score: map.get(f.id) ?? null,
    }));
  });

export const upsertStudentTechnicalScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        studentId: z.string().uuid(),
        fundamentalId: z.string().uuid(),
        score: z.number().min(0).max(10),
        notes: z.string().trim().max(500).optional().nullable(),
        assessor: z.string().trim().max(120).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const owner = await assertOwnership(supabase, userId, data.studentId);
    const payload = {
      owner_id: owner.owner_id,
      student_id: data.studentId,
      fundamental_id: data.fundamentalId,
      score: data.score,
      notes: data.notes ?? null,
      assessor: data.assessor ?? null,
      assessed_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("dojo_student_technical_scores")
      .upsert(payload, { onConflict: "student_id,fundamental_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteStudentTechnicalScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("dojo_student_technical_scores")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Modalidades do atleta (deriva de current_belts + faixa atual)
export const listStudentModalities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ studentId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertOwnership(supabase, userId, data.studentId);
    const { data: s } = await supabase
      .from("dojo_students")
      .select("current_belts, current_belt_id, dojo_belts:current_belt_id(modality)")
      .eq("id", data.studentId)
      .maybeSingle();
    const set = new Set<string>();
    const cb: any = (s as any)?.dojo_belts;
    if (cb?.modality) set.add(String(cb.modality));
    const arr = Array.isArray((s as any)?.current_belts) ? (s as any).current_belts : [];
    for (const it of arr) {
      if (it?.modality) set.add(String(it.modality));
    }
    return Array.from(set);
  });
