import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getSettings, upsertSettings } from "@/lib/prospect/prospect.functions";
import { DEFAULT_SCORE_WEIGHTS } from "@/features/prospect/utils";
import { BR_STATES } from "@/features/prospect/types";

export const Route = createFileRoute("/_authenticated/prospect/settings")({
  head: () => ({ meta: [{ title: "Configurações — Prospect Engine" }] }),
  component: SettingsPage,
});

type Settings = {
  required_fields?: string[];
  score_weights?: Record<string, number>;
  email_template?: string | null;
  email_subject_template?: string | null;
  whatsapp_template?: string | null;
  autopilot_enabled?: boolean;
  priority_regions?: string[];
  search_interval_min?: number;
  enrichment_interval_min?: number;
};

function SettingsPage() {
  const getFn = useServerFn(getSettings);
  const saveFn = useServerFn(upsertSettings);
  const { data, isLoading } = useQuery({ queryKey: ["prospect", "settings"], queryFn: () => getFn() });

  const [state, setState] = useState<Settings>({
    required_fields: ["email", "whatsapp"],
    score_weights: { ...DEFAULT_SCORE_WEIGHTS },
    autopilot_enabled: false,
    priority_regions: ["PE", "CE", "BA"],
    search_interval_min: 120,
    enrichment_interval_min: 30,
  });

  useEffect(() => {
    if (data) setState((prev) => ({ ...prev, ...(data as Settings) }));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: (payload: Settings) => saveFn({ data: payload }),
    onSuccess: () => toast.success("Configurações salvas"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  function toggleRegion(uf: string) {
    setState((s) => {
      const cur = s.priority_regions ?? [];
      return { ...s, priority_regions: cur.includes(uf) ? cur.filter((x) => x !== uf) : [...cur, uf] };
    });
  }

  if (isLoading) return <div className="mx-auto max-w-4xl space-y-3"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Prospect Engine"
        title="Configurações"
        description="Ajuste pesos do Lead Score, templates, regiões prioritárias e autopilot."
        actions={
          <Button onClick={() => saveMut.mutate(state)} disabled={saveMut.isPending}>
            {saveMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        }
      />

      <div className="grid gap-4">
        <SectionCard title="Autopilot" description="Executa buscas e enriquecimento em segundo plano.">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Ativar piloto automático</div>
              <div className="text-xs text-muted-foreground">Roda buscas e enriquecimento continuamente com rotação regional.</div>
            </div>
            <Switch checked={!!state.autopilot_enabled}
              onCheckedChange={(v) => setState((s) => ({ ...s, autopilot_enabled: v }))} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Intervalo entre buscas (min)</Label>
              <Input type="number" min={5} max={1440} value={state.search_interval_min ?? 120}
                onChange={(e) => setState((s) => ({ ...s, search_interval_min: Number(e.target.value) }))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Intervalo de enriquecimento (min)</Label>
              <Input type="number" min={5} max={1440} value={state.enrichment_interval_min ?? 30}
                onChange={(e) => setState((s) => ({ ...s, enrichment_interval_min: Number(e.target.value) }))} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Regiões prioritárias" description="UFs com prioridade máxima na rotação do autopilot.">
          <div className="flex flex-wrap gap-1.5">
            {BR_STATES.map((uf) => {
              const active = (state.priority_regions ?? []).includes(uf);
              return (
                <button key={uf} onClick={() => toggleRegion(uf)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
                  }`}>
                  {uf}
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Lead Score — pesos" description="Somatório máximo 100. Ajuste conforme sua prioridade comercial.">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {Object.entries(state.score_weights ?? DEFAULT_SCORE_WEIGHTS).map(([k, v]) => (
              <div key={k} className="grid gap-1.5">
                <Label className="capitalize">{k}</Label>
                <Input type="number" min={0} max={100} value={v}
                  onChange={(e) => setState((s) => ({
                    ...s,
                    score_weights: { ...(s.score_weights ?? {}), [k]: Number(e.target.value) },
                  }))} />
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Soma atual: <Badge variant="outline">
              {Object.values(state.score_weights ?? DEFAULT_SCORE_WEIGHTS).reduce((a, b) => a + Number(b || 0), 0)}
            </Badge>
          </div>
        </SectionCard>

        <SectionCard title="Templates de contato" description="Use {{name}}, {{city}}, {{category}} como variáveis.">
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Assunto do e-mail</Label>
              <Input value={state.email_subject_template ?? ""}
                placeholder="Proposta comercial AMT Fight Wear — {{name}}"
                onChange={(e) => setState((s) => ({ ...s, email_subject_template: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Corpo do e-mail</Label>
              <Textarea rows={6} value={state.email_template ?? ""}
                placeholder="Prezados da {{name}}, apresentamos nossa linha B2B..."
                onChange={(e) => setState((s) => ({ ...s, email_template: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Mensagem de WhatsApp</Label>
              <Textarea rows={3} value={state.whatsapp_template ?? ""}
                placeholder="Olá, sou da AMT Fight Wear. Gostaríamos de propor..."
                onChange={(e) => setState((s) => ({ ...s, whatsapp_template: e.target.value }))} />
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
