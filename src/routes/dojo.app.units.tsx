import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listDojoUnits, saveDojoUnit, deleteDojoUnit } from "@/lib/dojo/dojo.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Pencil } from "lucide-react";
import { DojoPageShell } from "@/components/dojo/DojoPageShell";

export const Route = createFileRoute("/dojo/app/units")({
  head: () => ({ meta: [{ title: "Unidades — AMT Dojo Manager" }] }),
  component: UnitsPage,
});

function UnitsPage() {
  const listFn = useServerFn(listDojoUnits);
  const saveFn = useServerFn(saveDojoUnit);
  const delFn = useServerFn(deleteDojoUnit);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["dojo-units"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", address: "", phone: "", active: true });

  const onSave = async () => {
    try {
      await saveFn({ data: form });
      toast.success("Salvo");
      setOpen(false); setForm({ name: "", address: "", phone: "", active: true });
      qc.invalidateQueries({ queryKey: ["dojo-units"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Excluir unidade?")) return;
    await delFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["dojo-units"] });
  };

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setForm({ name: "", address: "", phone: "", active: true })}>Nova unidade</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{form.id ? "Editar" : "Nova"} unidade</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Endereço" value={form.address ?? ""} onChange={e => setForm({ ...form, address: e.target.value })} />
          <Input placeholder="Telefone" value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <Button onClick={onSave} className="w-full">Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <DojoPageShell
      description="Cadastro de dojos e polos vinculados à sua conta."
      actions={dialog}
    >
      <div className="rounded-lg border bg-white overflow-hidden">
        {(q.data ?? []).map((u: any) => (
          <div key={u.id} className="flex items-center justify-between p-3 border-b last:border-0">
            <div>
              <div className="font-medium">{u.name}</div>
              <div className="text-xs text-muted-foreground">{u.address} · {u.phone}</div>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" onClick={() => { setForm(u); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => onDelete(u.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {(q.data ?? []).length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma unidade cadastrada.</div>}
      </div>
    </DojoPageShell>
  );
}
