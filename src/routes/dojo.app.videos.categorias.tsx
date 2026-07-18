import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FolderTree, Plus, Trash2, Save, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listVideoCategories, upsertVideoCategory, deleteVideoCategory } from "@/lib/dojo/videos.functions";

export const Route = createFileRoute("/dojo/app/videos/categorias")({
  head: () => ({ meta: [{ title: "Categorias de vídeos — AMT Dojo Manager" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const qc = useQueryClient();
  const categories = useQuery({ queryKey: ["dojo-videos", "categories"], queryFn: () => listVideoCategories() });
  const [name, setName] = useState("");
  const [parent, setParent] = useState<string>("none");
  const [saving, setSaving] = useState(false);

  const rootCats = (categories.data ?? []).filter((c: any) => !c.parent_id);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await upsertVideoCategory({
        data: { name: name.trim(), parent_id: parent === "none" ? null : parent },
      });
      setName("");
      setParent("none");
      qc.invalidateQueries({ queryKey: ["dojo-videos", "categories"] });
      toast.success("Categoria criada");
    } catch (e) {
      toast.error("Erro", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir categoria (e subcategorias)?")) return;
    await deleteVideoCategory({ data: { id } });
    qc.invalidateQueries({ queryKey: ["dojo-videos", "categories"] });
  }

  async function handleRename(id: string, newName: string) {
    if (!newName.trim()) return;
    await upsertVideoCategory({ data: { id, name: newName.trim() } });
    qc.invalidateQueries({ queryKey: ["dojo-videos", "categories"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black tracking-tight">Categorias e Subcategorias</h2>
        <p className="text-sm text-muted-foreground">Organize os vídeos da sua academia em qualquer estrutura.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <Plus className="h-4 w-4" /> Nova categoria
        </h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Passagem de Guarda" />
          <Select value={parent} onValueChange={setParent}>
            <SelectTrigger><SelectValue placeholder="Categoria pai (opcional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem pai (categoria raiz)</SelectItem>
              {rootCats.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={saving || !name.trim()}>
            <Save className="mr-2 h-4 w-4" />Criar
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <FolderTree className="h-4 w-4" /> Estrutura
        </h3>
        {rootCats.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma categoria criada</p>
        ) : (
          <ul className="space-y-2">
            {rootCats.map((c: any) => {
              const subs = (categories.data ?? []).filter((x: any) => x.parent_id === c.id);
              return (
                <li key={c.id} className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      defaultValue={c.name}
                      onBlur={(e) => e.target.value !== c.name && handleRename(c.id, e.target.value)}
                      className="h-8 max-w-sm font-semibold"
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {subs.length > 0 && (
                    <ul className="mt-2 space-y-1 pl-4">
                      {subs.map((s: any) => (
                        <li key={s.id} className="flex items-center gap-2">
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          <Input
                            defaultValue={s.name}
                            onBlur={(e) => e.target.value !== s.name && handleRename(s.id, e.target.value)}
                            className="h-7 max-w-xs text-sm"
                          />
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)} className="text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
