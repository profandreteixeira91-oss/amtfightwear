import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listDojoPlans, saveDojoPlan, deleteDojoPlan, listDojoUnits } from "@/lib/dojo/dojo.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dojo/plans")({
  component: PlansPage,
});

const brl = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function PlansPage() {
  const listFn = useServerFn(listDojoPlans);
  const saveFn = useServerFn(saveDojoPlan);
  const delFn = useServerFn(deleteDojoPlan);
  const unitsFn = useServerFn(listDojoUnits);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["dojo-plans"], queryFn: () => listFn() });
  const units = useQuery({ queryKey: ["dojo-units"], queryFn: () => unitsFn() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", amount: 0, duration_days: 30, unit_id: null, active: true });

  const onSave = async () => {
    try {
      await saveFn({ data: { ...form, amount: Number(form.amount), duration_days: Number(form.duration_days) } });
      toast.success("Salvo");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["dojo-plans"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Excluir plano?")) return;
    await delFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["dojo-plans"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Planos</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={() => setForm({ name: "", amount: 0, duration_days: 30, unit_id: null, active: true })}>Novo plano</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} plano</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Valor (R$)" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              <Input placeholder="Duração em dias" type="number" value={form.duration_days} onChange={e => setForm({ ...form, duration_days: e.target.value })} />
              <select className="w-full border rounded p-2 bg-background" value={form.unit_id ?? ""} onChange={e => setForm({ ...form, unit_id: e.target.value || null })}>
                <option value="">— Sem unidade —</option>
                {(units.data ?? []).map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <Button onClick={onSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded border">
        {(q.data ?? []).map((p: any) => (
          <div key={p.id} className="flex items-center justify-between p-3 border-b last:border-0">
            <div>
              <div className="font-medium">{p.name} · {brl(p.amount)}</div>
              <div className="text-xs text-muted-foreground">{p.duration_days} dias {p.unit?.name && `· ${p.unit.name}`}</div>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" onClick={() => { setForm(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => onDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {(q.data ?? []).length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum plano cadastrado.</div>}
      </div>
    </div>
  );
}
