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
        <h2 className="text-lg font-semibold">Categorias técnicas</h2>
        <p className="text-sm text-muted-foreground">Organize suas técnicas em categorias reutilizáveis.</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid md:grid-cols-3 gap-2">
            <Input placeholder="Nome da categoria" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Descrição (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <Button onClick={create}><Plus className="h-4 w-4 mr-1" /> Criar</Button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-2 border-t">
            <span className="text-xs text-muted-foreground w-full mb-1">Sugestões:</span>
            {SUGGESTED.filter((s) => !existing.has(s.toLowerCase())).map((s) => (
              <button
                key={s}
                onClick={() => quickAdd(s)}
                className="text-xs px-2 py-1 rounded border hover:bg-muted"
              >+ {s}</button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {(data ?? []).map((c: any) => (
          <Card key={c.id}>
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
          <div className="text-sm text-muted-foreground p-6 text-center border rounded">
            Nenhuma categoria criada.
          </div>
        )}
      </div>
    </div>
  );
}
