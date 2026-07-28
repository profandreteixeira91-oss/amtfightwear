// Server functions para inscrever/desinscrever o dispositivo do aluno em Web Push.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStudentAuth } from "@/integrations/supabase/student-auth-middleware";

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { key: process.env.VAPID_PUBLIC_KEY ?? "" };
});

const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(10),
  auth: z.string().min(4),
  user_agent: z.string().max(500).optional(),
});

export const subscribeMyPush = createServerFn({ method: "POST" })
  .middleware([requireStudentAuth])
  .inputValidator((i: unknown) => SubscribeSchema.parse(i))
  .handler(async ({ data, context }) => {
    // Registra a inscrição para TODOS os alunos que este login legitimamente
    // possui (mesmo e-mail / mesmo user_id). Assim, um dispositivo compartilhado
    // (ex.: pai/filho no mesmo celular) recebe pushes de qualquer um deles,
    // independentemente de qual esteja selecionado no seletor.
    const { data: mine, error: listErr } = await context.supabase.rpc("list_my_students");
    if (listErr) throw new Error(listErr.message);
    const rows = (mine ?? []) as Array<{ id: string; owner_id: string }>;
    if (rows.length === 0) throw new Error("Aluno não encontrado");

    const payload = rows.map((s) => ({
      student_id: s.id,
      owner_id: s.owner_id,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
      user_agent: data.user_agent ?? null,
    }));

    const { error } = await context.supabase
      .from("dojo_push_subscriptions")
      .upsert(payload as never, { onConflict: "endpoint,student_id" });
    if (error) throw new Error(error.message);
    return { ok: true, students: rows.length };
  });

export const unsubscribeMyPush = createServerFn({ method: "POST" })
  .middleware([requireStudentAuth])
  .inputValidator((i: unknown) => z.object({ endpoint: z.string().url() }).parse(i))
  .handler(async ({ data, context }) => {
    // Remove a inscrição deste endpoint para todos os alunos deste login.
    const { error } = await context.supabase
      .from("dojo_push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
