import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { listLibraryTemplates, duplicateEvalTemplate } from "@/lib/dojo/evaluations.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dojo/app/evaluations/library")({
  component: LibraryPage,
});

const MODALITY_LABELS: Record<string, string> = {
  "jiu-jitsu-infantil": "Jiu-Jitsu Infantil",
  "jiu-jitsu-adulto": "Jiu-Jitsu Adulto",
  "judo": "Judô",
  "geral": "Genérico",
};

function LibraryPage() {
  const listFn = useServerFn(listLibraryTemplates);
  const dupFn = useServerFn(duplicateEvalTemplate);
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["eval-library"],
    queryFn: () => listFn(),
  });
  const [q, setQ] = useState("");
  const [modality, setModality] = useState<string>("all");
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    return rows.filter((r: any) => {
      if (modality !== "all" && r.modality !== modality) return false;
      if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, q, modality]);

  const use = async (id: string) => {
    if (copyingId) return;
    setCopyingId(id);
    try {
      const res: any = await dupFn({ data: { id } });
      // Prime o cache do editor para abrir instantaneamente
      qc.setQueryData(["eval-template", res.id], res);
      qc.invalidateQueries({ queryKey: ["eval-templates"] });
      toast.success("Modelo copiado para sua academia");
      nav({ to: "/dojo/app/evaluations/templates/$id", params: { id: res.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    } finally {
      setCopyingId(null);
    }
  };

  const modalities = Array.from(new Set((data ?? []).map((r: any) => r.modality).filter(Boolean)));

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Biblioteca de modelos</h2>
          <p className="text-sm text-muted-foreground">
            Modelos prontos para acelerar sua implantação. Duplique e edite livremente.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar modelo..."
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

      {isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t: any) => (
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
              <Button size="sm" className="w-full" onClick={() => use(t.id)} disabled={copyingId === t.id}>
                <Copy className="h-3.5 w-3.5 mr-1.5" /> {copyingId === t.id ? "Copiando…" : "Usar este modelo"}
              </Button>
            </CardContent>
          </Card>
        ))}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground p-6 text-center border rounded">
            Nenhum modelo encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
