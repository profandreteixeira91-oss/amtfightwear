import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "dojo-fight-videos";

async function assertStudent(supabase: any, userId: string, studentId: string, allowMine = false) {
  const { data, error } = await supabase
    .from("dojo_students")
    .select("id, owner_id")
    .eq("id", studentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Aluno não encontrado");
  if (data.owner_id !== userId) {
    if (allowMine) {
      const { data: isMine } = await supabase.rpc("is_my_student", { _id: studentId });
      if (isMine) return;
    }
    throw new Error("Sem permissão");
  }
}


// -------- List videos + notes --------
export const listFightVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ studentId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStudent(supabase, userId, data.studentId);
    const { data: videos, error } = await supabase
      .from("dojo_fight_videos")
      .select("id, title, description, opponent, event_name, video_date, duration_seconds, storage_path, content_type, size_bytes, created_at")
      .eq("student_id", data.studentId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (videos ?? []).map((v: any) => v.id);
    const notesByVideo: Record<string, any[]> = {};
    if (ids.length) {
      const { data: notes } = await supabase
        .from("dojo_fight_video_notes")
        .select("id, video_id, timestamp_seconds, title, note, category, created_at")
        .in("video_id", ids)
        .order("timestamp_seconds", { ascending: true });
      for (const n of notes ?? []) {
        (notesByVideo[n.video_id] ||= []).push(n);
      }
    }
    // Signed URLs
    const withUrls = await Promise.all((videos ?? []).map(async (v: any) => {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(v.storage_path, 60 * 60 * 6);
      return { ...v, url: signed?.signedUrl ?? null, notes: notesByVideo[v.id] ?? [] };
    }));
    return withUrls;
  });

// -------- Register uploaded video --------
export const createFightVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    studentId: z.string().uuid(),
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional().nullable(),
    opponent: z.string().max(200).optional().nullable(),
    event_name: z.string().max(200).optional().nullable(),
    video_date: z.string().optional().nullable(),
    duration_seconds: z.number().optional().nullable(),
    storage_path: z.string().min(3).max(500),
    content_type: z.string().max(100).optional().nullable(),
    size_bytes: z.number().optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStudent(supabase, userId, data.studentId);
    if (!data.storage_path.startsWith(`${userId}/`)) throw new Error("Caminho inválido");
    const { data: row, error } = await supabase
      .from("dojo_fight_videos")
      .insert({
        owner_id: userId,
        student_id: data.studentId,
        title: data.title,
        description: data.description ?? null,
        opponent: data.opponent ?? null,
        event_name: data.event_name ?? null,
        video_date: data.video_date ?? null,
        duration_seconds: data.duration_seconds ?? null,
        storage_path: data.storage_path,
        content_type: data.content_type ?? null,
        size_bytes: data.size_bytes ?? null,
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { id: row?.id };
  });

// -------- Delete video --------
export const deleteFightVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("dojo_fight_videos")
      .select("id, owner_id, storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (!row || row.owner_id !== userId) throw new Error("Sem permissão");
    await supabase.storage.from(BUCKET).remove([row.storage_path]);
    const { error } = await supabase.from("dojo_fight_videos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Update video metadata --------
export const updateFightVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional().nullable(),
    opponent: z.string().max(200).optional().nullable(),
    event_name: z.string().max(200).optional().nullable(),
    video_date: z.string().optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...rest } = data;
    const { error } = await supabase
      .from("dojo_fight_videos")
      .update(rest)
      .eq("id", id)
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Notes --------
export const addFightVideoNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    video_id: z.string().uuid(),
    timestamp_seconds: z.number().min(0),
    title: z.string().max(200).optional().nullable(),
    note: z.string().min(1).max(4000),
    category: z.string().max(60).optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: v } = await supabase
      .from("dojo_fight_videos")
      .select("id, owner_id, student_id, title")
      .eq("id", data.video_id)
      .maybeSingle();
    if (!v || v.owner_id !== userId) throw new Error("Sem permissão");
    const { data: row, error } = await supabase
      .from("dojo_fight_video_notes")
      .insert({
        owner_id: userId,
        video_id: data.video_id,
        timestamp_seconds: data.timestamp_seconds,
        title: data.title ?? null,
        note: data.note,
        category: data.category ?? null,
      })
      .select("id, video_id, timestamp_seconds, title, note, category, created_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    try {
      const { safeNotifyStudent } = await import("@/lib/push/push.server");
      safeNotifyStudent((v as any).student_id, {
        title: "Nova análise de luta 🥊",
        body: `Seu professor adicionou um comentário em "${(v as any).title ?? "seu vídeo"}".`,
        url: "/app/videos",
        tag: `fight-note-${row?.id ?? data.video_id}`,
      }, "new_video");
    } catch {}
    return row;
  });

export const updateFightVideoNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid(),
    timestamp_seconds: z.number().min(0).optional(),
    title: z.string().max(200).optional().nullable(),
    note: z.string().min(1).max(4000).optional(),
    category: z.string().max(60).optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...rest } = data;
    const { error } = await supabase
      .from("dojo_fight_video_notes")
      .update(rest)
      .eq("id", id)
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFightVideoNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("dojo_fight_video_notes")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
