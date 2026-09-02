import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

/**
 * Portal da Equipe — base de acesso própria.
 *
 * Contrato:
 * - a autenticação da equipe lê EXCLUSIVAMENTE `dojo_staff_accounts`
 *   (criada pelo dono do dojo no módulo Equipe);
 * - nenhuma conta de dono de dojo é reconhecida como equipe, e nenhuma conta
 *   de equipe recebe contexto de dono — os dois logins são independentes;
 * - a tela de login é identificada por um ID/slug do dojo pai, usado apenas
 *   para exibir nome, logotipo e cores da academia.
 */

export type StaffPortalBrand = {
  owner_id: string;
  slug: string | null;
  trade_name: string | null;
  legal_name: string | null;
  logo_url: string | null;
  brand_primary: string | null;
  brand_secondary: string | null;
  city: string | null;
  state: string | null;
};

export type StaffSession = {
  account_id: string;
  member_id: string | null;
  owner_id: string;
  role: string | null;
  full_name: string | null;
  email: string;
  permissions: Record<string, "none" | "read" | "write">;
  academy: StaffPortalBrand | null;
};

/** Identidade pública do dojo pai (nome/logo/cores) por ID ou slug. */
export const getStaffPortalBrand = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ dojo: z.string().min(1).max(120) }).parse(i))
  .handler(async ({ data }): Promise<StaffPortalBrand | null> => {
    const client = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: rows, error } = await client.rpc("get_dojo_staff_portal", {
      _dojo: data.dojo.trim(),
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : null;
    return (row as StaffPortalBrand | undefined) ?? null;
  });

/**
 * Sessão da equipe. Retorna `null` quando o usuário autenticado não possui
 * conta ativa em `dojo_staff_accounts` (inclusive donos de dojo e alunos).
 */
export const getStaffSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffSession | null> => {
    const { data: rows, error } = await context.supabase.rpc("dojo_staff_session");
    if (error) throw new Error(error.message);
    const row = (Array.isArray(rows) ? rows[0] : null) as
      | {
          account_id: string;
          member_id: string | null;
          owner_id: string;
          role: string | null;
          full_name: string | null;
          email: string;
          permissions: Record<string, "none" | "read" | "write"> | null;
        }
      | null;
    if (!row) return null;
    const permissions = resolveStaffPermissions(row.permissions, row.role);

    const { data: brandRows } = await context.supabase.rpc("get_dojo_staff_portal", {
      _dojo: row.owner_id,
    });
    const academy = (Array.isArray(brandRows) ? brandRows[0] : null) as StaffPortalBrand | null;

    return {
      account_id: row.account_id,
      member_id: row.member_id,
      owner_id: row.owner_id,
      role: row.role,
      full_name: row.full_name,
      email: row.email,
      permissions: row.permissions ?? {},
      academy: academy ?? null,
    };
  });

/**
 * Link do Portal da Equipe do dojo autenticado (dono), já identificado pelo
 * slug ou pelo owner_id — é o endereço que o dono envia aos professores.
 */
export const getMyStaffPortalLink = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ dojo: string; path: string } | null> => {
    const { data: profile } = await context.supabase
      .from("dojo_academy_profile")
      .select("owner_id, slug")
      .eq("owner_id", context.userId)
      .maybeSingle();
    const ref = profile?.slug || profile?.owner_id || context.userId;
    return { dojo: ref, path: `/dojo/staff/auth?dojo=${encodeURIComponent(ref)}` };
  });
