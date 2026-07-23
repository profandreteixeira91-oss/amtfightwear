import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Pencil, Copy, Archive, FileText, Sparkles, Search, Filter, RefreshCw, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  listTemplatesAdvanced,
  duplicateTemplate,
  setTemplateStatus,
  saveContractTemplate,
  CONTRACT_CATEGORY_LABELS,
} from "@/lib/dojo/contracts.functions";
import { CONTRACT_PRESETS, type ContractPreset } from "@/lib/dojo/contracts-presets";

export const Route = createFileRoute("/dojo/app/contracts/templates")({
  head: () => ({
    meta: [
      { title: "Biblioteca de Modelos — Central de Contratos" },
      { name: "description", content: "Modelos de contrato organizados por categoria e status." },
    ],
  }),
  component: TemplatesLibraryPage,
});

const CATEGORY_COLORS: Record<string, string> = {
  student: "bg-blue-500/10 text-blue-700 border-blue-200",
  affiliate: "bg-purple-500/10 text-purple-700 border-purple-200",
  teacher: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  employee: "bg-amber-500/10 text-amber-700 border-amber-200",
  partnership: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
  event: "bg-pink-500/10 text-pink-700 border-pink-200",
  competition: "bg-orange-500/10 text-orange-700 border-orange-200",
  lgpd: "bg-slate-500/10 text-slate-700 border-slate-200",
  legal: "bg-red-500/10 text-red-700 border-red-200",
  other: "bg-neutral-500/10 text-neutral-700 border-neutral-200",
};

function TemplatesLibraryPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const listFn = useServerFn(listTemplatesAdvanced);
  const dupFn = useServerFn(duplicateTemplate);
  const statusFn = useServerFn(setTemplateStatus);
  const saveFn = useServerFn(saveContractTemplate);

  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [q, setQ] = useState("");
  const [installing, setInstalling] = useState(false);

  const list = useQuery({
    queryKey: ["contract-templates-advanced", category, status, q],
    queryFn: () => listFn({ data: {
      category: category === "all" ? undefined : (category as any),
      status: status === "all" ? undefined : (status as any),
      q: q || undefined,
    } }),
  });

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    (list.data ?? []).forEach((t: any) => {
      const c = t.category ?? "student";
      (map[c] ||= []).push(t);
    });
    return map;
  }, [list.data]);

  const installPreset = async (preset: ContractPreset) => {
    setInstalling(true);
    try {
      const { key: _key, ...payload } = preset;
      const saved: any = await saveFn({ data: payload });
      toast.success(`Modelo instalado: ${preset.name}`);
      qc.invalidateQueries({ queryKey: ["contract-templates-advanced"] });
      qc.invalidateQueries({ queryKey: ["contract-templates"] });
      if (saved?.id) navigate({ to: "/dojo/app/contract-templates/$id", params: { id: saved.id } });
    } catch (e: any) { toast.error(e.message); }
    finally { setInstalling(false); }
  };

  const installAllPresets = async () => {
    setInstalling(true);
    try {
      for (const preset of CONTRACT_PRESETS) {
        const { key: _key, ...payload } = preset;
        await saveFn({ data: payload });
      }
      toast.success(`${CONTRACT_PRESETS.length} modelos prontos instalados`);
      qc.invalidateQueries({ queryKey: ["contract-templates-advanced"] });
      qc.invalidateQueries({ queryKey: ["contract-templates"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setInstalling(false); }
  };

  const openEditor = (id: string) => navigate({ to: "/dojo/app/contract-templates/$id", params: { id } });
  const createNew = () => navigate({ to: "/dojo/app/contract-templates/$id", params: { id: "new" } });

  const duplicate = async (id: string) => {
    try {
      const row: any = await dupFn({ data: { id } });
      toast.success("Modelo duplicado");
      qc.invalidateQueries({ queryKey: ["contract-templates-advanced"] });
      if (row?.id) openEditor(row.id);
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleArchive = async (t: any) => {
    try {
      const next = t.status === "archived" ? "active" : "archived";
      await statusFn({ data: { id: t.id, status: next } });
      toast.success(next === "archived" ? "Modelo arquivado" : "Modelo reativado");
      qc.invalidateQueries({ queryKey: ["contract-templates-advanced"] });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome do modelo…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[190px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {Object.entries(CONTRACT_CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="review">Em revisão</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => list.refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={installDefault} disabled={installing}>
              <Sparkles className="h-4 w-4 mr-1" />
              {installing ? "Instalando…" : "Modelo padrão"}
            </Button>
            <Button onClick={createNew}><Plus className="h-4 w-4 mr-1" />Novo modelo</Button>
          </div>
        </CardContent>
      </Card>

      {list.isLoading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando…</CardContent></Card>
      ) : (list.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Nenhum modelo encontrado. Comece pelo modelo padrão ou crie um novo.</div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={installDefault}><Sparkles className="h-4 w-4 mr-1" />Instalar modelo padrão</Button>
              <Button onClick={createNew}><Plus className="h-4 w-4 mr-1" />Novo modelo</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={CATEGORY_COLORS[cat] ?? ""}>{CONTRACT_CATEGORY_LABELS[cat] ?? cat}</Badge>
                <span className="text-xs text-muted-foreground">{items.length} modelo(s)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((t: any) => (
                  <Card key={t.id} className="group hover:shadow-md hover:border-primary/40 transition-all">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{t.name}</div>
                          {t.description ? <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description}</div> : null}
                        </div>
                        <div className="flex flex-col gap-1 items-end shrink-0">
                          {t.owner_id === null && <Badge className="text-[10px] bg-amber-500/15 text-amber-700 border-amber-300" variant="outline">Global</Badge>}
                          <Badge variant="outline" className="text-[10px]">v{t.current_version ?? 1}</Badge>
                          {t.status !== "active" && <Badge variant="outline" className="text-[10px] capitalize">{t.status}</Badge>}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t.page_size ?? "A4"} · Atualizado {new Date(t.updated_at).toLocaleDateString("pt-BR")}
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        <Button size="sm" variant="outline" onClick={() => openEditor(t.id)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => duplicate(t.id)}>
                          <Copy className="h-3.5 w-3.5 mr-1" />Duplicar
                        </Button>
                        {t.owner_id !== null && (
                          <Button size="sm" variant="ghost" onClick={() => toggleArchive(t)}>
                            <Archive className="h-3.5 w-3.5 mr-1" />
                            {t.status === "archived" ? "Reativar" : "Arquivar"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
