import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getScraperSettings, updateScraperSettings } from "@/lib/lead-scraper.functions";

export const Route = createFileRoute("/_authenticated/lead-scraper/settings")({
  head: () => ({ meta: [{ title: "Configurações — Lead Scraper IA" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const get = useServerFn(getScraperSettings);
  const update = useServerFn(updateScraperSettings);
  const { data, isLoading } = useQuery({ queryKey: ["scraper-settings"], queryFn: () => get() });

  const [form, setForm] = useState<any>({});
  useEffect(() => { if (data) setForm(data); }, [data]);

  const mut = useMutation({
    mutationFn: async () => update({ data: {
      max_results_per_search: Number(form.max_results_per_search),
      timeout_ms: Number(form.timeout_ms),
      interval_ms: Number(form.interval_ms),
      max_concurrency: Number(form.max_concurrency),
      credits_available: Number(form.credits_available),
      webhook_url: form.webhook_url || null,
      webhook_secret: form.webhook_secret || null,
      auto_enrich: !!form.auto_enrich,
      auto_score: !!form.auto_score,
    } }),
    onSuccess: () => { toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["scraper-settings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const bind = (k: string) => ({ value: form[k] ?? "", onChange: (e: any) => setForm({ ...form, [k]: e.target.value }) });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader eyebrow="Lead Scraper IA" title="Configurações" description="Ajustes globais, integrações e limites operacionais." />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Limites operacionais">
          <div className="space-y-4">
            <div><Label className="mb-2 block text-xs">Máximo de resultados por pesquisa</Label><Input type="number" {...bind("max_results_per_search")} /></div>
            <div><Label className="mb-2 block text-xs">Timeout (ms)</Label><Input type="number" {...bind("timeout_ms")} /></div>
            <div><Label className="mb-2 block text-xs">Intervalo entre consultas (ms)</Label><Input type="number" {...bind("interval_ms")} /></div>
            <div><Label className="mb-2 block text-xs">Concorrência máxima</Label><Input type="number" {...bind("max_concurrency")} /></div>
            <div><Label className="mb-2 block text-xs">Créditos disponíveis</Label><Input type="number" {...bind("credits_available")} /></div>
          </div>
        </SectionCard>

        <SectionCard title="Integrações & Automação">
          <div className="space-y-4">
            <div><Label className="mb-2 block text-xs">Webhook URL</Label><Input {...bind("webhook_url")} placeholder="https://..." /></div>
            <div><Label className="mb-2 block text-xs">Webhook Secret</Label><Input {...bind("webhook_secret")} /></div>
            <div className="flex items-center justify-between"><Label>Enriquecer automaticamente</Label><Switch checked={!!form.auto_enrich} onCheckedChange={(v) => setForm({ ...form, auto_enrich: v })} /></div>
            <div className="flex items-center justify-between"><Label>Pontuar automaticamente (IA)</Label><Switch checked={!!form.auto_score} onCheckedChange={(v) => setForm({ ...form, auto_score: v })} /></div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>Salvar configurações</Button>
      </div>
    </motion.div>
  );
}
