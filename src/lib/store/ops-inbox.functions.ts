import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSaasOwner } from "@/lib/auth/is-saas-owner";
import { todayISO } from "@/lib/dates";

/**
 * Contadores de pendências da Central AMT (tela Início).
 *
 * Só contagens (`head: true`), sem trafegar linhas. As definições espelham
 * as telas de destino para que o número do Início bata com o da fila:
 * - Produção: aberto = estágio ≠ "finalizado"; atrasado = prazo < hoje.
 * - Suporte: mesmo requisito de papel `amt_admin` de `adminListTickets`
 *   (sem o papel, o contador volta `null` em vez de ampliar o acesso).
 */
export type OpsInbox = {
  orders: { pendingPayment: number; toShip: number; inProduction: number };
  quotes: { sent: number; approved: number };
  production: { open: number; late: number; dueToday: number };
  chats: { human: number };
};

/** Pedidos aguardando pagamento só contam se recentes — os antigos são abandono, não pendência. */
const PENDING_PAYMENT_WINDOW_DAYS = 7;

export const adminGetOpsInbox = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OpsInbox> => {
    await assertSaasOwner(context);
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = todayISO();
    const pendingSince = new Date(
      Date.now() - PENDING_PAYMENT_WINDOW_DAYS * 86400000,
    ).toISOString();

    const count = async (
      q: PromiseLike<{ count: number | null; error: { message: string } | null }>,
    ) => {
      const { count: n, error } = await q;
      if (error) throw new Error(error.message);
      return n ?? 0;
    };

    const orders = () => supabase.from("store_orders").select("id", { count: "exact", head: true });
    const jobs = () =>
      supabase
        .from("store_production_jobs")
        .select("id", { count: "exact", head: true })
        .neq("stage", "finalizado");
    const quotes = () => supabase.from("store_quotes").select("id", { count: "exact", head: true });

    const [
      pendingPayment,
      toShip,
      inProduction,
      quotesSent,
      quotesApproved,
      prodOpen,
      prodLate,
      prodToday,
      chatsHuman,
    ] = await Promise.all([
      count(orders().eq("status", "pending_payment").gte("created_at", pendingSince)),
      count(orders().in("status", ["paid", "preparing"])),
      count(orders().eq("status", "processing")),
      count(quotes().eq("status", "sent")),
      count(quotes().eq("status", "approved")),
      count(jobs()),
      count(jobs().lt("deadline", today)),
      count(jobs().eq("deadline", today)),
      count(
        supabaseAdmin
          .from("sales_conversations")
          .select("id", { count: "exact", head: true })
          .eq("status", "human"),
      ),
    ]);

    return {
      orders: { pendingPayment, toShip, inProduction },
      quotes: { sent: quotesSent, approved: quotesApproved },
      production: { open: prodOpen, late: prodLate, dueToday: prodToday },
      chats: { human: chatsHuman },
    };
  });
