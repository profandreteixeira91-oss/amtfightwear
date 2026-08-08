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
          <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">Biblioteca de modelos</h2>
          <p className="text-sm text-neutral-500 font-medium">
            Modelos prontos para acelerar sua implantação. Duplique e edite livremente.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            className="pl-10 h-10 border-neutral-200 bg-white shadow-sm"
            placeholder="Buscar modelo..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="h-10 border border-neutral-200 rounded-md px-3 py-2 bg-white text-sm text-neutral-900 shadow-sm"
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
          <Card key={t.id} className="overflow-hidden border-neutral-200 bg-white hover:bg-neutral-50 hover:shadow-md transition-all shadow-sm group">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-bold text-neutral-900 group-hover:text-red-600 transition-colors">{t.title}</CardTitle>
                <Badge className="bg-red-50 text-red-600 border border-red-100 text-[9px] font-black uppercase tracking-tighter shrink-0">
                  {MODALITY_LABELS[t.modality] ?? t.modality ?? "—"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-neutral-500 font-medium min-h-[32px]">
                {t.description ?? "Modelo pronto disponibilizado pelo sistema."}
              </p>
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                {t.structure?.categories?.length ?? 0} categorias · método {t.method}
              </div>
              <Button size="sm" className="w-full bg-neutral-50 hover:bg-red-600 hover:text-white border border-neutral-200 text-neutral-900 group-hover:border-red-600/50 transition-all shadow-sm" onClick={() => use(t.id)} disabled={copyingId === t.id}>
                <Copy className="h-3.5 w-3.5 mr-1.5" /> {copyingId === t.id ? "Copiando…" : "Usar este modelo"}
              </Button>
            </CardContent>
          </Card>
        ))}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-full text-sm font-medium text-neutral-400 p-10 text-center border-2 border-dashed border-neutral-100 rounded-2xl bg-white shadow-sm">
            Nenhum modelo encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
