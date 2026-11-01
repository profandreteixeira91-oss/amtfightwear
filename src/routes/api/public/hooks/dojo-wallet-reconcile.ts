import { createFileRoute } from "@tanstack/react-router";
import { checkInternalHookAuth } from "@/lib/security/hook-auth";

/**
 * Cron: conciliação diária da carteira AMT Pay.
 *
 * - Libera recebimentos `pending` cujo `available_at <= now()`.
 * - Faz polling dos saques `processing` sem webhook recente e converge status.
 *
 * Autenticação: checkInternalHookAuth (CRON_SECRET ou apikey do projeto).
 */
export const Route = createFileRoute("/api/public/hooks/dojo-wallet-reconcile")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = checkInternalHookAuth(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { releasePendingReceipts, reconcileWithdrawals } = await import(
          "@/lib/dojo/payments/withdrawals.server"
        );

        const [release, reconcile] = await Promise.all([
          releasePendingReceipts(supabaseAdmin),
          reconcileWithdrawals(supabaseAdmin),
        ]);

        return Response.json({
          ok: true,
          released: release.released,
          reconciled: reconcile,
          ts: new Date().toISOString(),
        });
      },
      GET: async () => Response.json({ ok: true, hint: "POST with apikey to run" }),
    },
  },
});
