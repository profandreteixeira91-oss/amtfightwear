import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/asaas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.ASAAS_WEBHOOK_TOKEN;
        // Asaas envia o token configurado no painel via header `asaas-access-token`
        const provided = request.headers.get("asaas-access-token") ?? request.headers.get("access_token");
        if (token && provided !== token) {
          return new Response("Unauthorized", { status: 401 });
        }

        let payload: any = null;
        try {
          payload = await request.json();
        } catch {
          return new Response("Bad Request", { status: 400 });
        }

        const event = String(payload?.event ?? "");
        const p = payload?.payment;
        if (!p?.id) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const status = String(p.status ?? "").toUpperCase();
        const patch: Record<string, any> = { payment_raw: payload };

        if (
          event === "PAYMENT_CONFIRMED" ||
          event === "PAYMENT_RECEIVED" ||
          ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(status)
        ) {
          patch.payment_status = "paid";
          patch.status = "paid";
        } else if (
          event === "PAYMENT_REFUNDED" ||
          event === "PAYMENT_CHARGEBACK_REQUESTED" ||
          event === "PAYMENT_CHARGEBACK_DISPUTE" ||
          ["REFUNDED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE"].includes(status)
        ) {
          patch.payment_status = "refunded";
        } else if (event === "PAYMENT_OVERDUE" || status === "OVERDUE") {
          patch.payment_status = "overdue";
        } else if (event === "PAYMENT_DELETED" || status === "DELETED") {
          patch.payment_status = "cancelled";
        } else if (status === "REFUSED") {
          patch.payment_status = "failed";
        }

        // Preferir buscar pelo asaas_payment_id; se o pagamento pertence a uma parcela, usar externalReference (order.id)
        const externalRef = p.externalReference ?? null;
        if (externalRef) {
          await supabaseAdmin
            .from("store_orders")
            .update(patch as never)
            .eq("id", externalRef);
        } else {
          await supabaseAdmin
            .from("store_orders")
            .update(patch as never)
            .eq("asaas_payment_id", p.id);
        }

        return new Response("ok");
      },
    },
  },
});
