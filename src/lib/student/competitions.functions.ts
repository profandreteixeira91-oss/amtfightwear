// Visão do aluno: lista competições liberadas pela sua academia, detalhes,
// interesse/confirmação e envio de documentos. Sempre escopado por RLS
// (get_my_student_owner_id / get_my_student_id).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStudentAuth } from "@/integrations/supabase/student-auth-middleware";

const uuid = z.string().regex(/^[0-9a-fA-F-]{32,36}$/);

export const listStudentCompetitions = createServerFn({ method: "GET" })
  .middleware([requireStudentAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("academy_competitions")
      .select("*, competition:competitions(*)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getStudentCompetition = createServerFn({ method: "POST" })
  .middleware([requireStudentAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("academy_competitions")
      .select("*, competition:competitions(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Competição não encontrada");

    const { data: me } = await context.supabase
      .from("dojo_students")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let athlete: any = null;
    if (me?.id) {
      const { data: at } = await context.supabase
        .from("academy_competition_athletes")
        .select("*")
        .eq("academy_competition_id", data.id)
        .eq("student_id", me.id)
        .maybeSingle();
      athlete = at;
    }

    const { data: hotels } = await context.supabase
      .from("academy_competition_hotels")
      .select("name, address, check_in, check_out, phone")
      .eq("academy_competition_id", data.id);
    const { data: transport } = await context.supabase
      .from("academy_competition_transport")
      .select("kind, departure_at, return_at, driver, seats")
      .eq("academy_competition_id", data.id);

    return { row, athlete, hotels: hotels ?? [], transport: transport ?? [] };
  });

export const setMyInterest = createServerFn({ method: "POST" })
  .middleware([requireStudentAuth])
  .inputValidator((i: unknown) =>
    z.object({
      academy_competition_id: uuid,
      status: z.enum(["interested", "confirmed", "cancelled"]),
      category: z.string().optional().nullable(),
      weight_class: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: me, error: meErr } = await context.supabase
      .from("dojo_students")
      .select("id, owner_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me) throw new Error("Aluno não encontrado");

    const payload = {
      owner_id: me.owner_id,
      academy_competition_id: data.academy_competition_id,
      student_id: me.id,
      status: data.status,
      category: data.category ?? null,
      weight_class: data.weight_class ?? null,
      notes: data.notes ?? null,
    };
    const { data: row, error } = await context.supabase
      .from("academy_competition_athletes")
      .upsert(payload as never, { onConflict: "academy_competition_id,student_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const uploadMyCompetitionDocument = createServerFn({ method: "POST" })
  .middleware([requireStudentAuth])
  .inputValidator((i: unknown) =>
    z.object({
      academy_competition_id: uuid,
      kind: z.string(),
      title: z.string().min(1),
      file_url: z.string().url().optional().nullable(),
      notes: z.string().optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("dojo_students")
      .select("id, owner_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!me) throw new Error("Aluno não encontrado");
    const { data: row, error } = await context.supabase
      .from("academy_competition_documents")
      .insert({
        owner_id: me.owner_id,
        academy_competition_id: data.academy_competition_id,
        student_id: me.id,
        kind: data.kind,
        title: data.title,
        file_url: data.file_url ?? null,
        notes: data.notes ?? null,
      } as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
