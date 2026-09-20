/**
 * Exclusão definitiva de um aluno.
 *
 * Invariante: matrícula cancelada => nenhum registro do aluno permanece no
 * sistema e o acesso ao app do aluno deixa de existir.
 *
 * A maior parte das tabelas filhas usa ON DELETE CASCADE; as que usam
 * ON DELETE SET NULL são apagadas explicitamente aqui para não deixar
 * registros órfãos do aluno.
 */

/** Tabelas com FK ON DELETE SET NULL para dojo_students.id. */
const SET_NULL_CHILD_TABLES = [
  "academy_competition_documents",
  "academy_competition_finances",
  "academy_competition_results",
  "academy_competition_staff",
  "academy_competition_athletes",
  "dojo_detected_faces",
  "dojo_store_cart_items",
  "dojo_store_order_items",
  "dojo_sales",
] as const;

export type PurgeStudentResult = {
  student_id: string;
  full_name: string | null;
  deleted_access: number;
  deleted_auth_user: boolean;
  deleted_files: number;
};

export async function purgeStudentCompletely(studentId: string): Promise<PurgeStudentResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: student, error: findErr } = await supabaseAdmin
    .from("dojo_students")
    .select("id, owner_id, full_name, photo_url")
    .eq("id", studentId)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);
  if (!student) throw new Error("Aluno não encontrado");

  // 1) Acessos ao app do aluno vinculados a esta ficha
  const { data: accounts } = await supabaseAdmin
    .from("student_accounts")
    .select("id, auth_user_id")
    .eq("student_id", studentId);
  const authUserIds = Array.from(
    new Set((accounts ?? []).map((a) => a.auth_user_id).filter((v): v is string => Boolean(v))),
  );

  // 2) Arquivos do aluno no armazenamento (fotos de perfil / referência)
  let deletedFiles = 0;
  try {
    const { data: files } = await supabaseAdmin.storage
      .from("dojo-students")
      .list(student.owner_id ?? "", { limit: 1000 });
    const paths = (files ?? [])
      .filter((f) => f.name.includes(studentId))
      .map((f) => `${student.owner_id}/${f.name}`);
    if (paths.length > 0) {
      await supabaseAdmin.storage.from("dojo-students").remove(paths);
      deletedFiles = paths.length;
    }
  } catch (e) {
    console.warn("[student-purge] storage cleanup failed", e);
  }

  // 3) Registros que não seriam apagados em cascata
  for (const table of SET_NULL_CHILD_TABLES) {
    const { error } = await supabaseAdmin.from(table).delete().eq("student_id", studentId);
    if (error) console.warn(`[student-purge] ${table}`, error.message);
  }

  // 4) Ficha do aluno — cascata apaga presenças, mensalidades, contratos,
  //    graduações, avisos, notificações, turmas, acessos, push, etc.
  const { error: delErr } = await supabaseAdmin.from("dojo_students").delete().eq("id", studentId);
  if (delErr) throw new Error(delErr.message);

  // 5) Conta de autenticação do app: só removida quando não sobrou nenhuma
  //    outra ficha vinculada (um e-mail pode responder por vários alunos).
  let deletedAuthUser = false;
  for (const uid of authUserIds) {
    const { data: remaining } = await supabaseAdmin
      .from("student_accounts")
      .select("id")
      .eq("auth_user_id", uid)
      .limit(1);
    if ((remaining ?? []).length > 0) continue;
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) {
      console.warn("[student-purge] auth delete failed", error.message);
      continue;
    }
    deletedAuthUser = true;
  }

  return {
    student_id: studentId,
    full_name: student.full_name ?? null,
    deleted_access: (accounts ?? []).length,
    deleted_auth_user: deletedAuthUser,
    deleted_files: deletedFiles,
  };
}
