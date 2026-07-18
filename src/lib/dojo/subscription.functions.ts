// Assinatura SaaS do AMT Dojo Manager — Mercado Pago Assinaturas (preapproval).
// Plano fixo: R$ 69,90/mês, 14 dias de trial para novos cadastros.
// Usa o MERCADOPAGO_ACCESS_TOKEN da própria AMT (não o do dono).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MP_BASE = "https://api.mercadopago.com";

export const PLAN_AMOUNT = 69.9;
export const TRIAL_DAYS = 14;

async function mpAmt<T = any>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!key) throw new Error("MERCADOPAGO_ACCESS_TOKEN da AMT não configurada");
  const res = await fetch(`${MP_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const body = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) {
    const msg = (body && (body.message || body?.cause?.[0]?.description || body.error)) || `MP ${res.status}`;
    throw new Error(String(msg));
  }
  return body as T;
}

/** Retorna a assinatura atual do dono (ou null). */
export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("dojo_subscriptions")
      .select("*")
      .eq("owner_id", context.userId)
      .maybeSingle();

    // Se ainda não existe, cria com trial de 14 dias.
    if (!data) {
      const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data: created } = await context.supabase
        .from("dojo_subscriptions")
        .insert({
          owner_id: context.userId,
          plan_amount: PLAN_AMOUNT,
          currency: "BRL",
          status: "trialing",
          trial_ends_at: trialEnd,
        } as never)
        .select("*")
        .maybeSingle();
      return created;
    }
    return data;
  });

/** Cria (ou reaproveita) um preapproval no MP e retorna init_point para checkout. */
export const startMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: sub } = await context.supabase
      .from("dojo_subscriptions")
      .select("*")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!sub) throw new Error("Assinatura não inicializada");

    const { data: user } = await context.supabase.auth.getUser();
    const email = user.user?.email;
    if (!email) throw new Error("E-mail do dono indisponível");

    const origin = "https://dojomanager.amtfightwear.com.br";
    const backUrl = `${origin}/dojo/app/subscription`;
    const notification = "https://loja.amtfightwear.com.br/api/public/hooks/mercadopago";

    const preapproval = await mpAmt<any>("/preapproval", {
      method: "POST",
      body: JSON.stringify({
        reason: "AMT Dojo Manager — Assinatura mensal",
        external_reference: `dojo_sub:${sub.id}`,
        payer_email: email,
        back_url: backUrl,
        status: "pending",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: PLAN_AMOUNT,
          currency_id: "BRL",
        },
        // Aceita cartão de crédito e saldo em conta Mercado Pago no checkout.
        payment_methods_allowed: {
          payment_types: [{ id: "credit_card" }, { id: "account_money" }],
          payment_methods: [],
        },
        notification_url: notification,
      }),
    });

    await context.supabase
      .from("dojo_subscriptions")
      .update({
        mp_preapproval_id: String(preapproval.id),
        status: "pending",
        last_event: preapproval,
      } as never)
      .eq("id", sub.id);

    return { init_point: preapproval.init_point ?? preapproval.sandbox_init_point };
  });

/** Cancela a assinatura no MP e localmente. */
export const cancelMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: sub } = await context.supabase
      .from("dojo_subscriptions")
      .select("id, mp_preapproval_id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!sub) throw new Error("Sem assinatura");
    if (sub.mp_preapproval_id) {
      try {
        await mpAmt(`/preapproval/${sub.mp_preapproval_id}`, {
          method: "PUT",
          body: JSON.stringify({ status: "cancelled" }),
        });
      } catch (e) {
        // segue e marca localmente
        console.warn("Falha ao cancelar no MP", e);
      }
    }
    await context.supabase
      .from("dojo_subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() } as never)
      .eq("id", sub.id);
    return { ok: true };
  });

/** Sincroniza status do preapproval a partir do MP (usado no retorno do checkout). */
export const syncMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({}).parse(i ?? {}))
  .handler(async ({ context }) => {
    const { data: sub } = await context.supabase
      .from("dojo_subscriptions")
      .select("id, mp_preapproval_id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!sub?.mp_preapproval_id) return { status: null };
    const p = await mpAmt<any>(`/preapproval/${sub.mp_preapproval_id}`);
    const patch: Record<string, any> = { last_event: p };
    if (p.status === "authorized") patch.status = "active";
    else if (p.status === "paused") patch.status = "paused";
    else if (p.status === "cancelled") {
      patch.status = "cancelled";
      patch.cancelled_at = new Date().toISOString();
    }
    if (p.next_payment_date) patch.current_period_end = p.next_payment_date;
    await context.supabase.from("dojo_subscriptions").update(patch as never).eq("id", sub.id);
    return { status: patch.status ?? null };
  });
