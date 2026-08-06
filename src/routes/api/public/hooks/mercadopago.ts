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
        const storeSecret = process.env.STORE_MERCADOPAGO_WEBHOOK_SECRET;
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        // Conta MP exclusiva da loja AMT Fight Wear.
        const storeAccessToken = process.env.STORE_MERCADOPAGO_ACCESS_TOKEN;

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

        // Verificação de assinatura (não falha se nenhum webhook secret estiver definido — útil no primeiro setup)
        // Aceita a assinatura da conta AMT Pay OU da conta da loja.
        const secrets = [secret, storeSecret].filter((s): s is string => Boolean(s));
        if (secrets.length) {
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
          const ok = secrets.some((s) => {
            try {
              const expected = createHmac("sha256", s).update(manifest).digest("hex");
              const a = Buffer.from(v1);
              const b = Buffer.from(expected);
              return a.length === b.length && timingSafeEqual(a, b);
            } catch {
              return false;
            }
          });
          if (!ok) return new Response("Invalid signature", { status: 401 });
        }

        const type = payload?.type ?? payload?.topic ?? "";
        const paymentId = String(payload?.data?.id ?? dataId ?? "");
        if (!paymentId) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // ============================================================
        // FLUXO A: Assinaturas SaaS (Preapproval) — token AMT
        // ============================================================
        if (String(type).includes("preapproval") || String(type).includes("subscription")) {
          const token = storeAccessToken || accessToken;
          if (!token) return new Response("ok");
          const res = await fetch(`https://api.mercadopago.com/preapproval/${paymentId}`, {
            headers: { Authorization: `Bearer ${token}` },
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
          if (pre.status === "authorized") {
            patch.status = "active";
            if (pre.next_payment_date) patch.current_period_end = pre.next_payment_date;
          } else if (pre.status === "paused") {
            patch.status = "paused";
          } else if (pre.status === "cancelled") {
            patch.status = "cancelled";
            patch.cancelled_at = new Date().toISOString();
          }
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
        // FLUXO B: Pagamentos avulsos (loja + Pix/mensalidades)
        // A loja usa a conta MP própria; o AMT Pay/Dojo usa a conta central.
        // Tentamos os tokens disponíveis até encontrar o pagamento.
        // ============================================================
        const tokens = [storeAccessToken, accessToken].filter((t): t is string => Boolean(t));
        if (!tokens.length) return new Response("ok");

        let payment: any = null;
        for (const token of tokens) {
          const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            payment = await res.json();
            break;
          }
        }
        if (!payment) return new Response("ok");

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

        let updatedOrderId: string | null =
          orderId && !String(orderId).startsWith("dojo_invoice:") ? String(orderId) : null;

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
        
        // Fluxo 1.5: Assinatura SaaS do Dojo Manager via PIX
        const isDojoSubPix = String(orderId ?? "").startsWith("dojo_sub_pix:") || String(orderId ?? "").startsWith("dojo_sub_pix_payment:");
        if (isDojoSubPix) {
          const subId = String(orderId).includes(":") ? String(orderId).split(":")[1] : null;
          if (subId && status === "approved") {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            
            await supabaseAdmin.from("dojo_subscriptions").update({
              status: "active",
              current_payment_status: "approved",
              current_period_end: nextMonth.toISOString(),
              next_due_date: nextMonth.toISOString().split("T")[0],
              last_event: payment,
            } as never).eq("id", subId);
          } else if (subId) {
            // Atualiza status pendente/falho se necessário
            await supabaseAdmin.from("dojo_subscriptions").update({
              current_payment_status: status,
              last_event: payment,
            } as never).eq("id", subId);
          }
          return new Response("ok");
        }

        // Fluxo 2: mensalidades do Dojo Manager (dojo_invoices) — SPLIT
        const isDojoInvoice = String(orderId ?? "").startsWith("dojo_invoice:");
        const invoiceId = isDojoInvoice
          ? String(orderId).slice("dojo_invoice:".length)
          : null;
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
              const ownerId = (invRow as any).owner_id as string;
              const gross = Number(payment.transaction_amount ?? (invRow as any).amount ?? 0);
              const mpFee = Number(
                payment?.fee_details?.reduce?.((s: number, f: any) => s + Number(f?.amount ?? 0), 0) ??
                  0,
              );

              // Split idempotente: só processa se ainda não existir
              const { data: existingSplit } = await supabaseAdmin
                .from("dojo_split_transactions")
                .select("id")
                .eq("mp_payment_id", paymentId)
                .maybeSingle();

              if (!existingSplit) {
                // Carrega config de split (padrão: 5% + R$ 0 para AMT)
                const { data: cfg } = await supabaseAdmin
                  .from("dojo_split_config")
                  .select("*")
                  .eq("owner_id", ownerId)
                  .maybeSingle();
                const amtPercent = Number((cfg as any)?.amt_percent ?? 5);
                const amtFixed = Number((cfg as any)?.amt_fixed_fee ?? 0);

                const amtFee = Number(
                  (gross * (amtPercent / 100) + amtFixed).toFixed(2),
                );
                const dojoNet = Number((gross - mpFee - amtFee).toFixed(2));

                const { data: splitRow } = await supabaseAdmin
                  .from("dojo_split_transactions")
                  .insert({
                    owner_id: ownerId,
                    invoice_id: matchedInvoiceId,
                    mp_payment_id: paymentId,
                    operation_type: "invoice",
                    gross_amount: gross,
                    mp_fee_amount: mpFee,
                    amt_fee_amount: amtFee,
                    dojo_net_amount: dojoNet,
                    amt_percent_applied: amtPercent,
                    amt_fixed_applied: amtFixed,
                    status: "approved",
                    paid_at: new Date().toISOString(),
                    raw: payment,
                  } as never)
                  .select("id")
                  .single();

                // Credita carteira interna do dojo
                const method = (() => {
                  const t = String(payment.payment_type_id ?? "").toLowerCase();
                  if (t.includes("pix")) return "pix";
                  if (t.includes("credit") || t.includes("debit") || t.includes("card"))
                    return "card";
                  if (t.includes("ticket") || t.includes("boleto")) return "boleto";
                  return "link";
                })();

                await supabaseAdmin.from("dojo_wallet_transactions").insert({
                  owner_id: ownerId,
                  student_id: (invRow as any).student_id,
                  kind: "receipt",
                  method,
                  status: "available",
                  amount: gross,
                  direction: 1,
                  fee_amount: mpFee + amtFee,
                  net_amount: dojoNet,
                  description: `Mensalidade ${(invRow as any).description ?? ""}`.trim(),
                  reference_type: "invoice",
                  reference_id: matchedInvoiceId,
                  provider: "amt_pay",
                  provider_tx_id: paymentId,
                  split_transaction_id: (splitRow as any)?.id ?? null,
                } as never);
              }

              // Notificação in-app
              await supabaseAdmin
                .from("dojo_student_notifications")
                .insert({
                  student_id: (invRow as any).student_id,
                  owner_id: ownerId,
                  type: "invoice_paid",
                  title: "Pagamento confirmado",
                  body: `Recebemos R$ ${Number((invRow as any).amount).toFixed(2)} — ${(invRow as any).description ?? "Mensalidade"}.`,
                } as never);
              try {
                const { sendPushToStudent } = await import("@/lib/push/push.server");
                await sendPushToStudent((invRow as any).student_id, {
                  title: "Pagamento confirmado ✓",
                  body: `R$ ${Number((invRow as any).amount).toFixed(2)} — obrigado!`,
                  url: "/app/finance",
                  tag: `inv-${matchedInvoiceId}`,
                }, "payment_received");
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
