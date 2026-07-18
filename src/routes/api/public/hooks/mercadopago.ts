import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Webhook do Mercado Pago.
 * Validação de assinatura (HMAC-SHA256):
 *   manifest = `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 *   header x-signature = "ts=<ts>,v1=<hash>"
 * Secret: MERCADOPAGO_WEBHOOK_SECRET.
 */
export const Route = createFileRoute("/api/public/hooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

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

        // Verificação de assinatura (não falha se o webhook secret não estiver definido — útil no primeiro setup)
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
          const expected = createHmac("sha256", secret).update(manifest).digest("hex");
          try {
            const a = Buffer.from(v1);
            const b = Buffer.from(expected);
            if (a.length !== b.length || !timingSafeEqual(a, b)) {
              return new Response("Invalid signature", { status: 401 });
            }
          } catch {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        const type = payload?.type ?? payload?.topic ?? "";
        const paymentId = String(payload?.data?.id ?? dataId ?? "");
        if (!paymentId) return new Response("ok");

        // Ignora tópicos não-pagamento (merchant_order, plan, etc.)
        if (type && !String(type).includes("payment")) return new Response("ok");

        if (!accessToken) return new Response("ok");

        // Busca o pagamento na API para obter status e externalReference
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return new Response("ok");
        const payment = await res.json();

        const status = String(payment.status ?? "").toLowerCase();
        const orderId = payment.external_reference ?? null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const patch: Record<string, any> = { payment_raw: payment };

        if (status === "approved") {
          patch.payment_status = "paid";
          patch.status = "paid";
        } else if (status === "refunded") {
          patch.payment_status = "refunded";
        } else if (["cancelled", "rejected"].includes(status)) {
          patch.payment_status = "failed";
        } else if (status === "charged_back") {
          patch.payment_status = "refunded";
        } else if (status === "in_process" || status === "pending" || status === "authorized") {
          patch.payment_status = "pending";
        }

        let updatedOrderId: string | null = orderId;
        if (orderId) {
          await supabaseAdmin.from("store_orders").update(patch as never).eq("id", orderId);
        } else {
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
        }

        return new Response("ok");
      },
    },
  },
});
