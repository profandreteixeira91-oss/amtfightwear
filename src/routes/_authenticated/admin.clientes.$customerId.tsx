import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  GitMerge,
  MessageCircle,
  Plus,
  Save,
  ShoppingCart,
  Sparkles,
  Target,
} from "lucide-react";
import {
  adminCrmCustomerProfile,
  adminCrmListCustomers,
  adminCrmMergeCustomers,
  adminCrmUpdateCustomer,
  type CrmCustomer,
  type CrmDeal,
} from "@/lib/store/crm.functions";
import {
  CUSTOMER_TAGS,
  DEAL_STAGE_LABEL,
  ORIGIN_LABEL,
  POTENTIALS,
  SEGMENT_CLS,
  SEGMENT_LABEL,
  customerSegment,
  isClosedStage,
  reviewReason,
  type DealStage,
} from "@/lib/store/crm";
import { QUOTE_STATUS_META } from "@/lib/store/quote-status";
import { orderStatusBadgeClass, orderStatusLabel } from "@/lib/store/order-status";
import { DealDialog } from "@/components/store/crm/DealDialog";
import { PageShell } from "@/components/common/PageShell";
import { ErrorState } from "@/components/common/ErrorState";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { whatsappLink } from "@/features/prospect/utils";
import { formatBRL } from "@/lib/store/cart-store";
import { formatBR, formatBRDateTime, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/clientes/$customerId")({
  head: () => ({ meta: [{ title: "Ficha do cliente — AMT Fight Wear" }] }),
  component: CustomerProfilePage,
});

const NONE = "__none";

function CustomerProfilePage() {
  const { customerId } = Route.useParams();
  const profileFn = useServerFn(adminCrmCustomerProfile);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "crm", "customer", customerId],
    queryFn: () => profileFn({ data: { id: customerId } }),
  });
  const [dealOpen, setDealOpen] = useState<{ deal: CrmDeal | null } | null>(null);
  const [merging, setMerging] = useState(false);

  if (isLoading) {
    return (
      <PageShell title="Cliente" description="Carregando…">
        <Skeleton className="h-64 w-full rounded-xl" />
      </PageShell>
    );
  }
  if (error || !data) {
    return (
      <PageShell title="Cliente">
        <ErrorState message={error instanceof Error ? error.message : "Cliente não encontrado."} onRetry={() => refetch()} />
      </PageShell>
    );
  }

  const c = data.customer;
  const seg = customerSegment(c);
  const review = reviewReason(c);
  const ticket = c.orders_count ? Number(c.total_spent) / c.orders_count : 0;

  return (
    <PageShell
      title={c.company || c.full_name}
      description={[c.company ? c.full_name : null, ORIGIN_LABEL[c.origin ?? ""] ? `Origem: ${ORIGIN_LABEL[c.origin ?? ""]}` : null, `Cliente desde ${formatBR(c.created_at)}`]
        .filter(Boolean)
        .join(" · ")}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/clientes">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Clientes
            </Link>
          </Button>
          {c.phone ? (
            <Button variant="outline" className="gap-1.5 text-emerald-700" asChild>
              <a href={whatsappLink(c.phone)} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </Button>
          ) : null}
          <Button variant="outline" className="gap-1.5" asChild>
            <Link to="/admin/orcamentos" search={{ cliente: c.id }}>
              <FileText className="h-4 w-4" /> Novo orçamento
            </Link>
          </Button>
          <Button className="gap-1.5" onClick={() => setDealOpen({ deal: null })}>
            <Plus className="h-4 w-4" /> Oportunidade
          </Button>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", SEGMENT_CLS[seg])}>{SEGMENT_LABEL[seg]}</span>
        {review ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
            <AlertTriangle className="h-3 w-3" />
            {review === "sem_contato" ? "Sem contato: complete telefone ou e-mail" : "Possível duplicado: confira e junte se for o mesmo"}
          </span>
        ) : null}
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setMerging(true)}>
          <GitMerge className="h-3.5 w-3.5" /> Juntar com outro cliente
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Total comprado" value={formatBRL(Number(c.total_spent || 0))} />
        <Kpi label="Compras" value={String(c.orders_count)} />
        <Kpi label="Ticket médio" value={c.orders_count ? formatBRL(ticket) : "—"} />
        <Kpi label="Orçamentos" value={String(c.quotes_count)} />
        <Kpi label="Última compra" value={formatBR(c.last_order_at)} />
        <Kpi label="Último contato" value={formatBR(c.last_contact_at)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <CustomerForm customer={c} />

        <div className="space-y-4">
          <Section title="Oportunidades" icon={Target} count={data.deals.length}>
            {data.deals.length === 0 ? (
              <Empty text="Nenhuma negociação aberta." />
            ) : (
              <div className="divide-y">
                {data.deals.map((d) => {
                  const late = d.next_action_at && !isClosedStage(d.stage) && d.next_action_at < todayISO();
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDealOpen({ deal: d })}
                      className="flex w-full flex-wrap items-center justify-between gap-2 py-2.5 text-left hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <div className="font-medium">{d.title}</div>
                        <div className={cn("text-xs", late ? "font-semibold text-red-700" : "text-muted-foreground")}>
                          {d.next_action ? `${d.next_action}${d.next_action_at ? ` · ${formatBR(d.next_action_at)}` : ""}` : "Sem próxima ação"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium">{DEAL_STAGE_LABEL[d.stage as DealStage] ?? d.stage}</div>
                        <div className="text-sm tabular-nums">{d.value ? formatBRL(Number(d.value)) : ""}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Section>

          <Section title="Pedidos" icon={ShoppingCart} count={data.orders.length}>
            {data.orders.length === 0 ? (
              <Empty text="Nenhum pedido." />
            ) : (
              <div className="divide-y">
                {data.orders.map((o) => (
                  <Link
                    key={o.id}
                    to="/admin/pedidos/$orderId"
                    params={{ orderId: o.id }}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 hover:bg-muted/40"
                  >
                    <div>
                      <div className="font-mono text-xs font-semibold">{o.order_number}</div>
                      <div className="text-xs text-muted-foreground">{formatBRDateTime(o.created_at)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", orderStatusBadgeClass(o.status))}>
                        {orderStatusLabel[o.status] ?? o.status}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{formatBRL(Number(o.total ?? 0))}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          <Section title="Orçamentos" icon={FileText} count={data.quotes.length}>
            {data.quotes.length === 0 ? (
              <Empty text="Nenhum orçamento." />
            ) : (
              <div className="divide-y">
                {data.quotes.map((q) => (
                  <Link
                    key={q.id}
                    to="/admin/orcamentos"
                    search={{ status: q.status }}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 hover:bg-muted/40"
                  >
                    <div>
                      <div className="font-mono text-xs font-semibold">{q.quote_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatBR(q.created_at)}
                        {q.valid_until ? ` · válido até ${formatBR(q.valid_until)}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", QUOTE_STATUS_META[q.status]?.cls)}>
                        {QUOTE_STATUS_META[q.status]?.label ?? q.status}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{formatBRL(Number(q.total ?? 0))}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          <Section title="Produtos de interesse" icon={Sparkles} count={data.interests.length}>
            {data.interests.length === 0 ? (
              <Empty text="Sem compras ou orçamentos com produtos ainda." />
            ) : (
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {data.interests.map((it) => (
                  <li key={it.name} className="flex items-baseline justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-sm">
                    <span className="min-w-0 truncate">{it.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {[it.bought ? `${it.bought} comprado(s)` : null, it.quoted ? `${it.quoted} orçado(s)` : null].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Conversas" icon={MessageCircle} count={data.chats.length}>
            {data.chats.length === 0 ? (
              <Empty text="Nenhuma conversa registrada. As do WhatsApp entram com a caixa de entrada do admin." />
            ) : (
              <div className="divide-y">
                {data.chats.map((ch) => (
                  <Link key={ch.id} to="/admin/atendimento" className="flex items-center justify-between gap-2 py-2.5 text-sm hover:bg-muted/40">
                    <span>Chat do site · {ch.status === "human" ? "aguardando você" : ch.status}</span>
                    <span className="text-xs text-muted-foreground">{formatBRDateTime(ch.last_message_at ?? ch.created_at)}</span>
                  </Link>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      <DealDialog open={dealOpen !== null} onOpenChange={(v) => !v && setDealOpen(null)} deal={dealOpen?.deal ?? null} customerId={c.id} />
      <MergeDialog open={merging} onOpenChange={setMerging} customer={c} />
    </PageShell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Section({ title, icon: Icon, count, children }: { title: string; icon: typeof Target; count: number; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-neutral-200 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" /> {title}
          <span className="text-xs font-normal text-muted-foreground">({count})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const Empty = ({ text }: { text: string }) => <p className="text-sm text-muted-foreground">{text}</p>;

function CustomerForm({ customer: c }: { customer: CrmCustomer }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(adminCrmUpdateCustomer);
  const initial = useMemo(
    () => ({
      full_name: c.full_name ?? "",
      company: c.company ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      document: c.document ?? "",
      city: c.city ?? "",
      state: c.state ?? "",
      potential: c.potential ?? "",
      notes: c.notes ?? "",
      tags: c.tags ?? [],
    }),
    [c],
  );
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const save = useMutation({
    mutationFn: (extra: { needs_review?: boolean } = {}) =>
      updateFn({
        data: {
          id: c.id,
          patch: {
            ...form,
            potential: (form.potential || null) as "baixo" | "medio" | "alto" | null,
            state: form.state.toUpperCase() || null,
            ...extra,
          },
        },
      }),
    onSuccess: () => {
      toast.success("Cliente atualizado");
      qc.invalidateQueries({ queryKey: ["admin", "crm"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const field = (key: "full_name" | "company" | "phone" | "email" | "document" | "city" | "state", label: string) => (
    <div className="space-y-1">
      <Label htmlFor={`cf-${key}`} className="text-xs">
        {label}
      </Label>
      <Input id={`cf-${key}`} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <Card className="h-fit rounded-2xl border-neutral-200 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Dados e relacionamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">{field("full_name", "Nome")}</div>
          <div className="col-span-2">{field("company", "Empresa / academia")}</div>
          {field("phone", "Telefone")}
          {field("email", "E-mail")}
          {field("document", "CPF / CNPJ")}
          <div className="grid grid-cols-[1fr_56px] gap-2">
            {field("city", "Cidade")}
            {field("state", "UF")}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Etiquetas</Label>
          <div className="flex flex-wrap gap-1.5">
            {CUSTOMER_TAGS.map((t) => {
              const on = form.tags.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setForm({ ...form, tags: on ? form.tags.filter((x) => x !== t.id) : [...form.tags, t.id] })}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Potencial de compra</Label>
          <Select value={form.potential || NONE} onValueChange={(v) => setForm({ ...form, potential: v === NONE ? "" : v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Não avaliado</SelectItem>
              {POTENTIALS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="cf-notes" className="text-xs">
            Observações comerciais
          </Label>
          <Textarea id="cf-notes" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button className="gap-1.5" disabled={!dirty || save.isPending} onClick={() => save.mutate({})}>
            <Save className="h-4 w-4" /> {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
          {c.needs_review ? (
            <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate({ needs_review: false })}>
              Marcar como revisado
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/** Junta este cliente com outro: escolhe quem fica; pedidos, orçamentos e conversas vão juntos. */
function MergeDialog({ open, onOpenChange, customer }: { open: boolean; onOpenChange: (v: boolean) => void; customer: CrmCustomer }) {
  const listFn = useServerFn(adminCrmListCustomers);
  const mergeFn = useServerFn(adminCrmMergeCustomers);
  const qc = useQueryClient();
  const navigate = Route.useNavigate();
  const [confirm, confirmDialog] = useConfirm();
  const [q, setQ] = useState("");
  const list = useQuery({ queryKey: ["admin", "crm", "customers"], queryFn: () => listFn(), enabled: open });
  const candidates = (list.data ?? [])
    .filter((x) => x.id !== customer.id)
    .filter((x) => {
      const t = q.trim().toLowerCase();
      return !t || [x.full_name, x.company, x.email, x.phone].some((v) => v?.toLowerCase().includes(t));
    })
    .slice(0, 30);
  const merge = useMutation({
    mutationFn: (other: string) => mergeFn({ data: { keep_id: customer.id, merge_id: other } }),
    onSuccess: () => {
      toast.success("Clientes unidos");
      qc.invalidateQueries({ queryKey: ["admin", "crm"] });
      onOpenChange(false);
      void navigate({ to: "/admin/clientes/$customerId", params: { customerId: customer.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Juntar com outro cliente</DialogTitle>
          <DialogDescription>
            O cliente escolhido é incorporado a <b>{customer.company || customer.full_name}</b>: pedidos, orçamentos, conversas e
            oportunidades passam para cá e o outro cadastro é apagado.
          </DialogDescription>
        </DialogHeader>
        {confirmDialog}
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, telefone ou e-mail" />
        <div className="divide-y rounded-md border">
          {candidates.map((x) => (
            <div key={x.id} className="flex items-center justify-between gap-2 p-2.5 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{x.company || x.full_name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {[x.company ? x.full_name : null, x.phone, x.email, `${x.orders_count} compra(s)`].filter(Boolean).join(" · ")}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={merge.isPending}
                onClick={async () => {
                  const ok = await confirm({
                    title: `Juntar "${x.company || x.full_name}" a este cliente?`,
                    description: "Não dá para desfazer automaticamente.",
                    confirmLabel: "Juntar",
                    destructive: true,
                  });
                  if (ok) merge.mutate(x.id);
                }}
              >
                Juntar
              </Button>
            </div>
          ))}
          {candidates.length === 0 ? <p className="p-3 text-sm text-muted-foreground">Nenhum cliente encontrado.</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
