import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STAGES, URGENCIES, ORDER_TYPES, CANCELLED_ORDER_STATUS } from "@/lib/store/production-stages";
import type { OrderType, Stage, Urgency } from "@/lib/store/production-stages";

export type ProductionJob = {
  id: string;
  source: "order" | "quote" | "manual";
  source_id: string | null;
  source_item_key: string | null;
  reference: string | null;
  customer_name: string | null;
  product_name: string;
  variant_label: string | null;
  sku: string | null;
  image_url: string | null;
  quantity: number;
  unit_price: number | null;
  total_value: number | null;
  status: "queued" | "in_production" | "paused" | "done" | "cancelled";
  payment_status: string | null;
  stage: Stage;
  urgency: Urgency;
  order_type: OrderType;
  priority: number;
  deadline: string | null;
  assignee: string | null;
  stage_assignees: Record<string, string> | null;
  blocked_reason: string | null;
  material_alert: string | null;
  rework_count: number;
  notes: string | null;
  stage_checks: Record<string, string[]> | null;
  custom_config: Record<string, string | number | boolean | null> | null;
  queued_at: string;
  stage_started_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export type ProductionStageEvent = {
  id: string;
  job_id: string;
  from_stage: string | null;
  to_stage: string;
  assignee: string | null;
  note: string | null;
  entered_at: string;
  exited_at: string | null;
  duration_seconds: number | null;
};

export type ProductionComment = {
  id: string;
  job_id: string;
  author: string | null;
  body: string;
  created_at: string;
};

export type ProductionAnalytics = {
  stageAverages: { stage: string; avgSeconds: number; completed: number }[];
  assigneeStats: { assignee: string; completed: number; avgSeconds: number }[];
  perDay: { day: string; finished: number; pieces: number }[];
  categoryVolume: { name: string; pieces: number }[];
  avgLeadSeconds: number;
  reworkRate: number;
  onTime: number;
  late: number;
};

/** Lista a fila completa, já ordenada por prioridade inteligente no cliente. */
export const adminListProductionJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProductionJob[]> => {
    const { data, error } = await context.supabase
      .from("store_production_jobs")
      .select("*")
      .order("priority", { ascending: false })
      .order("queued_at", { ascending: true })
      .limit(5000);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      ...(r as Record<string, unknown>),
      quantity: Number((r as { quantity?: number }).quantity ?? 0),
      unit_price:
        (r as { unit_price?: number | null }).unit_price != null
          ? Number((r as { unit_price?: number }).unit_price)
          : null,
      total_value:
        (r as { total_value?: number | null }).total_value != null
          ? Number((r as { total_value?: number }).total_value)
          : null,
    })) as ProductionJob[];
  });

/** Importa itens de pedidos da loja e de orçamentos aprovados que ainda não estão na fila. */
export const adminSyncProductionQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const { data: existing, error: exErr } = await supabase
      .from("store_production_jobs")
      .select("id, source, source_id, source_item_key, payment_status")
      .limit(10000);
    if (exErr) throw new Error(exErr.message);
    const seen = new Set(
      (existing ?? []).map((r) => `${r.source}:${r.source_id}:${r.source_item_key}`),
    );

    const rows: Record<string, unknown>[] = [];

    // ---- Pedidos da loja ----
    const { data: orders, error: oErr } = await supabase
      .from("store_orders")
      .select("id, order_number, customer_name, status, payment_status, metadata, max_production_days, created_at")
      .order("created_at", { ascending: true })
      .limit(1000);
    if (oErr) throw new Error(oErr.message);
    const isCancelledOrder = (o: { status?: string | null; payment_status?: string | null }) =>
      CANCELLED_ORDER_STATUS.includes(String(o.status ?? "").toLowerCase()) ||
      CANCELLED_ORDER_STATUS.includes(String(o.payment_status ?? "").toLowerCase());
    const isQuoteOrder = (o: { metadata?: unknown }) =>
      String(((o.metadata ?? {}) as Record<string, unknown>)["channel"] ?? "").toLowerCase() === "quote";
    // Pedidos gerados por orçamento já entram na fila pela origem "quote".
    const validOrders = (orders ?? []).filter((o) => !isCancelledOrder(o) && !isQuoteOrder(o));

    // Pedidos cancelados (pelo cliente ou pelo admin) saem da fila de produção.
    const cancelledIds = (orders ?? []).filter(isCancelledOrder).map((o) => o.id);
    if (cancelledIds.length) {
      const stale = (existing ?? [])
        .filter((j) => j.source === "order" && j.source_id && cancelledIds.includes(j.source_id))
        .map((j) => j.id);
      if (stale.length) {
        await supabase.from("store_production_jobs").delete().in("id", stale);
        for (const id of stale) seen.delete(id);
      }
    }


    // Mantém a situação de pagamento dos jobs já existentes sincronizada.
    const payByOrder = new Map(
      validOrders.map((o) => [o.id, String(o.payment_status ?? "pending")]),
    );
    for (const job of existing ?? []) {
      if (job.source !== "order" || !job.source_id) continue;
      const current = payByOrder.get(job.source_id);
      if (!current || current === job.payment_status) continue;
      await supabase
        .from("store_production_jobs")
        .update({ payment_status: current } as never)
        .eq("id", job.id);
    }


    if (validOrders.length > 0) {
      const { data: items, error: iErr } = await supabase
        .from("store_order_items")
        .select("id, order_id, product_name, variant_label, sku, image_url, quantity, unit_price, total_price, custom_config")
        .in(
          "order_id",
          validOrders.map((o) => o.id),
        )
        .limit(10000);
      if (iErr) throw new Error(iErr.message);
      const byId = new Map(validOrders.map((o) => [o.id, o]));
      for (const it of items ?? []) {
        const order = byId.get(it.order_id);
        if (!order) continue;
        if (seen.has(`order:${it.order_id}:${it.id}`)) continue;
        const meta = (order.metadata ?? {}) as Record<string, unknown>;
        const wholesale =
          meta["wholesale"] === true || String(meta["channel"] ?? "").toLowerCase() === "wholesale";
        const queuedAt = order.created_at ?? new Date().toISOString();
        const days = Number(order.max_production_days ?? 0) || 10;
        const deadline = new Date(new Date(queuedAt).getTime() + days * 86400000)
          .toISOString()
          .slice(0, 10);
        rows.push({
          source: "order",
          source_id: it.order_id,
          source_item_key: it.id,
          reference: order.order_number ?? null,
          customer_name: order.customer_name ?? null,
          product_name: it.product_name ?? "Item do pedido",
          variant_label: it.variant_label ?? null,
          sku: it.sku ?? null,
          image_url: it.image_url ?? null,
          quantity: Number(it.quantity ?? 1),
          unit_price: it.unit_price != null ? Number(it.unit_price) : null,
          total_value:
            it.total_price != null
              ? Number(it.total_price)
              : it.unit_price != null
                ? Number(it.unit_price) * Number(it.quantity ?? 1)
                : null,
          queued_at: queuedAt,
          deadline,
          order_type: it.custom_config ? "custom" : wholesale ? "wholesale" : "retail",
          payment_status: String(order.payment_status ?? "pending"),
          custom_config: it.custom_config ?? null,
        });
      }
    }

    // ---- Orçamentos aprovados ----
    const { data: quotes, error: qErr } = await supabase
      .from("store_quotes")
      .select("id, quote_number, customer_name, customer_company, items, status, created_at")
      .in("status", ["approved", "paid_50", "paid_100", "sent", "draft"])
      .order("created_at", { ascending: true })
      .limit(1000);
    if (qErr) throw new Error(qErr.message);
    for (const q of quotes ?? []) {
      const items = Array.isArray(q.items) ? (q.items as Record<string, unknown>[]) : [];
      items.forEach((it, idx) => {
        const key = `${idx}`;
        if (seen.has(`quote:${q.id}:${key}`)) return;
        const queuedAt = q.created_at ?? new Date().toISOString();
        rows.push({
          source: "quote",
          source_id: q.id,
          source_item_key: key,
          reference: q.quote_number ?? null,
          customer_name: (q.customer_company as string) || q.customer_name || null,
          product_name: String(it["name"] ?? "Item do orçamento"),
          variant_label: (it["description"] as string) ?? null,
          sku: (it["sku"] as string) ?? null,
          image_url: (it["image_url"] as string) ?? null,
          quantity: Number(it["quantity"] ?? 1),
          unit_price: it["unit_price"] != null ? Number(it["unit_price"]) : null,
          total_value:
            it["unit_price"] != null
              ? Number(it["unit_price"]) * Number(it["quantity"] ?? 1)
              : null,
          queued_at: queuedAt,
          deadline: new Date(new Date(queuedAt).getTime() + 15 * 86400000).toISOString().slice(0, 10),
          order_type: "quote",
          payment_status: q.status === "paid_100" ? "paid" : q.status === "paid_50" ? "partial" : q.status,
          custom_config: null,
        });
      });
    }

    if (rows.length === 0) return { ok: true, inserted: 0 };

    const { error } = await supabase.from("store_production_jobs").insert(rows as never);
    if (error) throw new Error(error.message);
    return { ok: true, inserted: rows.length };
  });

/** Cria uma ordem de produção manual (pedido interno). */
export const adminCreateProductionJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        product_name: z.string().trim().min(1).max(200),
        customer_name: z.string().trim().max(200).optional(),
        reference: z.string().trim().max(80).optional(),
        variant_label: z.string().trim().max(200).optional(),
        sku: z.string().trim().max(80).optional(),
        quantity: z.number().min(1).max(100000).default(1),
        deadline: z.string().trim().max(20).optional(),
        urgency: z.enum(URGENCIES).default("normal"),
        order_type: z.enum(ORDER_TYPES).default("internal"),
        notes: z.string().trim().max(2000).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("store_production_jobs").insert({
      ...data,
      deadline: data.deadline || null,
      source: "manual",
      stage: "recebido",
      queued_at: new Date().toISOString(),
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Atualiza um item da fila (etapa, prazo, responsável, urgência, observações). */
export const adminUpdateProductionJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        stage: z.enum(STAGES).optional(),
        status: z.enum(["queued", "in_production", "paused", "done", "cancelled"]).optional(),
        urgency: z.enum(URGENCIES).optional(),
        order_type: z.enum(ORDER_TYPES).optional(),
        deadline: z.string().trim().max(20).nullable().optional(),
        assignee: z.string().trim().max(160).nullable().optional(),
        notes: z.string().trim().max(2000).nullable().optional(),
        blocked_reason: z.string().trim().max(400).nullable().optional(),
        material_alert: z.string().trim().max(400).nullable().optional(),
        priority: z.number().int().min(-100).max(100).optional(),
        quantity: z.number().min(0).max(1000000).optional(),
        unit_price: z.number().min(0).max(10000000).nullable().optional(),
        rework: z.boolean().optional(),
        stageAssignee: z.string().trim().max(160).nullable().optional(),
        stageChecks: z.record(z.string(), z.array(z.string())).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { id, rework, stageAssignee, stageChecks, ...patch } = data;
    const update: Record<string, unknown> = { ...patch };
    if (stageChecks) update["stage_checks"] = stageChecks;
    if (patch.deadline === "") update["deadline"] = null;

    const { data: current, error: curErr } = await context.supabase
      .from("store_production_jobs")
      .select("stage, stage_assignees, rework_count, started_at, quantity, unit_price")
      .eq("id", id)
      .maybeSingle();
    if (curErr) throw new Error(curErr.message);
    if (!current) throw new Error("Item não encontrado na fila.");

    if (rework) update["rework_count"] = Number(current.rework_count ?? 0) + 1;

    if (stageAssignee !== undefined) {
      const map = { ...((current.stage_assignees ?? {}) as Record<string, string>) };
      const stageKey = String(patch.stage ?? current.stage);
      if (stageAssignee) map[stageKey] = stageAssignee;
      else delete map[stageKey];
      update["stage_assignees"] = map;
      update["assignee"] = stageAssignee || null;
    }

    if (patch.status === "in_production" && !current.started_at) {
      update["started_at"] = new Date().toISOString();
    }
    if (patch.status === "done") update["completed_at"] = new Date().toISOString();
    if (patch.stage === "finalizado" && !patch.status) {
      update["completed_at"] = new Date().toISOString();
    }
    if (patch.unit_price !== undefined || patch.quantity !== undefined) {
      const unit = patch.unit_price !== undefined ? patch.unit_price : Number(current.unit_price ?? 0);
      const qty = patch.quantity !== undefined ? patch.quantity : Number(current.quantity ?? 0);
      update["total_value"] = unit == null ? null : Number(unit) * Number(qty || 0);
    }

    const { error } = await context.supabase
      .from("store_production_jobs")
      .update(update as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Move um item para outra etapa (drag & drop, scanner e ações rápidas). */
export const adminMoveProductionStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        stage: z.enum(STAGES),
        assignee: z.string().trim().max(160).nullable().optional(),
        note: z.string().trim().max(500).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const update: Record<string, unknown> = { stage: data.stage };
    if (data.stage === "finalizado") update["completed_at"] = new Date().toISOString();
    if (data.assignee !== undefined) update["assignee"] = data.assignee || null;
    const { error } = await context.supabase
      .from("store_production_jobs")
      .update(update as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.note) {
      await context.supabase
        .from("store_production_stage_events")
        .update({ note: data.note } as never)
        .eq("job_id", data.id)
        .is("exited_at", null);
    }
    return { ok: true };
  });

/** Ações em massa: etapa, responsável, urgência, prazo, pausa e finalização. */
export const adminBulkUpdateProductionJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(2000),
        stage: z.enum(STAGES).optional(),
        status: z.enum(["queued", "in_production", "paused", "done", "cancelled"]).optional(),
        urgency: z.enum(URGENCIES).optional(),
        deadline: z.string().trim().max(20).nullable().optional(),
        assignee: z.string().trim().max(160).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const update: Record<string, unknown> = {};
    if (data.stage) update["stage"] = data.stage;
    if (data.stage === "finalizado") update["completed_at"] = new Date().toISOString();
    if (data.status) update["status"] = data.status;
    if (data.urgency) update["urgency"] = data.urgency;
    if (data.deadline !== undefined) update["deadline"] = data.deadline || null;
    if (data.assignee !== undefined) update["assignee"] = data.assignee || null;
    if (Object.keys(update).length === 0) return { ok: true, updated: 0 };

    // Etapa dispara gatilho por linha; update em lote continua acionando o BEFORE UPDATE.
    const { error } = await context.supabase
      .from("store_production_jobs")
      .update(update as never)
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, updated: data.ids.length };
  });

/** Remove itens da fila (não afeta o pedido/orçamento de origem). */
export const adminDeleteProductionJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(2000) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("store_production_jobs")
      .delete()
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, deleted: data.ids.length };
  });

/** Linha do tempo + observações internas de um item. */
export const adminProductionJobDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ events: ProductionStageEvent[]; comments: ProductionComment[] }> => {
      const [events, comments] = await Promise.all([
        context.supabase
          .from("store_production_stage_events")
          .select("*")
          .eq("job_id", data.id)
          .order("entered_at", { ascending: true })
          .limit(500),
        context.supabase
          .from("store_production_comments")
          .select("*")
          .eq("job_id", data.id)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      if (events.error) throw new Error(events.error.message);
      if (comments.error) throw new Error(comments.error.message);
      return {
        events: (events.data ?? []) as ProductionStageEvent[],
        comments: (comments.data ?? []) as ProductionComment[],
      };
    },
  );

/** Comentário interno (nunca exibido ao cliente). */
export const adminAddProductionComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        job_id: z.string().uuid(),
        body: z.string().trim().min(1).max(2000),
        author: z.string().trim().max(160).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("store_production_comments").insert({
      job_id: data.job_id,
      body: data.body,
      author: data.author || context.claims?.email || null,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Indicadores de desempenho da produção (tempos médios, gargalos, eficiência). */
export const adminProductionAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProductionAnalytics> => {
    const since = new Date(Date.now() - 60 * 86400000).toISOString();

    const [ev, jb] = await Promise.all([
      context.supabase
        .from("store_production_stage_events")
        .select("from_stage, to_stage, assignee, duration_seconds, entered_at, exited_at")
        .gte("entered_at", since)
        .not("duration_seconds", "is", null)
        .limit(20000),
      context.supabase
        .from("store_production_jobs")
        .select(
          "id, product_name, quantity, stage, deadline, rework_count, queued_at, completed_at, assignee",
        )
        .limit(10000),
    ]);
    if (ev.error) throw new Error(ev.error.message);
    if (jb.error) throw new Error(jb.error.message);

    const events = ev.data ?? [];
    const jobs = jb.data ?? [];

    const byStage = new Map<string, { total: number; count: number }>();
    for (const e of events) {
      const key = String(e.from_stage ?? "recebido");
      const cur = byStage.get(key) ?? { total: 0, count: 0 };
      cur.total += Number(e.duration_seconds ?? 0);
      cur.count += 1;
      byStage.set(key, cur);
    }
    const stageAverages = [...byStage.entries()]
      .map(([stage, v]) => ({ stage, avgSeconds: v.count ? v.total / v.count : 0, completed: v.count }))
      .sort((a, b) => b.avgSeconds - a.avgSeconds);

    const byAssignee = new Map<string, { total: number; count: number }>();
    for (const e of events) {
      if (!e.assignee) continue;
      const cur = byAssignee.get(e.assignee) ?? { total: 0, count: 0 };
      cur.total += Number(e.duration_seconds ?? 0);
      cur.count += 1;
      byAssignee.set(e.assignee, cur);
    }
    const assigneeStats = [...byAssignee.entries()]
      .map(([assignee, v]) => ({
        assignee,
        completed: v.count,
        avgSeconds: v.count ? v.total / v.count : 0,
      }))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 12);

    const dayMap = new Map<string, { finished: number; pieces: number }>();
    let leadTotal = 0;
    let leadCount = 0;
    let onTime = 0;
    let late = 0;
    let rework = 0;

    for (const j of jobs) {
      if (Number(j.rework_count ?? 0) > 0) rework += 1;
      if (!j.completed_at) continue;
      const day = String(j.completed_at).slice(0, 10);
      const cur = dayMap.get(day) ?? { finished: 0, pieces: 0 };
      cur.finished += 1;
      cur.pieces += Number(j.quantity ?? 0);
      dayMap.set(day, cur);
      if (j.queued_at) {
        leadTotal += (new Date(j.completed_at).getTime() - new Date(j.queued_at).getTime()) / 1000;
        leadCount += 1;
      }
      if (j.deadline) {
        if (day <= String(j.deadline)) onTime += 1;
        else late += 1;
      }
    }

    const perDay = [...dayMap.entries()]
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-30);

    const catMap = new Map<string, number>();
    for (const j of jobs) {
      const name = String(j.product_name ?? "Outros").split("-")[0]!.trim() || "Outros";
      catMap.set(name, (catMap.get(name) ?? 0) + Number(j.quantity ?? 0));
    }
    const categoryVolume = [...catMap.entries()]
      .map(([name, pieces]) => ({ name, pieces }))
      .sort((a, b) => b.pieces - a.pieces)
      .slice(0, 10);

    return {
      stageAverages,
      assigneeStats,
      perDay,
      categoryVolume,
      avgLeadSeconds: leadCount ? leadTotal / leadCount : 0,
      reworkRate: jobs.length ? (rework / jobs.length) * 100 : 0,
      onTime,
      late,
    };
  });
