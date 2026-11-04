import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileText, Trash2 } from "lucide-react";
import {
  adminCrmCustomerProfile,
  adminCrmDeleteDeal,
  adminCrmListCustomers,
  adminCrmSaveDeal,
  type CrmDeal,
} from "@/lib/store/crm.functions";
import { DEAL_ORIGINS, DEAL_STAGES, LOST_REASONS, type DealStage } from "@/lib/store/crm";
import { QUOTE_STATUS_META } from "@/lib/store/quote-status";
import { orderStatusLabel } from "@/lib/store/order-status";
import { formatBRL } from "@/lib/store/cart-store";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NONE = "__none";

type Form = {
  title: string;
  customer_id: string;
  stage: DealStage;
  value: string;
  quantity: string;
  product_interest: string;
  origin: string;
  next_action: string;
  next_action_at: string;
  lost_reason: string;
  quote_id: string;
  order_id: string;
  notes: string;
};

const fromDeal = (d: Partial<CrmDeal> | null, customerId?: string, stage?: DealStage): Form => ({
  title: d?.title ?? "",
  customer_id: d?.customer_id ?? customerId ?? "",
  stage: ((d?.stage as DealStage) ?? stage ?? "novo_contato"),
  value: d?.value ? String(d.value) : "",
  quantity: d?.quantity != null ? String(d.quantity) : "",
  product_interest: d?.product_interest ?? "",
  origin: d?.origin ?? "",
  next_action: d?.next_action ?? "",
  next_action_at: d?.next_action_at ?? "",
  lost_reason: d?.lost_reason ?? "",
  quote_id: d?.quote_id ?? "",
  order_id: d?.order_id ?? "",
  notes: d?.notes ?? "",
});

/**
 * Criar/editar oportunidade. Fechar a venda pede o pedido ou orçamento vinculado
 * (nada é duplicado: o pedido continua nascendo do checkout ou do orçamento pago).
 */
export function DealDialog({
  open,
  onOpenChange,
  deal,
  customerId,
  initialStage,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  deal: CrmDeal | null;
  /** Cliente pré-selecionado (ficha do cliente). */
  customerId?: string;
  /** Etapa sugerida (ex.: ao arrastar para "Venda fechada"). */
  initialStage?: DealStage;
}) {
  const qc = useQueryClient();
  const saveFn = useServerFn(adminCrmSaveDeal);
  const deleteFn = useServerFn(adminCrmDeleteDeal);
  const listCustomersFn = useServerFn(adminCrmListCustomers);
  const profileFn = useServerFn(adminCrmCustomerProfile);
  const [confirm, confirmDialog] = useConfirm();
  const [form, setForm] = useState<Form>(() => fromDeal(deal, customerId, initialStage));

  useEffect(() => {
    if (open) setForm({ ...fromDeal(deal, customerId), ...(initialStage ? { stage: initialStage } : {}) });
  }, [open, deal, customerId, initialStage]);

  const customers = useQuery({
    queryKey: ["admin", "crm", "customers"],
    queryFn: () => listCustomersFn(),
    enabled: open,
    staleTime: 60_000,
  });
  const profile = useQuery({
    queryKey: ["admin", "crm", "customer", form.customer_id],
    queryFn: () => profileFn({ data: { id: form.customer_id } }),
    enabled: open && !!form.customer_id,
  });

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          ...(deal ? { id: deal.id } : {}),
          title: form.title.trim(),
          customer_id: form.customer_id || null,
          stage: form.stage,
          value: Number(form.value.replace(",", ".")) || 0,
          quantity: form.quantity ? Number(form.quantity) : null,
          product_interest: form.product_interest || null,
          origin: form.origin || null,
          next_action: form.next_action || null,
          next_action_at: form.next_action_at || null,
          lost_reason: form.stage === "perdido" ? form.lost_reason || null : null,
          quote_id: form.quote_id || null,
          order_id: form.order_id || null,
          notes: form.notes || null,
        },
      }),
    onSuccess: () => {
      toast.success(deal ? "Oportunidade atualizada" : "Oportunidade criada");
      qc.invalidateQueries({ queryKey: ["admin", "crm"] });
      qc.invalidateQueries({ queryKey: ["admin", "commercial-center"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => deleteFn({ data: { id: deal!.id } }),
    onSuccess: () => {
      toast.success("Oportunidade excluída");
      qc.invalidateQueries({ queryKey: ["admin", "crm"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const quotes = profile.data?.quotes ?? [];
  const orders = profile.data?.orders ?? [];
  const closing = form.stage === "ganho";
  const losing = form.stage === "perdido";


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deal ? "Oportunidade" : "Nova oportunidade"}</DialogTitle>
          <DialogDescription>Uma negociação com o cliente, do primeiro contato até a venda.</DialogDescription>
        </DialogHeader>
        {confirmDialog}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="deal-title">Título *</Label>
            <Input
              id="deal-title"
              value={form.title}
              placeholder="Ex.: 30 faixas azuis para a academia"
              onChange={(e) => set("title", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Cliente</Label>
            <Select value={form.customer_id || NONE} onValueChange={(v) => setForm((f) => ({ ...f, customer_id: v === NONE ? "" : v, quote_id: "", order_id: "" }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem cliente</SelectItem>
                {(customers.data ?? [])
                  .slice()
                  .sort((a, b) => (a.company || a.full_name).localeCompare(b.company || b.full_name))
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company ? `${c.company} · ${c.full_name}` : c.full_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Etapa</Label>
            <Select value={form.stage} onValueChange={(v) => set("stage", v as DealStage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEAL_STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="deal-product">Produto de interesse</Label>
            <Input id="deal-product" value={form.product_interest} onChange={(e) => set("product_interest", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="deal-qty">Quantidade</Label>
              <Input id="deal-qty" inputMode="numeric" value={form.quantity} onChange={(e) => set("quantity", e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="deal-value">Valor estimado (R$)</Label>
              <Input id="deal-value" inputMode="decimal" value={form.value} onChange={(e) => set("value", e.target.value.replace(/[^\d.,]/g, ""))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Origem</Label>
            <Select value={form.origin || NONE} onValueChange={(v) => set("origin", v === NONE ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Não informada</SelectItem>
                {DEAL_ORIGINS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="space-y-1">
              <Label htmlFor="deal-next">Próxima ação</Label>
              <Input id="deal-next" value={form.next_action} placeholder="Ex.: ligar para fechar" onChange={(e) => set("next_action", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="deal-next-at">Quando</Label>
              <Input id="deal-next-at" type="date" value={form.next_action_at} onChange={(e) => set("next_action_at", e.target.value)} />
            </div>
          </div>

          {/* Vínculos: orçamento e pedido do cliente */}
          <div className="space-y-1">
            <Label>Orçamento vinculado</Label>
            <Select value={form.quote_id || NONE} onValueChange={(v) => set("quote_id", v === NONE ? "" : v)} disabled={!form.customer_id}>
              <SelectTrigger>
                <SelectValue placeholder={form.customer_id ? "Selecione" : "Escolha o cliente"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Nenhum</SelectItem>
                {quotes.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.quote_number} · {QUOTE_STATUS_META[q.status]?.label ?? q.status} · {formatBRL(Number(q.total ?? 0))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.customer_id ? (
              <Link
                to="/admin/orcamentos"
                search={{ cliente: form.customer_id, ...(deal ? { oportunidade: deal.id } : {}) }}
                className="inline-flex items-center gap-1 text-xs text-primary underline"
              >
                <FileText className="h-3 w-3" /> Criar orçamento para este cliente
              </Link>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label>Pedido vinculado</Label>
            <Select value={form.order_id || NONE} onValueChange={(v) => set("order_id", v === NONE ? "" : v)} disabled={!form.customer_id}>
              <SelectTrigger>
                <SelectValue placeholder={form.customer_id ? "Selecione" : "Escolha o cliente"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Nenhum</SelectItem>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.order_number} · {orderStatusLabel[o.status] ?? o.status} · {formatBRL(Number(o.total ?? 0))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {closing && !form.quote_id && !form.order_id ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:col-span-2">
              Para fechar a venda, vincule o pedido (compra pela loja) ou o orçamento pago. O pedido continua sendo criado pelo
              checkout ou pelo orçamento pago — nada é duplicado.
            </p>
          ) : null}
          {losing ? (
            <div className="space-y-1 sm:col-span-2">
              <Label>Motivo da perda *</Label>
              <div className="flex flex-wrap gap-1.5">
                {LOST_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => set("lost_reason", r)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${form.lost_reason === r ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <Input value={form.lost_reason} placeholder="Ou descreva o motivo" onChange={(e) => set("lost_reason", e.target.value)} />
            </div>
          ) : null}
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="deal-notes">Observações</Label>
            <Textarea id="deal-notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {deal ? (
            <Button
              variant="ghost"
              className="gap-1.5 text-destructive"
              disabled={remove.isPending}
              onClick={async () => {
                const ok = await confirm({
                  title: "Excluir esta oportunidade?",
                  description: "Pedidos e orçamentos vinculados não são afetados.",
                  confirmLabel: "Excluir",
                  destructive: true,
                });
                if (ok) remove.mutate();
              }}
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!form.title.trim() || save.isPending || (losing && !form.lost_reason.trim()) || (closing && !form.quote_id && !form.order_id)}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
