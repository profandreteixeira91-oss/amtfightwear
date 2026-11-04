import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, MessageCircle, Plus, Search, UserSquare2, X } from "lucide-react";
import { adminCrmCreateCustomer, adminCrmListCustomers } from "@/lib/store/crm.functions";
import {
  CUSTOMER_TAGS,
  SEGMENT_CLS,
  SEGMENT_LABEL,
  TAG_LABEL,
  customerSegment,
  reviewReason,
  type SegmentKey,
} from "@/lib/store/crm";
import { PageShell } from "@/components/common/PageShell";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { whatsappLink } from "@/features/prospect/utils";
import { formatBRL } from "@/lib/store/cart-store";
import { formatBR } from "@/lib/dates";
import { ADMIN_REFRESH } from "@/lib/admin-refresh";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — AMT Fight Wear" },
      { name: "description", content: "Cadastro único de clientes: compras, orçamentos, segmentos e relacionamento." },
    ],
  }),
  component: CustomersPage,
});

type Filter = "todos" | SegmentKey | "academia" | "revendedor" | "atacado" | "vip" | "revisar";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "recorrente", label: SEGMENT_LABEL.recorrente },
  { key: "novo", label: SEGMENT_LABEL.novo },
  { key: "lead", label: "Leads (sem compra)" },
  { key: "inativo", label: SEGMENT_LABEL.inativo },
  ...CUSTOMER_TAGS.map((t) => ({ key: t.id as Filter, label: t.label })),
  { key: "revisar", label: "A revisar" },
];

function CustomersPage() {
  const listFn = useServerFn(adminCrmListCustomers);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "crm", "customers"],
    queryFn: () => listFn(),
    refetchInterval: ADMIN_REFRESH.dashboard,
    placeholderData: keepPreviousData,
  });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [creating, setCreating] = useState(false);

  const all = useMemo(() => data ?? [], [data]);
  const matches = (c: (typeof all)[number], f: Filter) => {
    if (f === "todos") return true;
    if (f === "revisar") return c.needs_review;
    if (f === "lead" || f === "novo" || f === "recorrente" || f === "inativo") return customerSegment(c) === f;
    return (c.tags ?? []).includes(f);
  };
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    return all.filter((c) => {
      if (!matches(c, filter)) return false;
      if (!term) return true;
      return (
        [c.full_name, c.company, c.email, c.city].some((v) => v?.toLowerCase().includes(term)) ||
        (digits.length >= 4 && ((c.phone_normalized ?? "").includes(digits) || (c.document ?? "").includes(digits)))
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, q, filter]);

  const totals = useMemo(() => {
    const buyers = all.filter((c) => c.orders_count > 0);
    const revenue = buyers.reduce((a, c) => a + Number(c.total_spent || 0), 0);
    const orders = buyers.reduce((a, c) => a + c.orders_count, 0);
    return {
      buyers: buyers.length,
      recurring: all.filter((c) => customerSegment(c) === "recorrente").length,
      ticket: orders ? revenue / orders : 0,
      review: all.filter((c) => c.needs_review).length,
    };
  }, [all]);

  return (
    <PageShell
      title="Clientes"
      description={
        isLoading
          ? "Carregando clientes…"
          : `${all.length} cliente(s) · ${totals.buyers} compraram · ${totals.recurring} recorrente(s) · ticket médio ${formatBRL(totals.ticket)}`
      }
      actions={
        <Button className="gap-2" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Novo cliente
        </Button>
      }
    >
      {totals.review > 0 && filter !== "revisar" ? (
        <button
          type="button"
          onClick={() => setFilter("revisar")}
          className="flex w-full items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-left text-sm text-amber-900"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {totals.review} cliente(s) a revisar: sem contato para completar ou possível duplicado. Ver lista
        </button>
      ) : null}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome, empresa, telefone, e-mail ou documento"
            className="pl-9 pr-9"
            aria-label="Buscar clientes"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted"
              aria-label="Limpar busca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Filtrar clientes">
        {FILTERS.map((f) => {
          const n = all.filter((c) => matches(c, f.key)).length;
          const active = f.key === filter;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {f.label}
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-primary-foreground/20" : "bg-muted")}>
                {isLoading ? "…" : n}
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={UserSquare2}
          title={all.length === 0 ? "Nenhum cliente ainda" : "Nenhum cliente neste filtro"}
          description={q ? `Nada encontrado para “${q}”.` : undefined}
        />
      ) : (
        <Card className="overflow-hidden rounded-2xl border-neutral-200 shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead className="text-right">Compras</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Ticket médio</TableHead>
                  <TableHead>Última compra</TableHead>
                  <TableHead>Último contato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => {
                  const seg = customerSegment(c);
                  const review = reviewReason(c);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="max-w-[260px]">
                        <Link
                          to="/admin/clientes/$customerId"
                          params={{ customerId: c.id }}
                          className="block truncate font-semibold hover:text-primary hover:underline"
                        >
                          {c.company || c.full_name}
                        </Link>
                        <div className="truncate text-xs text-muted-foreground">
                          {c.company ? c.full_name : [c.city, c.state].filter(Boolean).join("/") || " "}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {c.phone ? (
                          <a
                            href={whatsappLink(c.phone)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> {c.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">{c.email ?? "—"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", SEGMENT_CLS[seg])}>
                            {SEGMENT_LABEL[seg]}
                          </span>
                          {(c.tags ?? []).map((t) => (
                            <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              {TAG_LABEL[t] ?? t}
                            </span>
                          ))}
                          {review ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                              {review === "sem_contato" ? "Sem contato" : "Possível duplicado"}
                            </span>
                          ) : null}
                          {c.open_deals ? (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-800">
                              {c.open_deals} negociação(ões)
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{c.orders_count}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">
                        {formatBRL(Number(c.total_spent || 0))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {c.orders_count ? formatBRL(Number(c.total_spent || 0) / c.orders_count) : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatBR(c.last_order_at)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatBR(c.last_contact_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <NewCustomerDialog open={creating} onOpenChange={setCreating} />
    </PageShell>
  );
}

function NewCustomerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createFn = useServerFn(adminCrmCreateCustomer);
  const qc = useQueryClient();
  const navigate = Route.useNavigate();
  const [form, setForm] = useState({ full_name: "", company: "", phone: "", email: "", city: "", state: "" });
  const create = useMutation({
    mutationFn: () => createFn({ data: form }),
    onSuccess: ({ id }) => {
      toast.success("Cliente cadastrado");
      qc.invalidateQueries({ queryKey: ["admin", "crm"] });
      onOpenChange(false);
      setForm({ full_name: "", company: "", phone: "", email: "", city: "", state: "" });
      void navigate({ to: "/admin/clientes/$customerId", params: { customerId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const field = (key: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`nc-${key}`}>{label}</Label>
      <Input id={`nc-${key}`} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
    </div>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>Para quem ainda não comprou nem pediu orçamento (ex.: contato pelo WhatsApp).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("full_name", "Nome *")}
          {field("company", "Empresa / academia")}
          {field("phone", "Telefone (WhatsApp)", { inputMode: "tel" })}
          {field("email", "E-mail", { type: "email" })}
          {field("city", "Cidade")}
          {field("state", "UF", { maxLength: 2 })}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!form.full_name.trim() || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "Salvando…" : "Cadastrar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
