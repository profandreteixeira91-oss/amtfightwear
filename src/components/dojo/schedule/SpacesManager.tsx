import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Plus, MapPin } from "lucide-react";
import { listSpaces, upsertSpace, deleteSpace } from "@/lib/dojo/schedule.functions";

export function SpacesManager() {
  const listFn = useServerFn(listSpaces);
  const saveFn = useServerFn(upsertSpace);
  const delFn = useServerFn(deleteSpace);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["dojo-spaces"], queryFn: () => listFn() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", description: "", capacity: null, active: true });

  const save = async () => {
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    try {
      await saveFn({ data: form });
      toast.success("Espaço salvo");
      setOpen(false);
      setForm({ name: "", description: "", capacity: null, active: true });
      qc.invalidateQueries({ queryKey: ["dojo-spaces"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Excluir espaço?")) return;
    await delFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["dojo-spaces"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Espaços físicos</h3>
          <p className="text-xs text-muted-foreground">Tatames, salas e áreas onde acontecem as aulas.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setForm({ name: "", description: "", capacity: null, active: true })}>
              <Plus className="h-4 w-4 mr-1" /> Novo espaço
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} espaço</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Descrição</Label><Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Capacidade</Label><Input type="number" min={1} value={form.capacity ?? ""} onChange={(e) => setForm({ ...form, capacity: e.target.value ? Number(e.target.value) : null })} /></div>
              <Button onClick={save} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(q.data ?? []).map((s: any) => (
          <div key={s.id} className="border rounded-lg bg-white p-3 flex items-start gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary shrink-0">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{s.name}</div>
              <div className="text-xs text-muted-foreground truncate">{s.description || "—"}</div>
              {s.capacity && <div className="text-[11px] text-muted-foreground mt-0.5">Cap.: {s.capacity}</div>}
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => { setForm(s); setOpen(true); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => del(s.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {(q.data ?? []).length === 0 && (
          <div className="col-span-full text-center text-sm text-muted-foreground p-6 border rounded-lg bg-white">
            Nenhum espaço cadastrado.
          </div>
        )}
      </div>
    </div>
  );
}
