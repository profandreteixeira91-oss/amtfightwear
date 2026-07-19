import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dsGetOrder, dsReorder, dsAttachToStudents } from "@/lib/dojo/store/store.functions";
import { listDojoStudents } from "@/lib/dojo/dojo.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Repeat, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/dojo/app/store/pedidos/$id")({ component: OrderDetail });

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function OrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(dsGetOrder);
  const reFn = useServerFn(dsReorder);
  const atFn = useServerFn(dsAttachToStudents);
  const stFn = useServerFn(listDojoStudents);

  const { data, isLoading } = useQuery({ queryKey: ["dojo-store", "order", id], queryFn: () => getFn({ data: { id } }) });
  const [assignItem, setAssignItem] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const { data: students } = useQuery({ queryKey: ["dojo-students-min"], queryFn: () => stFn(), enabled: !!assignItem });

  const re = useMutation({
    mutationFn: () => reFn({ data: { order_id: id } }),
    onSuccess: () => { toast.success("Itens adicionados ao carrinho"); qc.invalidateQueries({ queryKey: ["dojo-store", "cart"] }); },
  });
  const at = useMutation({
    mutationFn: (payload: { order_item_id: string; student_ids: string[] }) => atFn({ data: payload }),
    onSuccess: () => { toast.success("Alunos vinculados"); setAssignItem(null); setPicked(new Set()); qc.invalidateQueries({ queryKey: ["dojo-store", "order", id] }); },
  });

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-4">
      <Link to="/dojo/app/store/pedidos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Todos os pedidos
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs text-muted-foreground">Pedido</div>
          <h1 className="text-2xl font-bold">{data.order_number}</h1>
          <div className="mt-1 flex gap-2">
            <Badge>{data.status}</Badge>
            <Badge variant="outline">{data.payment_status}</Badge>
            {data.is_wholesale && <Badge variant="secondary">Atacado</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => re.mutate()} disabled={re.isPending}>
            <Repeat className="mr-2 h-4 w-4" /> Comprar novamente
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <Card className="divide-y">
            {(data.items ?? []).map((it: any) => (
              <div key={it.id} className="flex gap-3 p-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                  {it.image_url ? <img src={it.image_url} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{it.product_name}</div>
                  {it.variant_label && <div className="text-xs text-muted-foreground">{it.variant_label}</div>}
                  <div className="text-xs text-muted-foreground">Qtd: {it.quantity} · {brl(Number(it.unit_price))}</div>
                  {it.customization && (
                    <div className="mt-1 text-[11px] text-primary">
                      ✨ Personalização: {JSON.stringify(it.customization)}
                    </div>
                  )}
                  {it.student && (
                    <div className="mt-1 text-[11px] text-muted-foreground">👤 Aluno: {it.student.full_name}</div>
                  )}
                  <div className="mt-1">
                    <button className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                            onClick={() => setAssignItem(it.id)}>
                      <Users className="h-3 w-3" /> Atribuir a alunos
                    </button>
                  </div>
                </div>
                <div className="text-right text-sm font-bold">{brl(Number(it.total_price))}</div>
              </div>
            ))}
          </Card>

          <Card className="p-4">
            <div className="text-sm font-semibold">Linha do tempo</div>
            <ul className="mt-2 space-y-1.5 text-sm">
              {(data.timeline ?? []).map((t: any) => (
                <li key={t.id} className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <div>
                    <div>{t.message ?? t.event}</div>
                    <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-BR")}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="h-fit p-4 space-y-1 text-sm">
          <div className="mb-2 font-semibold">Resumo</div>
          <div className="flex justify-between text-muted-foreground"><span>Subtotal varejo</span><span className="line-through">{brl(Number(data.retail_total))}</span></div>
          <div className="flex justify-between"><span>Subtotal</span><span>{brl(Number(data.subtotal))}</span></div>
          {Number(data.savings) > 0 && <div className="flex justify-between text-emerald-600"><span>Economia</span><span>−{brl(Number(data.savings))}</span></div>}
          <div className="flex justify-between"><span>Frete</span><span>{brl(Number(data.shipping_cost))}</span></div>
          <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span className="text-primary">{brl(Number(data.total))}</span></div>
          {data.tracking_code && <div className="mt-2 rounded-md bg-muted p-2 text-xs">📦 Rastreio: <b>{data.tracking_code}</b></div>}
          {data.invoice_url && <a href={data.invoice_url} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-primary hover:underline">Baixar nota fiscal</a>}
        </Card>
      </div>

      <Dialog open={!!assignItem} onOpenChange={(o) => !o && setAssignItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Atribuir aos alunos</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto">
            {(students ?? []).map((s: any) => (
              <label key={s.id} className="flex items-center gap-2 rounded-md p-2 hover:bg-muted">
                <Checkbox
                  checked={picked.has(s.id)}
                  onCheckedChange={(v) => {
                    const n = new Set(picked);
                    if (v) n.add(s.id); else n.delete(s.id);
                    setPicked(n);
                  }}
                />
                <span className="text-sm">{s.full_name}</span>
              </label>
            ))}
          </div>
          <Button
            onClick={() => assignItem && at.mutate({ order_item_id: assignItem, student_ids: Array.from(picked) })}
            disabled={!picked.size || at.isPending}
          >
            Confirmar ({picked.size})
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
