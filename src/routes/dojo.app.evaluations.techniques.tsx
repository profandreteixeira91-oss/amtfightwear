import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  listEvalTechniques, saveEvalTechnique, deleteEvalTechnique, listEvalCategories,
} from "@/lib/dojo/evaluations.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dojo/app/evaluations/techniques")({
  component: TechniquesPage,
});

const emptyForm = () => ({
  id: undefined as string | undefined,
  name: "",
  description: "",
  category_id: "",
  image_url: "",
  default_score: 10,
  required: false,
  tags: "" as string,
  archived: false,
});

function TechniquesPage() {
  const listFn = useServerFn(listEvalTechniques);
  const saveFn = useServerFn(saveEvalTechnique);
  const delFn = useServerFn(deleteEvalTechnique);
  const catFn = useServerFn(listEvalCategories);
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["eval-techniques"], queryFn: () => listFn() });
  const { data: cats } = useQuery({ queryKey: ["eval-categories"], queryFn: () => catFn() });

  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const filtered = useMemo(() => {
    return (data ?? []).filter((t: any) => {
      if (catFilter !== "all" && t.category_id !== catFilter) return false;
      if (q && !t.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, q, catFilter]);

  const openNew = () => { setForm(emptyForm()); setOpen(true); };
  const openEdit = (t: any) => {
    setForm({
      id: t.id, name: t.name, description: t.description ?? "",
      category_id: t.category_id ?? "", image_url: t.image_url ?? "",
      default_score: t.default_score, required: t.required,
      tags: (t.tags ?? []).join(", "), archived: t.archived,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    try {
      await saveFn({
        data: {
          id: form.id,
          name: form.name,
          description: form.description || null,
          category_id: form.category_id || null,
          image_url: form.image_url || null,
          default_score: Number(form.default_score),
          required: form.required,
          tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
          archived: form.archived,
        },
      });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["eval-techniques"] });
      toast.success("Salvo");
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir técnica?")) return;
    try {
      await delFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["eval-techniques"] });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">Biblioteca de técnicas</h2>
          <p className="text-sm text-neutral-500 font-medium">Cadastre técnicas reutilizáveis em vários modelos.</p>
        </div>
        <Button onClick={openNew} className="bg-red-600 hover:bg-red-700 font-bold shadow-sm"><Plus className="h-4 w-4 mr-1.5" /> Nova técnica</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input className="pl-10 h-10 border-neutral-200 bg-white shadow-sm" placeholder="Buscar técnica..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="border border-neutral-200 rounded-md px-3 py-2 bg-white text-sm text-neutral-900 shadow-sm focus:ring-red-500" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="all">Todas as categorias</option>
          {(cats ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t: any) => (
          <Card key={t.id} className="overflow-hidden border-neutral-200 bg-white hover:bg-neutral-50 transition-all shadow-sm">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-neutral-900 truncate">{t.name}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    {t.category?.name ?? "Sem categoria"} • {t.default_score} pts
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-neutral-400 hover:text-neutral-900" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-neutral-400 hover:text-red-500 hover:bg-red-50" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              {t.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {t.tags.map((tag: string) => <Badge key={tag} variant="secondary" className="text-[9px] font-black uppercase tracking-tight bg-neutral-100 text-neutral-600 border-0">{tag}</Badge>)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-sm font-medium text-neutral-400 p-10 text-center border-2 border-dashed border-neutral-100 rounded-2xl bg-white shadow-sm">
            Nenhuma técnica cadastrada.
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg">
          <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tight text-neutral-900">{form.id ? "Editar" : "Nova"} técnica</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input className="border-neutral-200 bg-white shadow-sm" placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Textarea className="border-neutral-200 bg-white shadow-sm" rows={2} placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select className="border border-neutral-200 rounded p-2 bg-white text-sm shadow-sm" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Categoria...</option>
                {(cats ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Input className="border-neutral-200 bg-white shadow-sm" type="number" min={0} placeholder="Pontos" value={form.default_score} onChange={(e) => setForm({ ...form, default_score: Number(e.target.value) })} />
            </div>
            <Input className="border-neutral-200 bg-white shadow-sm" placeholder="URL da imagem (opcional)" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            <Input className="border-neutral-200 bg-white shadow-sm" placeholder="Tags separadas por vírgula" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} />
              Obrigatória
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-red-600 hover:bg-red-700 font-bold">Salvar técnica</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
