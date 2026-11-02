import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Webhook do Mercado Pago — pedidos da loja AMT Fight Wear (conta STORE_*).
 *
 * Validação de assinatura (HMAC-SHA256):
 *   manifest = `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 *   header x-signature = "ts=<ts>,v1=<hash>"
 * Secret: STORE_MERCADOPAGO_WEBHOOK_SECRET.
 *
 * O status nunca vem do corpo da notificação: o pagamento é sempre relido na API
 * do Mercado Pago com o token da loja.
 */
export const Route = createFileRoute("/api/public/hooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STORE_MERCADOPAGO_WEBHOOK_SECRET;
        const accessToken = process.env.STORE_MERCADOPAGO_ACCESS_TOKEN;

        const url = new URL(request.url);
        const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
        const rawSig = request.headers.get("x-signature") ?? "";
        const requestId = request.headers.get("x-request-id") ?? "";

        const bodyText = await request.text();
        let payload: any = null;
        try {
          payload = bodyText ? JSON.parse(bodyText) : null;
        } catch {
          return new Response("Bad Request", { status: 400 });
        }

        // Sem secret configurado a assinatura não é checada (primeiro setup); o
        // pagamento continua sendo relido na API, então um aviso falso não muda nada.
        if (secret) {
          const parts = Object.fromEntries(
            rawSig.split(",").map((p) => {
              const [k, v] = p.trim().split("=");
              return [k, v];
            }),
          );
          const ts = parts.ts ?? "";
          const v1 = parts.v1 ?? "";
          const effectiveId = dataId ?? payload?.data?.id ?? "";
          const manifest = `id:${effectiveId};request-id:${requestId};ts:${ts};`;
          let ok = false;
          try {
            const expected = createHmac("sha256", secret).update(manifest).digest("hex");
            const a = Buffer.from(v1);
            const b = Buffer.from(expected);
            ok = a.length === b.length && timingSafeEqual(a, b);
          } catch {
            ok = false;
          }
          if (!ok) return new Response("Invalid signature", { status: 401 });
        }

        const type = payload?.type ?? payload?.topic ?? "";
        const paymentId = String(payload?.data?.id ?? dataId ?? "");
        if (!paymentId || !accessToken) return new Response("ok");
        // Só pagamentos interessam à loja (merchant_order, plan etc. são ignorados).
        if (type && !String(type).includes("payment")) return new Response("ok");

        const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return new Response("ok");
        const payment: any = await res.json();

        const status = String(payment.status ?? "").toLowerCase();
        const orderId = payment.external_reference ? String(payment.external_reference) : null;

        const patch: Record<string, any> = { payment_raw: payment };
        if (status === "approved") {
          patch.payment_status = "paid";
          patch.status = "paid";
        } else if (status === "refunded" || status === "charged_back") {
          patch.payment_status = "refunded";
        } else if (["cancelled", "rejected"].includes(status)) {
          patch.payment_status = "failed";
        } else if (status === "in_process" || status === "pending" || status === "authorized") {
          patch.payment_status = "pending";
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let updatedOrderId: string | null = null;
        if (orderId) {
          const { data: row } = await supabaseAdmin
            .from("store_orders")
            .update(patch as never)
            .eq("id", orderId)
            .select("id")
            .maybeSingle();
          updatedOrderId = (row as { id: string } | null)?.id ?? null;
        }
        if (!updatedOrderId) {
          const { data: row } = await supabaseAdmin
            .from("store_orders")
            .update(patch as never)
            .eq("mp_payment_id", paymentId)
            .select("id")
            .maybeSingle();
          updatedOrderId = (row as { id: string } | null)?.id ?? null;
        }

        if (updatedOrderId && patch.payment_status === "paid") {
          const { sendWhatsAppOrderStatus } = await import("@/lib/store/whatsapp.server");
          await sendWhatsAppOrderStatus(updatedOrderId, "paid");
          const { createOrderNotification } = await import("@/lib/store/notifications.server");
          await createOrderNotification(updatedOrderId, "paid");
        }

        return new Response("ok");
      },
    },
  },
});
