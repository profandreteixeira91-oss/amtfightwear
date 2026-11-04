import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { diffDaysISO, dayISO, todayISO } from "@/lib/dates";

/**
 * Central Comercial: pendências do dia calculadas dos dados reais (pedidos,
 * orçamentos, produção, chat do site, Instagram e prospecção). Nada é gravado:
 * cada pendência some sozinha quando a situação que a gerou é resolvida.
 */

export type CommercialPriority = "critica" | "alta" | "media" | "baixa";

export type CommercialTaskType =
  | "orcamento_followup"
  | "orcamento_vencido"
  | "orcamento_aprovado"
  | "orcamento_saldo"
  | "pedido_pagamento"
  | "prazo_producao"
  | "pronto_envio"
  | "envio_sem_entrega"
  | "pos_venda"
  | "chat_site"
  | "instagram"
  | "prospeccao"
  | "oportunidade"
  | "whatsapp_sem_resposta"
  | "whatsapp_retorno";

export type CommercialTask = {
  id: string;
  type: CommercialTaskType;
  priority: CommercialPriority;
  title: string;
  customer: string | null;
  phone: string | null;
  /** Nº do pedido/orçamento ou nome da academia. */
  reference: string | null;
  /** Tela do admin onde a pendência é resolvida. */
  href: string;
  created_at: string | null;
  /** Dia (YYYY-MM-DD) em que a ação vence. */
  due: string | null;
  next_action: string;
  /** Sugestão de mensagem para o WhatsApp (enviada por você, nunca automática). */
  message: string | null;
  amount: number | null;
  /** Conversa do WhatsApp no admin com este contato (responder sem sair do sistema). */
  chat_id?: string | null;
};

export type CommercialCenter = {
  tasks: CommercialTask[];
  /** Prospecções a retomar além das listadas (a lista mostra as de maior pontuação). */
  prospectsHidden: number;
  generatedAt: string;
};

const DAY = 86400000;
const PROSPECT_LIMIT = 15;
const first = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] || "";
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const daysSince = (iso: string | null | undefined) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / DAY) : 0);
const plusDays = (iso: string, days: number) => dayISO(new Date(new Date(iso).getTime() + days * DAY));

/** Calcula as pendências. Recebe o cliente do banco (service role) para poder ser testado fora do servidor. */
export async function buildCommercialCenter(db: SupabaseClient<Database>): Promise<CommercialCenter> {
  const today = todayISO();
  const tasks: CommercialTask[] = [];

  const [quotesRes, ordersRes, jobsRes, chatsRes, igRes, prospectsRes, wholesaleRes, dealsRes] = await Promise.all([
    db
      .from("store_quotes")
      .select("id, quote_number, status, customer_name, customer_company, customer_phone, total, valid_until, created_at, updated_at")
      .neq("status", "draft"),
    db
      .from("store_orders")
      // Todos os pedidos: os já concluídos servem para saber que a produção deles acabou.
      .select("id, order_number, status, customer_name, customer_phone, total, created_at, updated_at, metadata, archived_at, customer_id"),
    db.from("store_production_jobs").select("source, source_id, reference, stage, deadline, customer_name"),
    db
      .from("sales_conversations")
      .select("id, customer_name, customer_phone, last_message_at, created_at")
      .eq("status", "human"),
    db
      .from("ig_conversations")
      .select("id, participant_name, participant_username, unread_count, last_message_at, last_message_preview, created_at")
      .gt("unread_count", 0),
    db
      .from("prospect_companies")
      .select("id, name, phone, city, state, score, last_contacted_at, updated_at, created_at")
      .eq("pipeline_stage", "contato_iniciado")
      .order("score", { ascending: false }),
    // Condição de atacado vem da configuração da loja (nunca fixada aqui).
    db.from("app_settings").select("value").eq("key", "wholesale_settings").maybeSingle(),
    db
      .from("crm_deals")
      .select("id, title, stage, value, next_action, next_action_at, stage_changed_at, created_at, customer_id")
      .not("stage", "in", "(ganho,perdido)"),
  ]);
  for (const r of [quotesRes, ordersRes, jobsRes, chatsRes, igRes, prospectsRes, wholesaleRes, dealsRes]) {
    if (r.error) throw new Error(r.error.message);
  }
  const quotes = quotesRes.data ?? [];
  const orders = ordersRes.data ?? [];
  /** Pedido que já saiu da produção (ou não vai mais ser produzido). */
  const DONE_ORDER = ["shipped", "delivered", "completed", "cancelled", "canceled", "refunded"];
  /** Só orçamento pago (sinal ou total) produz. */
  const PAID_QUOTE = ["paid_50", "paid_100"];
  const jobs = jobsRes.data ?? [];

  // ---------------- Orçamentos ----------------
  for (const q of quotes) {
    const customer = q.customer_company || q.customer_name;
    const base = {
      customer,
      phone: q.customer_phone,
      reference: q.quote_number,
      href: `/admin/orcamentos?status=${q.status}`,
      created_at: q.created_at,
      amount: Number(q.total ?? 0),
    };
    if (q.status === "sent") {
      if (q.valid_until && q.valid_until < today) {
        tasks.push({
          ...base,
          id: `orcamento_vencido:${q.id}`,
          type: "orcamento_vencido",
          priority: "alta",
          title: `Orçamento ${q.quote_number} venceu sem resposta`,
          due: q.valid_until,
          next_action: "Renovar a validade com o cliente ou encerrar o orçamento.",
          message: `Olá, ${first(q.customer_name)}! O orçamento ${q.quote_number} da AMT Fight Wear venceu. Quer que eu renove as condições para você?`,
        });
        continue;
      }
      // Follow-up 24 h após o envio; a partir de 3 dias, segundo contato.
      const sentAt = q.updated_at ?? q.created_at;
      const days = daysSince(sentAt);
      if (Date.now() - new Date(sentAt).getTime() < DAY) continue;
      tasks.push({
        ...base,
        id: `orcamento_followup:${q.id}`,
        type: "orcamento_followup",
        priority: days >= 3 ? "alta" : "media",
        title: `Orçamento ${q.quote_number} enviado há ${days} dia(s) sem retorno`,
        due: plusDays(sentAt, days >= 3 ? 3 : 1),
        next_action: days >= 3
          ? "Segundo contato: entender a objeção e oferecer ajuste de prazo ou condição."
          : "Primeiro follow-up: confirmar se recebeu e se ficou alguma dúvida.",
        message: days >= 3
          ? `Olá, ${first(q.customer_name)}! Passando para saber se conseguiu avaliar o orçamento ${q.quote_number}. Se precisar, ajusto quantidades, prazo ou condição de pagamento.`
          : `Olá, ${first(q.customer_name)}! Conseguiu ver o orçamento ${q.quote_number} que enviei? Fico à disposição para qualquer dúvida.`,
      });
    } else if (q.status === "approved") {
      tasks.push({
        ...base,
        id: `orcamento_aprovado:${q.id}`,
        type: "orcamento_aprovado",
        priority: "alta",
        title: `Orçamento ${q.quote_number} aprovado aguardando pagamento`,
        due: plusDays(q.updated_at ?? q.created_at, 1),
        next_action: "Enviar os dados de pagamento do sinal para liberar a produção.",
        message: `Olá, ${first(q.customer_name)}! Que bom que aprovou o orçamento ${q.quote_number}. Para iniciar a produção, segue o valor do sinal: ${brl(Number(q.total ?? 0) / 2)}.`,
      });
    }
  }

  // ---------------- Produção agrupada por pedido/orçamento ----------------
  type Group = { source: string; source_id: string; reference: string | null; customer: string | null; total: number; open: number; minDeadline: string | null };
  const groups = new Map<string, Group>();
  for (const j of jobs) {
    if (!j.source_id || (j.source !== "order" && j.source !== "quote")) continue;
    const key = `${j.source}:${j.source_id}`;
    const g = groups.get(key) ?? { source: j.source, source_id: j.source_id, reference: j.reference, customer: j.customer_name, total: 0, open: 0, minDeadline: null };
    g.total += 1;
    if (j.stage !== "finalizado") {
      g.open += 1;
      if (j.deadline && (!g.minDeadline || j.deadline < g.minDeadline)) g.minDeadline = j.deadline;
    }
    groups.set(key, g);
  }
  const orderById = new Map(orders.map((o) => [o.id, o]));
  const orderByQuote = new Map(
    orders.flatMap((o) => {
      const qid = (o.metadata as Record<string, unknown> | null)?.["quote_id"];
      return typeof qid === "string" ? [[qid, o] as const] : [];
    }),
  );
  const quoteById = new Map(quotes.map((q) => [q.id, q]));

  for (const g of groups.values()) {
    const order = g.source === "order" ? orderById.get(g.source_id) : orderByQuote.get(g.source_id);
    const quote = g.source === "quote" ? quoteById.get(g.source_id) : undefined;
    // Fila de produção desatualizada de pedido já enviado/concluído não é pendência comercial.
    if ((order && DONE_ORDER.includes(order.status)) || (!order && quote && !PAID_QUOTE.includes(quote.status))) continue;
    const phone = order?.customer_phone ?? quote?.customer_phone ?? null;
    const customer = g.customer ?? order?.customer_name ?? null;
    const href = order ? `/admin/pedidos/${order.id}` : "/admin/producao";

    if (g.open > 0 && g.minDeadline) {
      const left = diffDaysISO(today, g.minDeadline);
      if (left > 2) continue;
      tasks.push({
        id: `prazo_producao:${g.source}:${g.source_id}`,
        type: "prazo_producao",
        priority: left < 0 ? "critica" : left === 0 ? "alta" : "media",
        title: left < 0
          ? `${g.reference ?? "Pedido"} atrasado ${Math.abs(left)} dia(s)`
          : left === 0
            ? `${g.reference ?? "Pedido"} vence hoje`
            : `${g.reference ?? "Pedido"} vence em ${left} dia(s)`,
        customer,
        phone,
        reference: g.reference,
        href: "/admin/producao",
        created_at: order?.created_at ?? quote?.created_at ?? null,
        due: g.minDeadline,
        next_action: left < 0
          ? `Avisar o cliente sobre o novo prazo (${g.open} item(ns) ainda em produção).`
          : `Conferir na produção os ${g.open} item(ns) em aberto.`,
        message: left < 0
          ? `Olá, ${first(customer)}! Seu pedido ${g.reference ?? ""} está na reta final da produção. Já te passo a nova previsão de envio.`
          : null,
        amount: order ? Number(order.total ?? 0) : null,
      });
    } else if (g.open === 0 && order && ["paid", "preparing", "processing"].includes(order.status)) {
      const balanceDue = quote?.status === "paid_50";
      tasks.push({
        id: `pronto_envio:${order.id}`,
        type: balanceDue ? "orcamento_saldo" : "pronto_envio",
        priority: "alta",
        title: balanceDue
          ? `${g.reference ?? order.order_number} pronto: cobrar 50% restante`
          : `${order.order_number} pronto para envio`,
        customer,
        phone,
        reference: g.reference ?? order.order_number,
        href,
        created_at: order.created_at,
        due: today,
        next_action: balanceDue
          ? "Cobrar o saldo de 50% antes de despachar."
          : "Comprar a etiqueta e despachar o pedido.",
        message: balanceDue
          ? `Olá, ${first(customer)}! Seu pedido ficou pronto. Para despacharmos, falta o saldo de ${brl(Number(quote?.total ?? 0) / 2)}.`
          : null,
        amount: Number(order.total ?? 0),
      });
    }
  }

  // ---------------- Pedidos ----------------
  for (const o of orders) {
    if (o.archived_at) continue;
    const href = `/admin/pedidos/${o.id}`;
    const base = { customer: o.customer_name, phone: o.customer_phone, reference: o.order_number, href, created_at: o.created_at, amount: Number(o.total ?? 0) };
    const age = Date.now() - new Date(o.created_at).getTime();
    if (o.status === "pending_payment" && age > 2 * 3600000 && age < 7 * DAY) {
      tasks.push({
        ...base,
        id: `pedido_pagamento:${o.id}`,
        type: "pedido_pagamento",
        priority: "media",
        title: `${o.order_number} aguardando pagamento`,
        due: plusDays(o.created_at, 1),
        next_action: "Lembrar o cliente do pagamento (o Pix pode ter expirado).",
        message: `Olá, ${first(o.customer_name)}! Vi que o pedido ${o.order_number} ainda está aguardando pagamento. Posso te ajudar a finalizar?`,
      });
    } else if (o.status === "shipped" && daysSince(o.updated_at) >= 10) {
      tasks.push({
        ...base,
        id: `envio_sem_entrega:${o.id}`,
        type: "envio_sem_entrega",
        priority: "media",
        title: `${o.order_number} enviado há ${daysSince(o.updated_at)} dias sem entrega confirmada`,
        due: plusDays(o.updated_at, 10),
        next_action: "Atualizar o rastreio e confirmar a entrega com o cliente.",
        message: `Olá, ${first(o.customer_name)}! Seu pedido ${o.order_number} já chegou? Quero confirmar se está tudo certo com a entrega.`,
      });
    } else if (o.status === "delivered") {
      tasks.push({
        ...base,
        id: `pos_venda:${o.id}`,
        type: "pos_venda",
        priority: "baixa",
        title: `Pós-venda do ${o.order_number}`,
        due: plusDays(o.updated_at, 2),
        next_action: "Perguntar se chegou tudo certo e marcar o pedido como Finalizado.",
        message: `Olá, ${first(o.customer_name)}! Seu pedido ${o.order_number} chegou certinho? Conta pra gente o que achou!`,
      });
    }
  }

  // ---------------- Conversas ----------------
  for (const c of chatsRes.data ?? []) {
    tasks.push({
      id: `chat_site:${c.id}`,
      type: "chat_site",
      priority: "alta",
      title: "Chat do site aguardando atendimento humano",
      customer: c.customer_name,
      phone: c.customer_phone,
      reference: null,
      href: "/admin/atendimento",
      created_at: c.created_at,
      due: dayISO(c.last_message_at ?? c.created_at),
      next_action: "Assumir a conversa no Atendimento.",
      message: null,
      amount: null,
    });
  }
  for (const c of igRes.data ?? []) {
    tasks.push({
      id: `instagram:${c.id}`,
      type: "instagram",
      priority: "alta",
      title: `${c.unread_count} mensagem(ns) no Instagram sem resposta`,
      customer: c.participant_name || (c.participant_username ? `@${c.participant_username}` : null),
      phone: null,
      reference: c.last_message_preview ? `“${c.last_message_preview.slice(0, 60)}”` : null,
      href: "/admin/instagram/inbox",
      created_at: c.created_at,
      due: dayISO(c.last_message_at ?? c.created_at),
      next_action: "Responder pelo Inbox do Instagram (a janela de resposta é de 24 h).",
      message: null,
      amount: null,
    });
  }

  // ---------------- Oportunidades do Pipeline ----------------
  const deals = dealsRes.data ?? [];
  const dealCustomerIds = [...new Set(deals.map((d) => d.customer_id).filter((v): v is string => !!v))];
  const { data: dealCustomers, error: dcErr } = dealCustomerIds.length
    ? await db.from("customers").select("id, full_name, company, phone").in("id", dealCustomerIds)
    : { data: [], error: null };
  if (dcErr) throw new Error(dcErr.message);
  const dcMap = new Map((dealCustomers ?? []).map((c) => [c.id, c]));
  for (const d of deals) {
    const c = d.customer_id ? dcMap.get(d.customer_id) : undefined;
    const base = {
      id: `oportunidade:${d.id}`,
      type: "oportunidade" as const,
      customer: c ? c.company || c.full_name : null,
      phone: c?.phone ?? null,
      reference: d.title,
      href: c ? `/admin/clientes/${c.id}` : "/admin/crm",
      created_at: d.created_at,
      message: null,
      amount: d.value ? Number(d.value) : null,
    };
    if (d.next_action_at) {
      const left = diffDaysISO(today, d.next_action_at);
      if (left > 1) continue;
      tasks.push({
        ...base,
        priority: left < 0 ? "alta" : "media",
        title: left < 0 ? `Ação atrasada: ${d.title}` : left === 0 ? `Ação para hoje: ${d.title}` : `Ação amanhã: ${d.title}`,
        due: d.next_action_at,
        next_action: d.next_action || "Registrar a próxima ação da negociação.",
      });
    } else if (daysSince(d.stage_changed_at) >= 7) {
      tasks.push({
        ...base,
        priority: "baixa",
        title: `Negociação parada há ${daysSince(d.stage_changed_at)} dias: ${d.title}`,
        due: plusDays(d.stage_changed_at, 7),
        next_action: "Definir a próxima ação ou encerrar a oportunidade.",
      });
    }
  }

  // ---------------- Prospecção: contatos iniciados há 3+ dias ----------------
  const ws = (wholesaleRes.data?.value ?? {}) as { enabled?: boolean; default_discount_percent?: number; min_qty_per_subcategory?: number };
  const wholesaleLine =
    ws.enabled !== false && ws.default_discount_percent && ws.min_qty_per_subcategory
      ? `temos condições especiais de atacado para academias (${ws.default_discount_percent}% a partir de ${ws.min_qty_per_subcategory} peças por modelo)`
      : "temos condições especiais para academias";
  const stale = (prospectsRes.data ?? []).filter((p) => daysSince(p.last_contacted_at ?? p.updated_at ?? p.created_at) >= 3);
  for (const p of stale.slice(0, PROSPECT_LIMIT)) {
    const last = p.last_contacted_at ?? p.updated_at ?? p.created_at;
    tasks.push({
      id: `prospeccao:${p.id}`,
      type: "prospeccao",
      priority: "baixa",
      title: `Retomar contato com ${p.name}`,
      customer: p.name,
      phone: p.phone,
      reference: [p.city, p.state].filter(Boolean).join("/") || null,
      href: `/admin/leads/${p.id}`,
      created_at: p.created_at,
      due: plusDays(last, 3),
      next_action: `Último contato há ${daysSince(last)} dia(s): retomar a conversa e oferecer o catálogo de atacado.`,
      message: `Olá! Aqui é da AMT Fight Wear. Retomando nosso contato: ${wholesaleLine}. Posso te enviar o catálogo?`,
      amount: null,
    });
  }

  // ---------------- WhatsApp (caixa de entrada do admin) ----------------
  // Sem a tabela (migration da caixa de entrada ainda não aplicada) esta parte só é pulada.
  const { data: chats } = await db
    .from("whatsapp_chats")
    .select("id, name, phone_normalized, customer_id, last_message_at, last_message_from_me, last_message_preview, unread_count, follow_up_at, follow_up_note, archived, customers(full_name, company)")
    .eq("archived", false)
    .order("last_message_at", { ascending: false })
    .limit(500);
  const ACTIVE_ORDER = ["paid", "preparing", "processing", "shipped"];
  const activeOrderCustomers = new Set(orders.filter((o) => ACTIVE_ORDER.includes(o.status) && o.customer_id).map((o) => o.customer_id as string));
  const chatByPhone = new Map<string, string>();
  for (const c of chats ?? []) {
    if (c.phone_normalized && !chatByPhone.has(c.phone_normalized)) chatByPhone.set(c.phone_normalized, c.id);
    const cust = Array.isArray(c.customers) ? c.customers[0] : c.customers;
    const who = cust?.company || cust?.full_name || c.name || (c.phone_normalized ? `+${c.phone_normalized}` : "Contato do WhatsApp");
    const base = {
      customer: who,
      phone: null,
      reference: c.last_message_preview ? `“${c.last_message_preview.slice(0, 70)}”` : null,
      href: `/admin/whatsapp?chat=${c.id}`,
      created_at: c.last_message_at,
      message: null,
      amount: null,
      chat_id: c.id,
    };
    if (c.last_message_from_me === false && c.last_message_at) {
      const waitingOrder = !!c.customer_id && activeOrderCustomers.has(c.customer_id);
      const hours = Math.floor((Date.now() - new Date(c.last_message_at).getTime()) / 3600000);
      tasks.push({
        ...base,
        id: `whatsapp_sem_resposta:${c.id}`,
        type: "whatsapp_sem_resposta",
        priority: waitingOrder ? "critica" : "alta",
        title: waitingOrder
          ? `Cliente com pedido em andamento aguardando resposta${hours ? ` há ${hours}h` : ""}`
          : `WhatsApp sem resposta${hours ? ` há ${hours}h` : ""}`,
        due: dayISO(c.last_message_at),
        next_action: waitingOrder ? "Responder com o andamento do pedido." : "Responder a mensagem pelo WhatsApp do admin.",
      });
    }
    if (c.follow_up_at && c.follow_up_at <= plusDays(new Date().toISOString(), 1)) {
      tasks.push({
        ...base,
        id: `whatsapp_retorno:${c.id}`,
        type: "whatsapp_retorno",
        priority: c.follow_up_at < today ? "alta" : "media",
        title: `Retorno agendado${c.follow_up_note ? `: ${c.follow_up_note}` : ""}`,
        due: c.follow_up_at,
        next_action: "Retomar a conversa combinada com o contato.",
      });
    }
  }
  // Pendências com telefone de quem já conversa pelo admin: responder por lá.
  for (const t of tasks) {
    if (!t.chat_id && t.phone) {
      const digits = t.phone.replace(/\D/g, "");
      const norm = digits.startsWith("55") ? digits : `55${digits}`;
      t.chat_id = chatByPhone.get(norm) ?? null;
    }
  }

  return { tasks, prospectsHidden: Math.max(0, stale.length - PROSPECT_LIMIT), generatedAt: new Date().toISOString() };
}
