import { createServerFn } from "@tanstack/react-start";
import { requireStoreOwner } from "@/lib/auth/owner-middleware";
import { SAAS_OWNER_EMAIL } from "@/lib/auth/is-saas-owner";
import type { Profile } from "@/services/profileService";

/**
 * Usuários com acesso ao /admin (time da AMT): o dono do SaaS e quem tem o papel
 * amt_admin. O login é compartilhado com a loja e o Dojo Manager, então a tabela
 * profiles tem também clientes, donos de academia e alunos — esses não entram.
 */
export const listPlatformUsers = createServerFn({ method: "GET" })
  .middleware([requireStoreOwner])
  .handler(async (): Promise<Profile[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "amt_admin");
    if (rolesErr) throw new Error(rolesErr.message);
    const ids = new Set((roles ?? []).map((r) => r.user_id as string));

    const { data: ownerProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", SAAS_OWNER_EMAIL)
      .maybeSingle();
    if (ownerProfile?.id) ids.add(ownerProfile.id as string);

    if (ids.size === 0) return [];
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .in("id", [...ids])
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Profile[];
  });
