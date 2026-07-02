import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Radar, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { runSearch } from "@/lib/prospect/prospect.functions";
import { BR_STATES, SEGMENT_PRESETS } from "@/features/prospect/types";

export const Route = createFileRoute("/_authenticated/prospect/search")({
  head: () => ({ meta: [{ title: "Nova Busca — Prospect Engine" }] }),
  component: SearchPage,
});

function SearchPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [segment, setSegment] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState<string>("");
  const [keywords, setKeywords] = useState("");
  const [target, setTarget] = useState(20);

  const runFn = useServerFn(runSearch);
  const runMut = useMutation({
    mutationFn: () =>
      runFn({
        data: {
          name: name || `Busca ${segment} ${city || state || "BR"}`,
          segment, city: city || null, state: state || null,
          country: "BR", keywords: keywords || null,
          target_count: target, save: true,
        },
      }),
    onSuccess: (r) => {
      toast.success(`${r.inserted} leads capturados`);
      navigate({ to: "/prospect/leads" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao rodar busca"),
  });

  const canSubmit = segment.length >= 2 && !runMut.isPending;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Prospect Engine"
        title="Nova Busca Guiada"
        description="Descubra empresas por segmento e localização. O motor captura, dedupa e enfileira para enriquecimento automático."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="Parâmetros" description="Quanto mais específico, melhor a qualidade dos resultados.">
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Nome da pesquisa</Label>
                <Input placeholder="Ex: Academias de Jiu-Jitsu SP" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="grid gap-1.5">
                <Label>Segmento *</Label>
                <div className="flex flex-wrap gap-1.5">
                  {SEGMENT_PRESETS.slice(0, 12).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSegment(s)}
                      className={`rounded-md border px-2 py-1 text-xs transition ${
                        segment === s ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <Input className="mt-2" placeholder="Ou digite: dojôs de jiu-jitsu, academias, lutas..."
                  value={segment} onChange={(e) => setSegment(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Cidade</Label>
                  <Input placeholder="Ex: Recife" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>UF</Label>
                  <Select value={state || "all"} onValueChange={(v) => setState(v === "all" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {BR_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label>Palavras-chave (opcional)</Label>
                <Textarea rows={2} placeholder="Ex: kimono, faixa preta, competição, IBJJF..."
                  value={keywords} onChange={(e) => setKeywords(e.target.value)} />
              </div>

              <div className="grid gap-1.5">
                <Label>Meta de leads: <span className="font-semibold text-primary">{target}</span></Label>
                <input type="range" min={5} max={100} step={5} value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  className="w-full accent-primary" />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => runMut.mutate()} disabled={!canSubmit} size="lg">
                  {runMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radar className="mr-2 h-4 w-4" />}
                  Iniciar Busca
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>

        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
          <SectionCard title="Como funciona" description="Pipeline do motor de busca">
            <ol className="space-y-3 text-sm">
              {[
                ["Descoberta", "Google + fontes públicas indexadas."],
                ["Dedupe", "Normalização por nome e URL."],
                ["Enriquecimento", "Firecrawl extrai e-mail, WhatsApp, IG."],
                ["Score", "Cálculo 0-100 por completude de dados."],
                ["Pipeline", "Lead entra no funil em \"captado\"."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <Badge className="h-6 min-w-6 justify-center rounded-full">{i + 1}</Badge>
                  <div>
                    <div className="font-semibold">{t}</div>
                    <div className="text-xs text-muted-foreground">{d}</div>
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>
        </motion.div>
      </div>
    </div>
  );
}
