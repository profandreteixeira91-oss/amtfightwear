import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bulkEnrich } from "@/lib/lead-scraper.functions";
import { Sparkles, Mail, Phone, Globe } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lead-scraper/enrichment")({
  head: () => ({ meta: [{ title: "Enriquecimento — Lead Scraper IA" }] }),
  component: EnrichmentPage,
});

function EnrichmentPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const bulk = useServerFn(bulkEnrich);

  const { data, isLoading } = useQuery({
    queryKey: ["leads-to-enrich"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, city, state, website, email, phone, enrichment_status, ai_score, updated_at")
        .in("enrichment_status", ["pending", "error"])
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const mut = useMutation({
    mutationFn: async (ids: string[]) => bulk({ data: { ids } }),
    onSuccess: (r) => {
      toast.success(`Enriquecidos ${r.ok}/${r.total}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["leads-to-enrich"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao enriquecer"),
  });

  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const selectedIds = useMemo(() => Array.from(selected).slice(0, 20), [selected]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        eyebrow="Lead Scraper IA"
        title="Fila de enriquecimento"
        description="Enriqueça leads com Firecrawl + IA: contatos públicos, redes sociais, stack técnica e pontuação comercial."
        actions={
          <Button
            disabled={!selectedIds.length || mut.isPending}
            onClick={() => mut.mutate(selectedIds)}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Enriquecer ({selectedIds.length})
          </Button>
        }
      />

      <SectionCard title="Leads pendentes" description="Máximo 20 por vez. IA calcula score 0-100.">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum lead pendente de enriquecimento.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Localidade</TableHead>
                <TableHead>Contatos</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((l) => (
                <TableRow key={l.id}>
                  <TableCell><Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggle(l.id)} /></TableCell>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell className="text-sm">{l.city ?? "—"} / {l.state ?? "—"}</TableCell>
                  <TableCell className="flex gap-2 text-muted-foreground">
                    {l.email && <Mail className="h-4 w-4 text-emerald-500" />}
                    {l.phone && <Phone className="h-4 w-4 text-emerald-500" />}
                    {l.website && <Globe className="h-4 w-4 text-emerald-500" />}
                  </TableCell>
                  <TableCell>{l.ai_score ?? "—"}</TableCell>
                  <TableCell><Badge variant={l.enrichment_status === "error" ? "destructive" : "secondary"}>{l.enrichment_status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </motion.div>
  );
}
