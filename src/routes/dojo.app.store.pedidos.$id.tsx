import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  dsGetOrder,
  dsReorder,
  dsAttachToStudents,
} from "@/lib/dojo/store/store.functions";
import { listDojoStudents } from "@/lib/dojo/dojo.functions";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/store/order-status";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Repeat, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/dojo/app/store/pedidos/$id")({
  component: OrderDetail,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function OrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(dsGetOrder);
  const reFn = useServerFn(dsReorder);
  const atFn = useServerFn(dsAttachToStudents);
  const stFn = useServerFn(listDojoStudents);

  const { data, isLoading } = useQuery({
    queryKey: ["dojo-store", "order", id],
    queryFn: () => getFn({ data: { id } }),
  });
  const [assignItem, setAssignItem] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const { data: students } = useQuery({
    queryKey: ["dojo-students-min"],
    queryFn: () => stFn(),
    enabled: !!assignItem,
  });

  const re = useMutation({
    mutationFn: () => reFn({ data: { order_id: id } }),
    onSuccess: () => {
      toast.success("Itens adicionados ao carrinho");
      qc.invalidateQueries({ queryKey: ["dojo-store", "cart"] });
    },
  });
  const at = useMutation({
    mutationFn: (payload: { order_item_id: string; student_ids: string[] }) =>
      atFn({ data: payload }),
    onSuccess: () => {
      toast.success("Alunos vinculados");
      setAssignItem(null);
      setPicked(new Set());
      qc.invalidateQueries({ queryKey: ["dojo-store", "order", id] });
    },
  });

  if (isLoading || !data)
    return (
      <div className="space-y-4">
        <div className="h-4 w-32 animate-pulse rounded-full bg-[color:var(--dojo-surface-3)]" />
        <div className="h-8 w-1/2 animate-pulse rounded-full bg-[color:var(--dojo-surface-3)]" />
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="h-64 animate-pulse rounded-2xl bg-[color:var(--dojo-surface-3)]" />
          <div className="h-48 animate-pulse rounded-2xl bg-[color:var(--dojo-surface-3)]" />
        </div>
      </div>
    );

  return (
    <div className="space-y-8">
      <Link
        to="/dojo/app/store/pedidos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Todos os pedidos
      </Link>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Pedido
          </div>
          <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            {data.order_number}
          </h1>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="rounded-full border border-[color:var(--dojo-border)] bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground">
              {data.status}
            </span>
            <span className="rounded-full border border-[color:var(--dojo-border)] bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {data.payment_status}
            </span>
            {data.is_wholesale && (
              <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-background">
                Atacado
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => re.mutate()}
          disabled={re.isPending}
          className="shrink-0 rounded-full"
        >
          <Repeat className="mr-2 h-4 w-4" strokeWidth={1.75} /> <span className="hidden sm:inline">Comprar novamente</span><span className="sm:hidden">Recomprar</span>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <ul className="divide-y divide-[color:var(--dojo-border)] rounded-2xl border border-[color:var(--dojo-border)] bg-white shadow-[var(--dojo-shadow-xs)]">
            {(data.items ?? []).map((it: any) => (
              <li key={it.id} className="flex flex-wrap gap-3 p-3 sm:gap-4 sm:p-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[color:var(--dojo-surface-3)] sm:h-20 sm:w-20">
                  {it.image_url ? (
                    <img
                      src={it.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm font-semibold leading-tight tracking-tight text-foreground">
                    {it.product_name}
                  </div>
                  {it.variant_label && (
                    <div className="text-xs text-muted-foreground">
                      {it.variant_label}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Qtd: {it.quantity} · {brl(Number(it.unit_price))}
                  </div>
                  {it.customization && (
                    <div className="mt-1 line-clamp-2 text-[11px] text-primary">
                      ✨ Personalização: {JSON.stringify(it.customization)}
                    </div>
                  )}
                  {it.student && (
                    <div className="mt-1 truncate text-[11px] text-muted-foreground">
                      👤 Aluno: {it.student.full_name}
                    </div>
                  )}
                  <div className="mt-2">
                    <button
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground transition hover:opacity-70"
                      onClick={() => setAssignItem(it.id)}
                    >
                      <Users className="h-3 w-3" strokeWidth={1.75} /> Atribuir a alunos
                    </button>
                  </div>
                </div>
                <div className="ml-auto shrink-0 text-right text-sm font-bold tabular-nums tracking-tight text-foreground">
                  {brl(Number(it.total_price))}
                </div>
              </li>
            ))}
          </ul>

          <div className="rounded-2xl border border-[color:var(--dojo-border)] bg-white p-5 shadow-[var(--dojo-shadow-xs)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Linha do tempo
            </div>
            <ol className="mt-3 space-y-3 text-sm">
              {(data.timeline ?? []).map((t: any) => (
                <li key={t.id} className="flex gap-3">
                  <span className="mt-1.5 grid h-2 w-2 shrink-0 place-items-center rounded-full bg-primary" />
                  <div>
                    <div className="text-foreground">{t.message ?? t.event}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                </li>
              ))}
              {(!data.timeline || data.timeline.length === 0) && (
                <li className="text-sm text-muted-foreground">
                  Nenhum evento registrado ainda.
                </li>
              )}
            </ol>
          </div>
        </div>

        <aside className="h-fit space-y-3 rounded-2xl border border-[color:var(--dojo-border)] bg-white p-5 text-sm shadow-[var(--dojo-shadow-sm)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Resumo
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal varejo</span>
              <span className="tabular-nums line-through">
                {brl(Number(data.retail_total))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{brl(Number(data.subtotal))}</span>
            </div>
            {Number(data.savings) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Economia</span>
                <span className="tabular-nums">−{brl(Number(data.savings))}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete</span>
              <span className="tabular-nums">{brl(Number(data.shipping_cost))}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-[color:var(--dojo-border)] pt-3">
              <span className="text-sm font-semibold text-foreground">Total</span>
              <span className="text-xl font-bold tabular-nums tracking-tight text-foreground">
                {brl(Number(data.total))}
              </span>
            </div>
          </div>
          {data.tracking_code && (
            <div className="rounded-xl bg-[color:var(--dojo-surface-2)] p-3 text-xs">
              📦 Rastreio: <b>{data.tracking_code}</b>
            </div>
          )}
          {data.invoice_url && (
            <a
              href={data.invoice_url}
              target="_blank"
              rel="noreferrer"
              className="block text-xs font-medium text-foreground hover:opacity-70"
            >
              Baixar nota fiscal →
            </a>
          )}
        </aside>
      </div>

      <Dialog open={!!assignItem} onOpenChange={(o) => !o && setAssignItem(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Atribuir aos alunos</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto">
            {(students ?? []).map((s: any) => (
              <label
                key={s.id}
                className="flex items-center gap-2 rounded-xl p-2 transition hover:bg-black/[0.03]"
              >
                <Checkbox
                  checked={picked.has(s.id)}
                  onCheckedChange={(v) => {
                    const n = new Set(picked);
                    if (v) n.add(s.id);
                    else n.delete(s.id);
                    setPicked(n);
                  }}
                />
                <span className="text-sm">{s.full_name}</span>
              </label>
            ))}
          </div>
          <Button
            onClick={() =>
              assignItem &&
              at.mutate({
                order_item_id: assignItem,
                student_ids: Array.from(picked),
              })
            }
            disabled={!picked.size || at.isPending}
            className="rounded-full"
          >
            Confirmar ({picked.size})
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
