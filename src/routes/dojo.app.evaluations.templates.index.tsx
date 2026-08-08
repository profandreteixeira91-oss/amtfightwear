import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  listEvalTemplates,
  listLibraryTemplates,
  saveEvalTemplate,
  deleteEvalTemplate,
  duplicateEvalTemplate,
} from "@/lib/dojo/evaluations.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Copy, Trash2, Search, Library } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dojo/app/evaluations/templates/")({
  component: TemplatesList,
});

const MODALITY_LABELS: Record<string, string> = {
  "jiu-jitsu-infantil": "Jiu-Jitsu Infantil",
  "jiu-jitsu-adulto": "Jiu-Jitsu Adulto",
  "judo": "Judô",
  "geral": "Genérico",
};

function TemplatesList() {
  const listFn = useServerFn(listEvalTemplates);
  const listLibFn = useServerFn(listLibraryTemplates);
  const saveFn = useServerFn(saveEvalTemplate);
  const dupFn = useServerFn(duplicateEvalTemplate);
  const delFn = useServerFn(deleteEvalTemplate);
  const nav = useNavigate();
  const qc = useQueryClient();

  const mine = useQuery({
    queryKey: ["eval-templates"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });
  const lib = useQuery({
    queryKey: ["eval-library"],
    queryFn: () => listLibFn(),
    staleTime: 5 * 60_000,
  });

  const [q, setQ] = useState("");
  const [modality, setModality] = useState<string>("all");

  const modalities = useMemo(
    () => Array.from(new Set((lib.data ?? []).map((r: any) => r.modality).filter(Boolean))),
    [lib.data],
  );

  const filteredLib = useMemo(() => {
    const rows = lib.data ?? [];
    return rows.filter((r: any) => {
      if (modality !== "all" && r.modality !== modality) return false;
      if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [lib.data, q, modality]);

  const [creating, setCreating] = useState(false);
  const createNew = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await saveFn({
        data: {
          title: "Novo modelo",
          method: "numeric",
          degree: 0,
          structure: { categories: [] },
        },
      });
      // Pré-popula o cache do editor para evitar novo round-trip
      qc.setQueryData(["eval-template", res.id], res);
      qc.invalidateQueries({ queryKey: ["eval-templates"] });
      nav({ to: "/dojo/app/evaluations/templates/$id", params: { id: res.id } });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };


  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const duplicate = async (id: string) => {
    if (duplicatingId) return;
    setDuplicatingId(id);
    try {
      const res: any = await dupFn({ data: { id } });
      qc.setQueryData(["eval-template", res.id], res);
      qc.invalidateQueries({ queryKey: ["eval-templates"] });
      toast.success("Modelo copiado");
      nav({ to: "/dojo/app/evaluations/templates/$id", params: { id: res.id } });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDuplicatingId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este modelo?")) return;
    try {
      await delFn({ data: { id } });
      toast.success("Excluído");
      qc.invalidateQueries({ queryKey: ["eval-templates"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 p-2 sm:p-4">
      {/* Meus modelos */}
      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-black tracking-tight text-neutral-900 uppercase">Meus Modelos</h2>
            <p className="text-sm text-neutral-500 font-medium">
              Personalize os critérios de avaliação da sua academia.
            </p>
          </div>
          <Button onClick={createNew} disabled={creating} className="h-11 bg-red-600 font-bold hover:bg-red-700">
            <Plus className="h-5 w-5 mr-2" /> {creating ? "Criando…" : "Novo Modelo"}
          </Button>
        </div>

        {mine.isLoading && <div className="py-8 text-center text-sm text-neutral-500">Carregando seus modelos…</div>}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(mine.data ?? []).map((t: any) => {
            const catCount = t.structure?.categories?.length ?? 0;
            const critCount = (t.structure?.categories ?? []).reduce(
              (s: number, c: any) => s + (c.criteria?.length ?? 0),
              0,
            );
            return (
              <Card key={t.id} className="overflow-hidden border-neutral-200 bg-white hover:bg-neutral-50 transition-all shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-bold text-neutral-900">{t.title}</CardTitle>
                    {!t.active && <Badge variant="outline" className="border-neutral-700 text-neutral-500">Inativo</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-red-400">
                      {t.modality ?? "Geral"} • v{t.version}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {catCount} categorias • {critCount} técnicas • {t.total_score ?? 0} pts
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to="/dojo/app/evaluations/templates/$id"
                      params={{ id: t.id }}
                      className="flex-1"
                      onClick={() => qc.setQueryData(["eval-template", t.id], (prev: any) => prev ?? t)}
                    >
                      <Button size="sm" variant="outline" className="w-full border-neutral-200 bg-white hover:bg-neutral-50 shadow-sm">
                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
                      </Button>
                    </Link>
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-neutral-500 hover:text-white" onClick={() => duplicate(t.id)} title="Duplicar">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-neutral-500 hover:text-red-500 hover:bg-red-500/10" onClick={() => remove(t.id)} title="Excluir">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!mine.isLoading && (mine.data ?? []).length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-neutral-200 rounded-2xl bg-white shadow-sm">
              <Plus className="h-8 w-8 text-neutral-700 mb-3" />
              <div className="text-sm font-medium text-neutral-400">Nenhum modelo criado ainda</div>
            </div>
          )}
        </div>
      </section>

      {/* Biblioteca */}
      <section className="space-y-5">
        <div className="flex flex-col gap-4 border-t border-neutral-100 pt-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/20 text-red-500">
              <Library className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-black tracking-tight text-neutral-900 uppercase">Biblioteca AMT</h2>
              <p className="text-xs text-neutral-500 font-medium">Modelos profissionais prontos para uso.</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <Input
                className="h-10 border-neutral-200 bg-white pl-9 text-xs focus:ring-red-500 sm:w-64 shadow-sm"

                placeholder="Buscar modelo na biblioteca…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:ring-red-500 shadow-sm"
              value={modality}
              onChange={(e) => setModality(e.target.value)}
            >
              <option value="all">Todas as modalidades</option>
              {modalities.map((m: any) => (
                <option key={m} value={m}>{MODALITY_LABELS[m] ?? m}</option>
              ))}
            </select>
          </div>
        </div>

        {lib.isLoading && <div className="py-8 text-center text-sm text-neutral-500">Carregando biblioteca…</div>}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLib.map((t: any) => (
            <Card key={t.id} className="group overflow-hidden border-neutral-200 bg-white transition-all hover:border-red-500/30 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-bold text-neutral-900 group-hover:text-red-600 transition-colors">{t.title}</CardTitle>
                  <Badge variant="secondary" className="bg-red-500/10 text-red-400 text-[9px] font-black uppercase tracking-tighter shrink-0 border-0">
                    {MODALITY_LABELS[t.modality] ?? t.modality ?? "—"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs leading-relaxed text-neutral-500 min-h-[32px] line-clamp-2">
                  {t.description ?? "Modelo pronto disponibilizado pelo sistema."}
                </p>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  {t.structure?.categories?.length ?? 0} categorias • {t.method}
                </div>
                <Button size="sm" className="w-full bg-neutral-50 hover:bg-red-600 hover:text-white border border-neutral-200 text-neutral-900 group-hover:border-red-600/50 transition-all shadow-sm" onClick={() => duplicate(t.id)}>
                  <Copy className="h-3.5 w-3.5 mr-2" /> Usar este modelo
                </Button>
              </CardContent>
            </Card>
          ))}
          {!lib.isLoading && filteredLib.length === 0 && (
            <div className="col-span-full py-8 text-center text-xs text-neutral-600">
              Nenhum modelo encontrado na biblioteca.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}