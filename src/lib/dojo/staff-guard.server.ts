/**
 * Núcleo de autorização do Portal do Professor (equipe).
 *
 * Invariantes:
 * - a identidade da equipe vem SEMPRE de `dojo_staff_session()` (security
 *   definer, chaveada por `auth.uid()` e restrita a `status = 'active'`);
 * - o `owner_id` (dojo pai) NUNCA vem do cliente — é derivado da sessão;
 * - toda escrita exige nível `write` no módulo correspondente;
 * - nenhuma rota/função do professor aceita `owner_id` como entrada.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  canAccess,
  resolveStaffPermissions,
  type AccessLevel,
  type PermissionMap,
} from "@/lib/dojo/permissions";
import type { Database } from "@/integrations/supabase/types";

export type StaffContext = {
  account_id: string;
  member_id: string | null;
  owner_id: string;
  role: string | null;
  full_name: string | null;
  email: string;
  permissions: PermissionMap;
};

export class StaffAuthError extends Error {}
export class StaffPermissionError extends Error {}

/** Resolve a sessão de equipe do usuário autenticado ou lança erro tratável. */
export async function requireStaff(
  supabase: SupabaseClient<Database>,
): Promise<StaffContext> {
  const { data, error } = await supabase.rpc("dojo_staff_session");
  if (error) throw new StaffAuthError(error.message);
  const row = (Array.isArray(data) ? data[0] : null) as
    | {
        account_id: string;
        member_id: string | null;
        owner_id: string;
        role: string | null;
        full_name: string | null;
        email: string;
        status: string | null;
        permissions: PermissionMap | null;
      }
    | null;
  if (!row) {
    throw new StaffAuthError(
      "Acesso restrito à equipe: nenhuma conta ativa vinculada a um dojo foi encontrada.",
    );
  }
  return {
    account_id: row.account_id,
    member_id: row.member_id,
    owner_id: row.owner_id,
    role: row.role,
    full_name: row.full_name,
    email: row.email,
    permissions: resolveStaffPermissions(row.permissions, row.role),
  };
}

