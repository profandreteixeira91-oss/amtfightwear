import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listEvalCategories, saveEvalCategory, deleteEvalCategory } from "@/lib/dojo/evaluations.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dojo/app/evaluations/categories")({
  component: CategoriesPage,
});

const SUGGESTED = [
  "Fundamentos", "Quedas", "Raspagens", "Passagens", "Montada",
  "Costas", "Finalizações", "Defesas", "Guarda", "Movimentação",
  "Rolamentos", "Conhecimento Teórico", "Regras", "Conduta",
  "Etiqueta", "Condicionamento",
];

function CategoriesPage() {
  const listFn = useServerFn(listEvalCategories);
  const saveFn = useServerFn(saveEvalCategory);
  const delFn = useServerFn(deleteEvalCategory);
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["eval-categories"], queryFn: () => listFn() });
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const create = async () => {
    if (!name.trim()) return;
    try {
      await saveFn({ data: { name, description: desc || null } });
      setName(""); setDesc("");
      qc.invalidateQueries({ queryKey: ["eval-categories"] });
      toast.success("Categoria criada");
    } catch (e: any) { toast.error(e.message); }
  };

  const quickAdd = async (n: string) => {
    try {
      await saveFn({ data: { name: n } });
      qc.invalidateQueries({ queryKey: ["eval-categories"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const rename = async (id: string, name: string) => {
    try {
      await saveFn({ data: { id, name } });
      qc.invalidateQueries({ queryKey: ["eval-categories"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir categoria?")) return;
    try {
      await delFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["eval-categories"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const existing = new Set((data ?? []).map((c: any) => c.name.toLowerCase()));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">Categorias técnicas</h2>
        <p className="text-sm text-neutral-500 font-medium">Organize suas técnicas em categorias reutilizáveis.</p>
      </div>

      <Card className="border-neutral-200 bg-white shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="grid md:grid-cols-3 gap-2">
            <Input className="border-neutral-200 bg-white shadow-sm" placeholder="Nome da categoria" value={name} onChange={(e) => setName(e.target.value)} />
            <Input className="border-neutral-200 bg-white shadow-sm" placeholder="Descrição (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <Button onClick={create} className="bg-red-600 hover:bg-red-700 font-bold"><Plus className="h-4 w-4 mr-1.5" /> Criar</Button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-4 border-t border-neutral-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 w-full mb-1">Sugestões:</span>
            {SUGGESTED.filter((s) => !existing.has(s.toLowerCase())).map((s) => (
              <button
                key={s}
                onClick={() => quickAdd(s)}
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 transition-colors"
              >+ {s}</button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {(data ?? []).map((c: any) => (
          <Card key={c.id} className="border-neutral-200 bg-white shadow-sm hover:bg-neutral-50 transition-all">
            <CardContent className="p-3 flex items-center gap-2">
              <Input
                defaultValue={c.name}
                onBlur={(e) => e.target.value !== c.name && rename(c.id, e.target.value)}
                className="flex-1"
              />
              <Button size="icon" variant="ghost" onClick={() => remove(c.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {(data ?? []).length === 0 && (
          <div className="text-sm font-medium text-neutral-400 p-10 text-center border-2 border-dashed border-neutral-100 rounded-2xl bg-white shadow-sm">
            Nenhuma categoria criada.
          </div>
        )}
      </div>
    </div>
  );
}
