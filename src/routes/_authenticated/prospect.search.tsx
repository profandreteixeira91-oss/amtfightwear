import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Radar, Loader2, Swords, MapPin, X } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { runSearch, runMartialArtsSweep } from "@/lib/prospect/prospect.functions";
import { BR_STATES, SEGMENT_PRESETS, MARTIAL_ARTS_PRESETS } from "@/features/prospect/types";

export const Route = createFileRoute("/_authenticated/prospect/search")({
  head: () => ({ meta: [{ title: "Nova Busca — Prospect Engine" }] }),
  component: SearchPage,
});

const NORDESTE = ["BA", "PE", "CE", "MA", "PB", "RN", "AL", "SE", "PI"];
const SUDESTE = ["SP", "RJ", "MG", "ES"];
const SUL = ["PR", "SC", "RS"];

function SearchPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Prospect Engine"
        title="Nova Busca"
        description="Escolha entre a busca guiada por segmento livre ou o Modo Artes Marciais — varredura automatizada por academias, escolas, professores e projetos sociais de judô e jiu-jitsu."
      />

      <Tabs defaultValue="martial" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="martial">
            <Swords className="mr-2 h-4 w-4" /> Modo Artes Marciais
          </TabsTrigger>
          <TabsTrigger value="guided">
            <Radar className="mr-2 h-4 w-4" /> Busca Guiada
          </TabsTrigger>
        </TabsList>

        <TabsContent value="martial">
          <MartialArtsSweepPanel onDone={() => navigate({ to: "/prospect/leads" })} />
        </TabsContent>

        <TabsContent value="guided">
          <GuidedSearchPanel onDone={() => navigate({ to: "/prospect/leads" })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============= Modo Artes Marciais =============

function MartialArtsSweepPanel({ onDone }: { onDone: () => void }) {
  const [presets, setPresets] = useState<string[]>([
    "academias_bjj", "academias_judo", "projetos_sociais",
  ]);
  const [states, setStates] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [perPreset, setPerPreset] = useState(10);

  const runFn = useServerFn(runMartialArtsSweep);
  const runMut = useMutation({
    mutationFn: () => runFn({ data: { presets, cities, states, per_preset: perPreset, save: true } }),
    onSuccess: (r) => {
      toast.success(`${r.inserted} leads capturados em ${r.queriesRun} buscas`);
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha na varredura"),
  });

  const togglePreset = (k: string) =>
    setPresets((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const toggleState = (s: string) =>
    setStates((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const addCity = () => {
    const c = cityInput.trim();
    if (!c || cities.includes(c)) return;
    setCities((p) => [...p, c]);
    setCityInput("");
  };

  const totalLocations = Math.max(1, cities.length + states.length);
  const estimated = presets.length * totalLocations * perPreset;
  const canSubmit = presets.length > 0 && !runMut.isPending;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <SectionCard
          title="1. O que buscar"
          description="Selecione um ou mais nichos. Cada nicho roda de 3 a 6 queries diferentes no Google."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {MARTIAL_ARTS_PRESETS.map((p) => {
              const active = presets.includes(p.key);
              return (
                <button
                  key={p.key}
                  onClick={() => togglePreset(p.key)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                    active ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="text-2xl">{p.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{p.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {active ? "Selecionado" : "Clique para incluir"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="2. Onde buscar"
          description="Combine cidades específicas e/ou UFs. Deixe em branco para buscar em todo o Brasil."
        >
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label>Cidades específicas</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Recife, Salvador, São Paulo..."
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCity())}
                />
                <Button variant="outline" onClick={addCity}>Adicionar</Button>
              </div>
              {cities.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {cities.map((c) => (
                    <Badge key={c} variant="secondary" className="gap-1">
                      <MapPin className="h-3 w-3" /> {c}
                      <button onClick={() => setCities((p) => p.filter((x) => x !== c))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Atalhos regionais</Label>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setStates(NORDESTE)}>Nordeste (9 UFs)</Button>
                <Button size="sm" variant="outline" onClick={() => setStates(SUDESTE)}>Sudeste</Button>
                <Button size="sm" variant="outline" onClick={() => setStates(SUL)}>Sul</Button>
                <Button size="sm" variant="ghost" onClick={() => setStates([])}>Limpar UFs</Button>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>UFs selecionadas</Label>
              <div className="flex flex-wrap gap-1.5">
                {BR_STATES.map((s) => {
                  const active = states.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleState(s)}
                      className={`rounded-md border px-2 py-1 text-xs transition ${
                        active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="3. Volume" description="Leads a capturar por combinação nicho × localidade.">
          <div className="grid gap-1.5">
            <Label>
              Meta por combinação: <span className="font-semibold text-primary">{perPreset}</span>
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (~{estimated} leads totais estimados)
              </span>
            </Label>
            <input
              type="range" min={3} max={30} step={1} value={perPreset}
              onChange={(e) => setPerPreset(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </SectionCard>

        <div className="flex justify-end">
          <Button onClick={() => runMut.mutate()} disabled={!canSubmit} size="lg">
            {runMut.isPending
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Swords className="mr-2 h-4 w-4" />}
            Iniciar Varredura BJJ/Judô
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
        <SectionCard title="Resumo" description="Configuração atual">
          <ul className="space-y-2 text-sm">
            <li><strong>{presets.length}</strong> nichos selecionados</li>
            <li><strong>{cities.length}</strong> cidades específicas</li>
            <li><strong>{states.length}</strong> UFs</li>
            <li><strong>~{estimated}</strong> leads estimados</li>
          </ul>
        </SectionCard>

        <SectionCard title="Como funciona" description="Motor multi-query">
          <ol className="space-y-3 text-sm">
            {[
              ["Multi-query", "3–6 buscas por nicho (Google dorks)."],
              ["Fontes", "Sites, Instagram, .org.br e federações."],
              ["Dedupe global", "Por domínio e URL de perfil."],
              ["Enriquecimento", "Email, WhatsApp e IG automáticos."],
              ["Pipeline", "Leads entram no funil em \"captado\"."],
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
  );
}

// ============= Busca Guiada (legacy) =============

function GuidedSearchPanel({ onDone }: { onDone: () => void }) {
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
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao rodar busca"),
  });

  const canSubmit = segment.length >= 2 && !runMut.isPending;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <SectionCard title="Parâmetros" description="Quanto mais específico, melhor a qualidade.">
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Nome da pesquisa</Label>
              <Input placeholder="Ex: Academias de Jiu-Jitsu SP" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid gap-1.5">
              <Label>Segmento *</Label>
              <div className="flex flex-wrap gap-1.5">
                {SEGMENT_PRESETS.slice(0, 14).map((s) => (
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
        <SectionCard title="Como funciona" description="Pipeline do motor">
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
  );
}
