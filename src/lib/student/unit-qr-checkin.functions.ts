import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStudentAuth } from "@/integrations/supabase/student-auth-middleware";

// Aluno resgata um QR fixo específico de unidade.
// Regras aplicadas 100% no backend:
//  - Token válido e ativo
//  - Aluno pertence ao mesmo owner do token
//  - Método fixed_qr habilitado nas configurações do dono
//  - Intervalo mínimo entre check-ins respeitado
//  - Turma/aula resolvida via validateAndResolveCheckin (janela e duplicidade)
//  - owner_id e unit_id gravados a partir do token, jamais do cliente
export const checkinByUnitQr = createServerFn({ method: "POST" })
  .middleware([requireStudentAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        token: z
          .string()
          .trim()
          .min(16, "Token inválido")
          .max(128, "Token inválido")
          .regex(/^[a-f0-9]+$/i, "Token inválido"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Resolve o token → owner + unit (bypass RLS pois aluno não pode ler a tabela)
    const { data: tokenRow, error: tErr } = await supabaseAdmin
      .from("dojo_unit_qr_tokens")
      .select("id, owner_id, unit_id, active")
      .eq("token", data.token)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!tokenRow || tokenRow.active !== true) {
      throw new Error("QR inválido ou desativado. Peça ao dono do dojo para regerar.");
    }

    // 2) Identifica o aluno autenticado usando o client com RLS
    const { data: me, error: meErr } = await context.supabase
      .from("dojo_students")
      .select("id, owner_id, unit_id, status")
      .limit(1)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me) throw new Error("Aluno não encontrado");

    // 3) Aluno pertence ao mesmo dono do QR
    if (me.owner_id !== tokenRow.owner_id) {
      throw new Error("Este QR pertence a outra academia.");
    }

    // 4) Método habilitado + intervalo
    const { data: settings } = await supabaseAdmin
      .from("dojo_checkin_settings")
      .select("min_interval_minutes, allow_fixed_qr_checkin")
      .eq("owner_id", tokenRow.owner_id)
      .maybeSingle();
    const allowFixedQr = (settings as any)?.allow_fixed_qr_checkin ?? true;
    if (!allowFixedQr) {
      throw new Error("O check-in por QR fixo está desativado nesta academia.");
    }
    const minInterval = (settings as any)?.min_interval_minutes ?? 30;

    const { data: last } = await supabaseAdmin
      .from("dojo_attendance")
      .select("checked_in_at")
      .eq("student_id", me.id)
      .order("checked_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last?.checked_in_at) {
      const diffMin = (Date.now() - new Date(last.checked_in_at).getTime()) / 60000;
      if (diffMin < minInterval) {
        throw new Error(
          `Aguarde ${Math.ceil(minInterval - diffMin)} minuto(s) para um novo check-in.`,
        );
      }
    }

    // 5) Resolve a turma (janela, matrícula, duplicidade)
    const { validateAndResolveCheckin } = await import("@/lib/dojo/attendance.functions");
    const validation = await validateAndResolveCheckin(
      supabaseAdmin,
      me.id,
      tokenRow.owner_id,
    );
    if (!validation.isValid) {
      if (validation.reason === "outside_window") {
        throw new Error("Fora da janela permitida para check-in.");
      }
      if (validation.reason === "duplicate_checkin") {
        throw new Error("Você já realizou o check-in desta aula.");
      }
      if (validation.reason === "multiple_classes") {
        throw new Error("Múltiplas aulas disponíveis agora. Use outro método para escolher a turma.");
      }
      if (validation.reason === "student_not_enrolled") {
        throw new Error("Você não está matriculado em nenhuma turma.");
      }
      throw new Error("Não há nenhuma aula disponível para check-in neste momento.");
    }

    // 6) Grava a presença — owner_id e unit_id vêm do token no servidor.
    const { data: att, error: attErr } = await supabaseAdmin
      .from("dojo_attendance")
      .insert({
        student_id: me.id,
        owner_id: tokenRow.owner_id,
        unit_id: tokenRow.unit_id,
        class_id: validation.classId,
        method: "fixed_qr",
        source: "student_app",
        status: "checked_in",
        checked_in_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (attErr) throw new Error(attErr.message);

    return { id: att.id, ok: true };
  });
