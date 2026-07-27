import type { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Super admin da plataforma (dono do SaaS).
 * Autorizado a acessar painéis /admin (métricas, catálogo, growth), mas
 * NÃO herda acesso a dados de tenants (dojos) — RLS por owner_id segue valendo.
 */
export const SAAS_OWNER_EMAIL = "profandreteixeira91@gmail.com";

type Ctx = {
  supabase: ReturnType<typeof createClient<Database>>;
  userId: string;
  claims?: Record<string, unknown> | null;
};

export async function isSaasOwner(context: Ctx): Promise<boolean> {
  const email = (context.claims?.email as string | undefined)?.toLowerCase() ?? null;
  if (email === SAAS_OWNER_EMAIL) return true;
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "amt_admin" as never,
  });
  return Boolean(data);
}

export async function assertSaasOwner(context: Ctx) {
  if (!(await isSaasOwner(context))) throw new Error("Forbidden");
}
