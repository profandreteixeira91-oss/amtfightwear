import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const EmailSchema = z.object({ email: z.string().trim().email().toLowerCase() });

/**
 * Verifica se o e-mail está cadastrado em dojo_students e se o aluno
 * já possui usuário de autenticação vinculado (activated=true).
 * Endpoint público — retorna apenas booleanos, sem PII.
 */
export const checkStudentAccess = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EmailSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: student } = await supabaseAdmin
      .from("dojo_students")
      .select("id, user_id, status")
      .ilike("email", data.email)
      .maybeSingle();
    if (!student) return { exists: false as const, activated: false as const, blocked: false as const };
    const blocked = student.status && !["active", "trial", "invited"].includes(student.status);
    return {
      exists: true as const,
      activated: !!student.user_id,
      blocked: !!blocked,
    };
  });

const ActivateSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres"),
});

/**
 * Primeiro acesso: cria o usuário de autenticação (email/senha) e
 * vincula ao dojo_students.user_id. Só funciona se o aluno existir
 * e ainda não tiver user_id.
 */
export const activateStudentAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ActivateSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: student, error: sErr } = await supabaseAdmin
      .from("dojo_students")
      .select("id, user_id, full_name, email, owner_id")
      .ilike("email", data.email)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!student) throw new Error("E-mail não cadastrado. Fale com sua academia.");
    if (student.user_id) throw new Error("Este aluno já criou uma senha. Faça login normalmente.");

    // Cria o usuário no Auth já confirmado (dono da academia já validou o cadastro).
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: student.full_name, dojo_student_id: student.id },
    });
    if (cErr || !created.user) {
      // Se já existe usuário auth mas não estava vinculado, tenta vincular.
      if (cErr?.message?.toLowerCase().includes("already")) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers();
        const existing = list.users.find((u) => u.email?.toLowerCase() === data.email);
        if (!existing) throw new Error(cErr.message);
        // Atualiza a senha do usuário existente
        await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          password: data.password,
          email_confirm: true,
        });
        await supabaseAdmin.from("dojo_students").update({ user_id: existing.id }).eq("id", student.id);
        return { ok: true as const };
      }
      throw new Error(cErr?.message ?? "Falha ao criar conta");
    }

    const { error: linkErr } = await supabaseAdmin
      .from("dojo_students")
      .update({ user_id: created.user.id })
      .eq("id", student.id);
    if (linkErr) throw new Error(linkErr.message);

    return { ok: true as const };
  });
