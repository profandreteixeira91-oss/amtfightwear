import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Registra o usuário autenticado como DONO de dojo em `dojo_users`.
 *
 * Invariantes:
 * - só grava se a conta não for de aluno (`student_accounts`) nem de colaborador
 *   (`dojo_staff_accounts` / `dojo_team_members` de outro dono);
 * - idempotente (upsert por auth_user_id + owner_id);
 * - roda no servidor — o cliente admin nunca é carregado no navegador.
 */
export const registerDojoOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ name: z.string().trim().max(200).optional() }).parse(data ?? {}),
  )
  .handler(async ({ context, data }) => {
    const userId = context.userId;
    const email = (context.claims?.email as string | undefined) ?? null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [studentRes, staffRes, teamRes] = await Promise.all([
      supabaseAdmin.from("student_accounts").select("id").eq("auth_user_id", userId).limit(1),
      supabaseAdmin.from("dojo_staff_accounts").select("id").eq("auth_user_id", userId).limit(1),
      email
        ? supabaseAdmin.from("dojo_team_members").select("id").eq("email", email).limit(1)
        : Promise.resolve({ data: [] as { id: string }[] }),
    ]);

    if ((studentRes.data ?? []).length > 0) return { registered: false, reason: "student" as const };
    if ((staffRes.data ?? []).length > 0) return { registered: false, reason: "staff" as const };
    if (((teamRes as { data: unknown[] | null }).data ?? []).length > 0) {
      return { registered: false, reason: "staff" as const };
    }

    const { error } = await supabaseAdmin.from("dojo_users").upsert(
      {
        auth_user_id: userId,
        owner_id: userId,
        role: "owner",
        email,
        name: data.name ?? (context.claims?.["full_name"] as string | undefined) ?? null,
        status: "active",
      },
      { onConflict: "auth_user_id, owner_id" },
    );
    if (error) throw new Error(`Não foi possível registrar a conta: ${error.message}`);

    return { registered: true as const };
  });
