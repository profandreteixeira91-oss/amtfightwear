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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // ============================================================
        // FLUXO A: Assinaturas SaaS (Preapproval) — token AMT
        // ============================================================
        if (String(type).includes("preapproval") || String(type).includes("subscription")) {
          if (!accessToken) return new Response("ok");
          const res = await fetch(`https://api.mercadopago.com/preapproval/${paymentId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!res.ok) return new Response("ok");
          const pre = await res.json();
          const extRef = String(pre.external_reference ?? "");
          const subLocalId = extRef.startsWith("dojo_sub:") ? extRef.slice("dojo_sub:".length) : null;
          const patch: Record<string, any> = { last_event: pre };
          if (pre.status === "authorized") patch.status = "active";
          else if (pre.status === "paused") patch.status = "paused";
          else if (pre.status === "cancelled") {
            patch.status = "cancelled";
            patch.cancelled_at = new Date().toISOString();
          }
          if (pre.next_payment_date) patch.current_period_end = pre.next_payment_date;
          if (subLocalId) {
            await supabaseAdmin.from("dojo_subscriptions").update(patch as never).eq("id", subLocalId);
          } else {
            await supabaseAdmin
              .from("dojo_subscriptions")
              .update(patch as never)
              .eq("mp_preapproval_id", String(pre.id));
          }
          return new Response("ok");
        }

        // Ignora outros tópicos não-pagamento (merchant_order, plan, etc.)
        if (type && !String(type).includes("payment")) return new Response("ok");

        // ============================================================
        // FLUXO B: Pagamentos avulsos (loja + Pix de mensalidades)
        // ============================================================
        // Descobre qual token usar: se o external_reference for de dojo_invoice,
        // busca o token do dono; senão usa o accessToken global (loja AMT).
        let effectiveToken = accessToken;
        // Primeiro tenta identificar a fatura pelo payment_id local (para descobrir o dono)
        const { data: preInv } = await supabaseAdmin
          .from("dojo_invoices")
          .select("owner_id")
          .eq("payment_id", paymentId)
          .maybeSingle();
        if (preInv?.owner_id) {
          const { data: gw } = await supabaseAdmin
            .from("dojo_payment_gateways")
            .select("access_token")
            .eq("owner_id", preInv.owner_id)
            .eq("provider", "mercadopago")
            .eq("active", true)
            .maybeSingle();
          if (gw?.access_token) effectiveToken = gw.access_token;
        }
        if (!effectiveToken) return new Response("ok");

        // Busca o pagamento na API para obter status e externalReference
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${effectiveToken}` },
        });
        if (!res.ok) return new Response("ok");
        const payment = await res.json();

        const status = String(payment.status ?? "").toLowerCase();
        const orderId = payment.external_reference ?? null;

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

        let updatedOrderId: string | null = orderId && !String(orderId).startsWith("dojo_invoice:")
          ? String(orderId)
          : null;

        // Fluxo 1: pedidos da loja
        if (updatedOrderId) {
          await supabaseAdmin.from("store_orders").update(patch as never).eq("id", updatedOrderId);
        } else if (!String(orderId ?? "").startsWith("dojo_invoice:")) {
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

        // Fluxo 2: mensalidades do Dojo Manager (dojo_invoices)
        const isDojoInvoice = String(orderId ?? "").startsWith("dojo_invoice:");
        const invoiceId = isDojoInvoice ? String(orderId).slice("dojo_invoice:".length) : null;
        let matchedInvoiceId: string | null = invoiceId;
        if (!matchedInvoiceId) {
          const { data: invRow } = await supabaseAdmin
            .from("dojo_invoices")
            .select("id")
            .eq("payment_id", paymentId)
            .maybeSingle();
          matchedInvoiceId = (invRow as { id: string } | null)?.id ?? null;
        }
        if (matchedInvoiceId) {
          const invPatch: Record<string, any> = {};
          if (status === "approved") {
            invPatch.status = "paid";
            invPatch.paid_at = new Date().toISOString();
          } else if (["cancelled", "rejected"].includes(status)) {
            invPatch.status = "canceled";
          }
          if (Object.keys(invPatch).length) {
            const { data: invRow } = await supabaseAdmin
              .from("dojo_invoices")
              .update(invPatch as never)
              .eq("id", matchedInvoiceId)
              .select("id, student_id, owner_id, amount, description")
              .maybeSingle();

            if (invRow && invPatch.status === "paid") {
              // Notificação in-app
              await supabaseAdmin
                .from("dojo_student_notifications")
                .insert({
                  student_id: (invRow as any).student_id,
                  owner_id: (invRow as any).owner_id,
                  type: "invoice_paid",
                  title: "Pagamento confirmado",
                  body: `Recebemos R$ ${Number((invRow as any).amount).toFixed(2)} — ${(invRow as any).description ?? "Mensalidade"}.`,
                } as never);
              // Push
              try {
                const { sendPushToStudent } = await import("@/lib/push/push.server");
                await sendPushToStudent((invRow as any).student_id, {
                  title: "Pagamento confirmado ✓",
                  body: `R$ ${Number((invRow as any).amount).toFixed(2)} — obrigado!`,
                  url: "/app/finance",
                  tag: `inv-${matchedInvoiceId}`,
                });
              } catch {
                /* noop */
              }
            }
          }
        }

        return new Response("ok");
      },
    },
  },
});
