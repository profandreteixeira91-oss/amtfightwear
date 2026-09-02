import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStudentAuth } from "@/integrations/supabase/student-auth-middleware";
import { fetchActiveStudent } from "./_me";


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
        // Turma escolhida pelo aluno quando há mais de uma aula na janela atual.
        classId: z
          .string()
          .regex(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
            "Turma inválida",
          )
          .nullish(),
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
    const me = await fetchActiveStudent<{ id: string; owner_id: string; unit_id: string | null; status: string }>(
      context.supabase,
      "id, owner_id, unit_id, status",
    );
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

    // 5) Resolve a turma (janela, matrícula, duplicidade).
    // Se o aluno está no horário de mais de uma turma, devolvemos a lista para
    // que o app exiba o seletor — o check-in é validado após a escolha.
    const { validateAndResolveCheckin } = await import("@/lib/dojo/attendance.functions");
    const validation = await validateAndResolveCheckin(
      supabaseAdmin,
      me.id,
      tokenRow.owner_id,
      false,
      data.classId ?? null,
    );
    if (!validation.isValid) {
      if (validation.reason === "multiple_classes") {
        return {
          ok: false as const,
          error: "MULTIPLE_CLASSES" as const,
          availableClasses: validation.availableClasses ?? [],
        };
      }
      if (validation.reason === "outside_window") {
        throw new Error("Fora da janela permitida para check-in.");
      }
      if (validation.reason === "duplicate_checkin") {
        throw new Error("Você já realizou o check-in desta aula.");
      }
      if (validation.reason === "student_not_enrolled") {
        throw new Error("Você não está matriculado em nenhuma turma.");
      }
      throw new Error("Não há nenhuma aula disponível para check-in neste momento.");
    }

    // 6) Intervalo mínimo: aplica-se apenas a novos check-ins da MESMA turma.
    // Turmas distintas em horários próximos podem receber check-ins próprios.
    const { data: last } = await supabaseAdmin
      .from("dojo_attendance")
      .select("checked_in_at, class_id")
      .eq("student_id", me.id)
      .order("checked_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sameClassAsLast =
      !!last && (last as any).class_id != null && (last as any).class_id === validation.classId;
    const noClassContext = !validation.classId || !last || (last as any).class_id == null;
    if (last?.checked_in_at && (sameClassAsLast || noClassContext)) {
      const diffMin = (Date.now() - new Date(last.checked_in_at).getTime()) / 60000;
      if (diffMin < minInterval) {
        throw new Error(
          `Aguarde ${Math.ceil(minInterval - diffMin)} minuto(s) para um novo check-in.`,
        );
      }
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
        status: "present",
        checked_in_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (attErr) throw new Error(attErr.message);

    return { id: att.id, ok: true };
  });
