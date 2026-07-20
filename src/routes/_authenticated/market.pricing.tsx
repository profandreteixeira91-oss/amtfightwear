import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  ExternalLink,
  RefreshCw,
  Check,
  Store,
} from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { runPriceResearch, applySuggestedPrice } from "@/lib/market-research.functions";

export const Route = createFileRoute("/_authenticated/market/pricing")({
  head: () => ({ meta: [{ title: "AMT MarketEngine — Pesquisa de Mercado & Preços" }] }),
  component: PricingPage,
});

type ProductRow = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  description: string | null;
  image_url: string | null;
};

type ResearchRow = {
  id: string;
  competitor_name: string | null;
  competitor_url: string;
  competitor_price: number | null;
  title: string | null;
  description: string | null;
  similarity_score: number | null;
  source_type: string | null;
  created_at: string;
};

type SuggestionRow = {
  id: string;
  current_price: number;
  suggested_price: number;
  min_market: number | null;
  avg_market: number | null;
  max_market: number | null;
  competitors_analyzed: number;
  position: string | null;
  reasoning: string | null;
  description_gap: string | null;
  created_at: string;
};

async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, category, price, description, image_url")
    .order("name");
  if (error) throw error;
  return (data ?? []) as ProductRow[];
}

async function fetchResearch(productId: string | null) {
  if (!productId) return [] as ResearchRow[];
  const { data, error } = await supabase
    .from("price_research")
    .select("id, competitor_name, competitor_url, competitor_price, title, description, similarity_score, source_type, created_at")
    .eq("product_id", productId)
    .order("similarity_score", { ascending: false, nullsFirst: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as ResearchRow[];
}

async function fetchSuggestion(productId: string | null) {
  if (!productId) return null;
  const { data, error } = await supabase
    .from("price_suggestions")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as SuggestionRow | null;
}

function positionBadge(position: string | null) {
  if (!position) return null;
  const p = position.toLowerCase();
  if (p.includes("abaixo") || p.includes("econ")) return <Badge variant="secondary">💸 {position}</Badge>;
  if (p.includes("premium") || p.includes("acima")) return <Badge className="bg-primary/90">👑 {position}</Badge>;
  return <Badge variant="outline">⚖️ {position}</Badge>;
}

function PricingPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qc = useQueryClient();

  const productsQ = useQuery({ queryKey: ["pricing-products"], queryFn: fetchProducts, refetchInterval: 60_000 });
  const researchQ = useQuery({
    queryKey: ["price-research", selectedId],
    queryFn: () => fetchResearch(selectedId),
    enabled: !!selectedId,
    refetchInterval: 30_000,
  });
  const suggestionQ = useQuery({
    queryKey: ["price-suggestion", selectedId],
    queryFn: () => fetchSuggestion(selectedId),
    enabled: !!selectedId,
    refetchInterval: 30_000,
  });

  const selected = productsQ.data?.find((p) => p.id === selectedId) ?? null;

  const runFn = useServerFn(runPriceResearch);
  const applyFn = useServerFn(applySuggestedPrice);

  const runMut = useMutation({
    mutationFn: (productId: string) => runFn({ data: { productId } }),
    onSuccess: (r) => {
      toast.success(`Pesquisa concluída — ${r.competitorsFound} concorrentes analisados`);
      qc.invalidateQueries({ queryKey: ["price-research", selectedId] });
      qc.invalidateQueries({ queryKey: ["price-suggestion", selectedId] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Falha ao pesquisar mercado"),
  });

  const applyMut = useMutation({
    mutationFn: ({ productId, price }: { productId: string; price: number }) =>
      applyFn({ data: { productId, price } }),
    onSuccess: () => {
      toast.success("Preço atualizado no catálogo AMT");
      qc.invalidateQueries({ queryKey: ["pricing-products"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Falha ao aplicar preço"),
  });

  const sug = suggestionQ.data;
  const delta = sug ? ((sug.suggested_price - sug.current_price) / sug.current_price) * 100 : 0;

  return (
    <PageShell
        eyebrow="MarketEngine"
        title="Pesquisa de Mercado & Preços"
        description="A IA pesquisa preços de concorrentes no Google (sites próprios e marketplaces), compara descrições e sugere um preço competitivo para cada produto da AMT."
      >

      <SectionCard title="1. Selecione um produto AMT">
        {productsQ.isLoading ? (
          <Skeleton className="h-10 w-full max-w-md" />
        ) : !productsQ.data?.length ? (
          <EmptyState icon={Store} title="Nenhum produto no catálogo" description="Cadastre produtos primeiro em Produtos." />
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={selectedId ?? ""} onValueChange={(v) => setSelectedId(v || null)}>
              <SelectTrigger className="w-full sm:w-[420px]">
                <SelectValue placeholder="Escolha um produto…" />
              </SelectTrigger>
              <SelectContent>
                {productsQ.data.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {brl(p.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => selectedId && runMut.mutate(selectedId)}
              disabled={!selectedId || runMut.isPending}
              className="gap-2"
            >
              {runMut.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {runMut.isPending ? "Pesquisando…" : "Pesquisar mercado agora"}
            </Button>
          </div>
        )}
      </SectionCard>

      {selected && (
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-6 grid gap-6"
        >
          <SectionCard title="Produto AMT selecionado">
            <div className="flex gap-4">
              {selected.image_url && (
                <img src={selected.image_url} alt={selected.name} className="h-24 w-24 rounded-lg object-cover ring-1 ring-border" />
              )}
              <div className="flex-1">
                <div className="text-lg font-semibold">{selected.name}</div>
                <div className="text-sm text-muted-foreground">{selected.category ?? "Sem categoria"}</div>
                <div className="mt-2 text-2xl font-black text-primary">{brl(selected.price)}</div>
                {selected.description && (
                  <div className="mt-2 line-clamp-3 text-xs text-muted-foreground">{selected.description}</div>
                )}
              </div>
            </div>
          </SectionCard>

          {suggestionQ.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : sug ? (
            <SectionCard title="🧠 Sugestão da IA">
              <div className="mb-4 text-xs text-muted-foreground">
                Baseado em {sug.competitors_analyzed} concorrentes — {new Date(sug.created_at).toLocaleString("pt-BR")}
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <StatCard label="Preço atual AMT" value={brl(sug.current_price)} icon={Minus} />
                <StatCard
                  label="Preço sugerido"
                  value={brl(sug.suggested_price)}
                  icon={delta >= 0 ? TrendingUp : TrendingDown}
                  delta={delta}
                />
                <StatCard label="Mercado (média)" value={sug.avg_market ? brl(sug.avg_market) : "—"} icon={Sparkles} />
                <StatCard
                  label="Faixa mercado"
                  value={`${sug.min_market ? brl(sug.min_market) : "—"} → ${sug.max_market ? brl(sug.max_market) : "—"}`}
                  icon={Store}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {positionBadge(sug.position)}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => selectedId && applyMut.mutate({ productId: selectedId, price: sug.suggested_price })}
                  disabled={applyMut.isPending}
                >
                  <Check className="h-4 w-4" />
                  Aplicar preço sugerido no catálogo
                </Button>
              </div>

              {sug.reasoning && (
                <div className="mt-4 rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Justificativa
                  </div>
                  {sug.reasoning}
                </div>
              )}
              {sug.description_gap && (
                <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm leading-relaxed">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
                    Gap de descrição
                  </div>
                  {sug.description_gap}
                </div>
              )}
            </SectionCard>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="Sem sugestão ainda"
              description='Clique em "Pesquisar mercado agora" para a IA analisar concorrentes e sugerir um preço.'
            />
          )}

          <SectionCard title="🔎 Concorrentes analisados">
            {researchQ.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : !researchQ.data?.length ? (
              <EmptyState icon={Search} title="Nenhuma pesquisa executada" description="Rode a pesquisa acima para popular." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fonte</TableHead>
                      <TableHead>Produto concorrente</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Similaridade</TableHead>
                      <TableHead>Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {researchQ.data.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="text-sm font-medium">{r.competitor_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.source_type ?? "—"}</div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="text-sm font-medium">{r.title ?? "—"}</div>
                          {r.description && (
                            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {r.competitor_price != null ? brl(r.competitor_price) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.similarity_score != null ? (
                            <Badge variant={r.similarity_score >= 0.75 ? "default" : "outline"}>
                              {(r.similarity_score * 100).toFixed(0)}%
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <a
                            href={r.competitor_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            abrir <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </motion.div>
      )}
    </PageShell>
  );
}
