// Exclusão definitiva de colaboradores da equipe.
// Apaga a ficha (cascata: folha, pagamentos, presenças, documentos, assinaturas,
// histórico, contratos e conta do Portal da Equipe), remove os arquivos do
// colaborador no storage e revoga o usuário de autenticação quando ele não
// responder por nenhum outro acesso do sistema.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PurgeTeamMemberResult = {
  member_id: string;
  full_name: string | null;
  deleted_staff_accounts: number;
  deleted_auth_user: boolean;
  deleted_files: number;
};

const DOCS_BUCKET = "ig-media";

async function removeMemberFiles(memberId: string): Promise<number> {
  const prefix = `team/${memberId}`;
  const { data, error } = await supabaseAdmin.storage.from(DOCS_BUCKET).list(prefix, { limit: 1000 });
  if (error || !data?.length) return 0;
  const paths = data.map((f) => `${prefix}/${f.name}`);
  const { error: rmErr } = await supabaseAdmin.storage.from(DOCS_BUCKET).remove(paths);
  if (rmErr) {
    console.warn("[team-purge] falha ao remover arquivos", rmErr.message);
    return 0;
  }
  return paths.length;
}

async function authUserStillInUse(authUserId: string, excludeStaffIds: string[]): Promise<boolean> {
  const [staff, student, dojoUser, member] = await Promise.all([
    supabaseAdmin.from("dojo_staff_accounts").select("id").eq("auth_user_id", authUserId),
    supabaseAdmin.from("student_accounts").select("id").eq("auth_user_id", authUserId).limit(1),
    supabaseAdmin.from("dojo_users").select("id").eq("auth_user_id", authUserId).limit(1),
    supabaseAdmin.from("dojo_team_members").select("id").eq("user_id", authUserId).limit(1),
  ]);
  const remainingStaff = (staff.data ?? []).filter((r) => !excludeStaffIds.includes(r.id));
  return (
    remainingStaff.length > 0 ||
    (student.data ?? []).length > 0 ||
    (dojoUser.data ?? []).length > 0 ||
    (member.data ?? []).length > 0
  );
}

/**
 * Apaga completamente um colaborador do dono informado.
 * @throws quando a ficha não pertence ao dono (isolamento multi-tenant).
 */
export async function purgeTeamMemberCompletely(
  memberId: string,
  ownerId: string,
): Promise<PurgeTeamMemberResult> {
  const { data: member, error } = await supabaseAdmin
    .from("dojo_team_members")
    .select("id, owner_id, full_name, user_id")
    .eq("id", memberId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!member) throw new Error("Colaborador não encontrado");
  if (member.owner_id !== ownerId) throw new Error("Colaborador não pertence a esta academia");

  const { data: staffAccounts } = await supabaseAdmin
    .from("dojo_staff_accounts")
    .select("id, auth_user_id")
    .eq("member_id", memberId);

  const staffIds = (staffAccounts ?? []).map((s) => s.id);
  const authIds = new Set<string>();
  for (const s of staffAccounts ?? []) if (s.auth_user_id) authIds.add(s.auth_user_id);
  if (member.user_id) authIds.add(member.user_id);

  const deletedFiles = await removeMemberFiles(memberId);

  // Cascata cobre folha, pagamentos, presenças, documentos, assinaturas,
  // histórico, contratos e contas do portal. Referências de aulas/planos
  // ficam com professor nulo (ON DELETE SET NULL), preservando o histórico da turma.
  const { error: delErr } = await supabaseAdmin.from("dojo_team_members").delete().eq("id", memberId);
  if (delErr) throw new Error(delErr.message);

  let deletedAuthUser = false;
  for (const uid of authIds) {
    if (await authUserStillInUse(uid, staffIds)) continue;
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (authErr) console.warn("[team-purge] falha ao remover usuário de acesso", authErr.message);
    else deletedAuthUser = true;
  }

  return {
    member_id: memberId,
    full_name: member.full_name ?? null,
    deleted_staff_accounts: staffIds.length,
    deleted_auth_user: deletedAuthUser,
    deleted_files: deletedFiles,
  };
}
