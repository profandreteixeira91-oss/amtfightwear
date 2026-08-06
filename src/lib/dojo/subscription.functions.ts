// Assinatura SaaS do AMT Dojo Manager — Mercado Pago Assinaturas (preapproval).
// Plano fixo: R$ 69,90/mês, 14 dias de trial para novos cadastros.
// Usa o MERCADOPAGO_ACCESS_TOKEN da própria AMT (não o do dono).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MP_BASE = "https://api.mercadopago.com";

/**
 * Customização visual do Checkout do Mercado Pago.
 * Nota: A API de preapproval (assinaturas) tem suporte limitado a temas comparada ao Checkout Pro (preferences),
 * mas podemos definir cores e logo nas configurações da aplicação no painel MP ou via API quando disponível.
 */
const MP_DESIGN_CONFIG = {
  main_color: "#DC2626", // Vermelho Dojo (primary)
  logo: "https://amtfightwear.com.br/amt-logo-red.png", // URL absoluta do logo
};

export const PLAN_AMOUNT = 99.9;
export const TRIAL_DAYS = 14;

async function mpAmt<T = any>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!key) throw new Error("MERCADOPAGO_ACCESS_TOKEN da AMT não configurada");

  // Headers base
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
    ...(init?.headers as Record<string, string> ?? {}),
  };

  // O Mercado Pago exige X-Idempotency-Key em POST e PUT.
  // Geramos uma chave baseada no timestamp se não for fornecida.
  if ((init?.method === "POST" || init?.method === "PUT") && !headers["X-Idempotency-Key"]) {
    headers["X-Idempotency-Key"] = `amt-idemp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  const res = await fetch(`${MP_BASE}${path}`, {
    ...init,
    headers,
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
          current_period_end: null, // Garante que começa nulo até o primeiro pagamento
        } as never)
        .select("*")
        .maybeSingle();
      return created;
    }
    return data;
  });

/** Cria (ou reaproveita) um preapproval no MP e retorna init_point para checkout externo (fallback). */
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
    const notification = "https://amtfightwear.com.br/api/public/hooks/mercadopago";

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
+        // Customização visual baseada no design do Dojo Manager
+        theme: {
+          elements_color: MP_DESIGN_CONFIG.main_color,
+          header_color: "#000000",
+        },
        payment_methods_allowed: {
          payment_types: [{ id: "credit_card" }, { id: "account_money" }, { id: "pix" }],
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

/** Retorna a public key do Mercado Pago para uso client-side (tokenização de cartão). */
export const getMpPublicKey = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const key = process.env.MERCADOPAGO_PUBLIC_KEY;
    if (!key) throw new Error("MERCADOPAGO_PUBLIC_KEY não configurada");
    return { publicKey: key };
  });

/**
 * Checkout nativo: recebe um card_token_id gerado pelo SDK MP no browser
 * e cria o preapproval já AUTORIZADO (sem redirect ao site do MP).
 */
export const subscribeWithCardToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        cardTokenId: z.string().min(4),
        payerEmail: z.string().email().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: sub } = await context.supabase
      .from("dojo_subscriptions")
      .select("*")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!sub) throw new Error("Assinatura não inicializada");

    const { data: userRes } = await context.supabase.auth.getUser();
    const email = data.payerEmail || userRes.user?.email;
    if (!email) throw new Error("E-mail do dono indisponível");

    const notification = "https://amtfightwear.com.br/api/public/hooks/mercadopago";
    const origin = "https://dojomanager.amtfightwear.com.br";
    const backUrl = `${origin}/dojo/app/subscription`;

    console.log("[subscribeWithCardToken] Criando preapproval no MP...");
    const preapproval = await mpAmt<any>("/preapproval", {
      method: "POST",
      body: JSON.stringify({
        reason: "AMT Dojo Manager — Assinatura mensal",
        external_reference: `dojo_sub:${sub.id}`,
        payer_email: email,
        card_token_id: data.cardTokenId,
        back_url: backUrl,
        status: "authorized",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: PLAN_AMOUNT,
          currency_id: "BRL",
        },
        notification_url: notification,
      }),
    });

    console.log("[subscribeWithCardToken] Resposta MP:", { id: preapproval.id, status: preapproval.status });

    if (!preapproval.id) {
      throw new Error("O Mercado Pago não retornou um ID de assinatura válido.");
    }

    const patch: Record<string, any> = {
      mp_preapproval_id: String(preapproval.id),
      last_event: preapproval,
    };
    if (preapproval.status === "authorized") patch.status = "active";
    else if (preapproval.status === "pending") patch.status = "pending";
    if (preapproval.next_payment_date) patch.current_period_end = preapproval.next_payment_date;

    await context.supabase
      .from("dojo_subscriptions")
      .update(patch as never)
      .eq("id", sub.id);

    return { status: patch.status ?? preapproval.status, id: String(preapproval.id) };
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

/**
 * Lista pagamentos da assinatura do Dojo Manager (mensalidades do sistema)
 * direto da API do Mercado Pago. Não confundir com faturas de mensalidade
 * dos alunos (essas ficam em `dojo_invoices`).
 */
export const listMySubscriptionPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: sub } = await context.supabase
      .from("dojo_subscriptions")
      .select("id, mp_preapproval_id, status, plan_amount, current_period_end, trial_ends_at")
      .eq("owner_id", context.userId)
      .maybeSingle();

    const upcoming: any[] = [];
    if (sub?.current_period_end && (sub.status === "active" || sub.status === "trialing")) {
      upcoming.push({
        id: `next-${sub.id}`,
        description: "Próxima mensalidade — AMT Dojo Manager",
        amount: Number(sub.plan_amount ?? PLAN_AMOUNT),
        due_date: sub.current_period_end,
        paid_at: null,
        method: "Mercado Pago",
        status: sub.status === "trialing" ? "trial" : "scheduled",
        payment_link: null,
      });
    }

    if (!sub?.mp_preapproval_id) {
      return { paid: [] as any[], pending: upcoming };
    }

    let results: any[] = [];
    try {
      const r = await mpAmt<any>(
        `/authorized_payments/search?preapproval_id=${encodeURIComponent(sub.mp_preapproval_id)}&limit=50&sort=date_created:desc`,
      );
      results = Array.isArray(r?.results) ? r.results : [];
    } catch (e) {
      console.warn("Falha ao listar pagamentos MP", e);
    }

    const paid: any[] = [];
    const pending: any[] = [...upcoming];
    for (const p of results) {
      const status: string = String(p.status ?? p.payment_status ?? "").toLowerCase();
      const amount = Number(p.transaction_amount ?? p.summarized?.charged_amount ?? sub.plan_amount ?? PLAN_AMOUNT);
      const due = p.debit_date || p.date_created || p.last_modified;
      const paidAt = status === "approved" ? (p.payment?.date_approved || p.last_modified || due) : null;
      const row = {
        id: String(p.id ?? p.payment_id ?? `${sub.mp_preapproval_id}-${due}`),
        description: p.reason || "Mensalidade AMT Dojo Manager",
        amount,
        due_date: due,
        paid_at: paidAt,
        method: "Mercado Pago",
        status,
        payment_link: null,
      };
      if (status === "approved") paid.push(row);
      else pending.push(row);
    }
    return { paid, pending };
  });

/**
 * Inicia uma assinatura via PIX.
 * O MP não possui "assinatura por PIX" nativa no /preapproval para contas BR (geralmente exige cartão ou saldo).
 * Vamos criar um pagamento pontual e marcar localmente para processar via webhook/cron ou renovação manual
 * para simular a recorrência ou usar o preapproval se permitido.
 */
export const subscribeWithPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        payerEmail: z.string().email(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: sub } = await context.supabase
      .from("dojo_subscriptions")
      .select("*")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!sub) throw new Error("Assinatura não inicializada");

    const notification = "https://amtfightwear.com.br/api/public/hooks/mercadopago";

    // Criamos uma assinatura (preapproval) específica para PIX.
    // Isso habilita o fluxo de Pix Automático onde o MP gerencia a recorrência.
    const origin = "https://dojomanager.amtfightwear.com.br";
    const backUrl = `${origin}/dojo/app/subscription`;

    const preapproval = await mpAmt<any>("/preapproval", {
      method: "POST",
      body: JSON.stringify({
        reason: "AMT Dojo Manager — Assinatura mensal (Pix Automático)",
        external_reference: `dojo_sub_pix:${sub.id}`,
        payer_email: data.payerEmail,
        back_url: backUrl,
        status: "pending",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: PLAN_AMOUNT,
          currency_id: "BRL",
        },
        payment_methods_allowed: {
          payment_types: [{ id: "pix" }, { id: "credit_card" }, { id: "account_money" }],
          payment_methods: [],
        },
        notification_url: notification,
      }),
    });

    const patch: Record<string, any> = {
      mp_preapproval_id: String(preapproval.id),
      last_event: preapproval,
    };
    if (preapproval.status === "authorized") patch.status = "active";
    else if (preapproval.status === "pending") patch.status = "pending";
    if (preapproval.next_payment_date) patch.current_period_end = preapproval.next_payment_date;

    await context.supabase
      .from("dojo_subscriptions")
      .update(patch as never)
      .eq("id", sub.id);

    return {
      id: String(preapproval.id),
      initPoint: preapproval.init_point ?? preapproval.sandbox_init_point,
      qrCode: preapproval.payment_methods_allowed?.payment_types?.[0]?.id === "pix" ? preapproval.id : null, // MP preapproval não retorna QR direto no POST
    };
  });

