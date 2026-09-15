import { createServerFn } from "@tanstack/react-start";
import { requireStudentAuth } from "@/integrations/supabase/student-auth-middleware";
import { fetchActiveStudent } from "./_me";

/**
 * Retorna se o acesso do aluno ao app está bloqueado pela regra do plano
 * "Bloquear acesso após X dias corridos do vencimento".
 * A referência é a mensalidade VENCIDA mais antiga.
 */
export const getMyAccessBlock = createServerFn({ method: "GET" })
  .middleware([requireStudentAuth])
  .handler(async ({ context }) => {
    const me = await fetchActiveStudent<{ id: string }>(context.supabase, "id");
    if (!me) return { blocked: false as const, daysLate: 0, message: null };

    const { evaluateFinancialBlock, LOGIN_BLOCK_MESSAGE } = await import(
      "@/lib/dojo/financial-block.server"
    );
    const status = await evaluateFinancialBlock(context.supabase, me.id);
    return {
      blocked: status.loginBlocked,
      daysLate: status.daysLate,
      message: status.loginBlocked ? LOGIN_BLOCK_MESSAGE : null,
    };
  });
