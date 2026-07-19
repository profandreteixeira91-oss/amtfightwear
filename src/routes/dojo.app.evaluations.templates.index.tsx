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


  const duplicate = async (id: string) => {
    try {
      const res = await dupFn({ data: { id } });
      toast.success("Modelo copiado");
      qc.invalidateQueries({ queryKey: ["eval-templates"] });
      nav({ to: "/dojo/app/evaluations/templates/$id", params: { id: res.id } });
    } catch (e: any) {
      toast.error(e.message);
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
    <div className="space-y-8">
      {/* Meus modelos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Meus modelos</h2>
            <p className="text-sm text-muted-foreground">
              Modelos criados pela sua academia.
            </p>
          </div>
          <Button onClick={createNew}>
            <Plus className="h-4 w-4 mr-1" /> Novo modelo
          </Button>
        </div>

        {mine.isLoading && <div className="text-sm text-muted-foreground">Carregando modelos…</div>}

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(mine.data ?? []).map((t: any) => {
            const catCount = t.structure?.categories?.length ?? 0;
            const critCount = (t.structure?.categories ?? []).reduce(
              (s: number, c: any) => s + (c.criteria?.length ?? 0),
              0,
            );
            return (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{t.title}</CardTitle>
                    {!t.active && <Badge variant="outline">Inativo</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    {t.modality ?? "Sem modalidade"} · v{t.version} · método {t.method}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {catCount} categorias · {critCount} critérios · {t.total_score ?? 0} pts
                  </div>
                  <div className="flex gap-2">
                    <Link to="/dojo/app/evaluations/templates/$id" params={{ id: t.id }} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full">
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                      </Button>
                    </Link>
                    <Button size="icon" variant="ghost" onClick={() => duplicate(t.id)} title="Duplicar">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(t.id)} title="Excluir">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!mine.isLoading && (mine.data ?? []).length === 0 && (
            <div className="col-span-full text-sm text-muted-foreground p-8 text-center border rounded">
              Nenhum modelo criado ainda. Duplique um da biblioteca abaixo ou crie um novo.
            </div>
          )}
        </div>
      </section>

      {/* Biblioteca */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Library className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">Biblioteca AMT</h2>
          <Badge variant="secondary" className="ml-1">{(lib.data ?? []).length}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Modelos prontos disponibilizados pelo sistema. Duplique e edite livremente.
        </p>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar modelo…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            className="border rounded-md px-3 py-2 bg-background text-sm"
            value={modality}
            onChange={(e) => setModality(e.target.value)}
          >
            <option value="all">Todas as modalidades</option>
            {modalities.map((m: any) => (
              <option key={m} value={m}>{MODALITY_LABELS[m] ?? m}</option>
            ))}
          </select>
        </div>

        {lib.isLoading && <div className="text-sm text-muted-foreground">Carregando biblioteca…</div>}
        {lib.isError && (
          <div className="text-sm text-destructive">
            Falha ao carregar biblioteca: {(lib.error as Error).message}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredLib.map((t: any) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{t.title}</CardTitle>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {MODALITY_LABELS[t.modality] ?? t.modality ?? "—"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground min-h-[32px]">
                  {t.description ?? "Modelo pronto disponibilizado pelo sistema."}
                </p>
                <div className="text-xs text-muted-foreground">
                  {t.structure?.categories?.length ?? 0} categorias · método {t.method}
                </div>
                <Button size="sm" className="w-full" onClick={() => duplicate(t.id)}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Usar este modelo
                </Button>
              </CardContent>
            </Card>
          ))}
          {!lib.isLoading && filteredLib.length === 0 && (
            <div className="col-span-full text-sm text-muted-foreground p-6 text-center border rounded">
              Nenhum modelo encontrado.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
