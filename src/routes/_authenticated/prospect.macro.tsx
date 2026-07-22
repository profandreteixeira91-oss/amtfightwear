import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Instagram, Copy, ExternalLink, SkipForward, CheckCircle2, Pause, Play,
  RefreshCw, Timer, Shield, Users, Settings2, ArrowLeft, XCircle,
  Bot, Download, Zap,
} from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  listLeads, logContactAction, updateLead, getSettings,
} from "@/lib/prospect/prospect.functions";
import { PIPELINE_STAGES } from "@/features/prospect/types";

export const Route = createFileRoute("/_authenticated/prospect/macro")({
  head: () => ({
    meta: [
      { title: "Macro DM Instagram — Prospect Engine" },
      { name: "description", content: "Assistente guiado de envio de DMs no Instagram com cooldown e limites anti-spam." },
    ],
  }),
  component: MacroPage,
});

// ============ Helpers (mesmo padrão de prospect.qualified) ============

function normalizeIgHandle(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .trim() || null;
}

function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

function defaultDmBody(name: string) {
  return `Olá, ${name}! Tudo bem? 👋

Vi o perfil de vocês e acredito que existe uma excelente oportunidade de parceria.

A AMT Fight Wear é especializada na fabricação de kimonos personalizados, faixas de graduação, patches bordados e roupas esportivas, atendendo academias, equipes, eventos e marcas em todo o Brasil.

Se vocês buscam um fornecedor confiável para fortalecer a marca da academia, acredito que podemos construir uma parceria de longo prazo.

Conheça nossos produtos: https://amtfightwear.com.br`;
}

// ============ Estado persistido (localStorage) ============

type MacroPrefs = {
  cooldownMinSec: number;
  cooldownMaxSec: number;
  sessionCap: number;
  dailyCap: number;
  stageFilter: string; // "" = qualquer estágio não contatado
};
const DEFAULT_PREFS: MacroPrefs = {
  cooldownMinSec: 45,
  cooldownMaxSec: 90,
  sessionCap: 15,
  dailyCap: 40,
  stageFilter: "novo",
};
const PREFS_KEY = "prospect.macro.prefs.v1";
const COUNTER_KEY = "prospect.macro.counter.v1";
type Counter = { date: string; count: number };

function loadPrefs(): MacroPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}
function savePrefs(p: MacroPrefs) {
  try { window.localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}
function todayKey() { return new Date().toISOString().slice(0, 10); }
function loadCounter(): Counter {
  if (typeof window === "undefined") return { date: todayKey(), count: 0 };
  try {
    const raw = window.localStorage.getItem(COUNTER_KEY);
    if (!raw) return { date: todayKey(), count: 0 };
    const parsed = JSON.parse(raw) as Counter;
    if (parsed.date !== todayKey()) return { date: todayKey(), count: 0 };
    return parsed;
  } catch {
    return { date: todayKey(), count: 0 };
  }
}
function saveCounter(c: Counter) {
  try { window.localStorage.setItem(COUNTER_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

// ============ Tipos ============
type Contact = { company_id: string; channel: string; value: string; is_primary: boolean };
type LeadRow = Record<string, unknown> & { id: string; name: string; contacts: Contact[] };

// ============ Página ============

function MacroPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listLeads);
  const fetchSettings = useServerFn(getSettings);
  const logContact = useServerFn(logContactAction);
  const updLead = useServerFn(updateLead);

  const [prefs, setPrefs] = useState<MacroPrefs>(() => loadPrefs());
  const [counter, setCounter] = useState<Counter>(() => loadCounter());
  const [sessionCount, setSessionCount] = useState(0);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [paused, setPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editedMessage, setEditedMessage] = useState<string | null>(null);
  const currentIdRef = useRef<string | null>(null);

  useEffect(() => { savePrefs(prefs); }, [prefs]);
  useEffect(() => { saveCounter(counter); }, [counter]);

  // tick para countdown
  useEffect(() => {
    if (!cooldownUntil) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [cooldownUntil]);

  const settingsQ = useQuery({
    queryKey: ["prospect", "settings"],
    queryFn: () => fetchSettings(),
  });

  const queueQ = useQuery({
    queryKey: ["prospect", "macro-queue", prefs.stageFilter],
    queryFn: () =>
      fetchList({
        data: {
          hasInstagram: true,
          pipeline_stage: prefs.stageFilter || undefined,
          limit: 100,
          offset: 0,
          orderBy: "score",
          orderDir: "desc",
        },
      }),
  });

  const rawRows = (queueQ.data?.rows ?? []) as LeadRow[];
  const queue = useMemo(
    () =>
      rawRows.filter((r) => {
        if (skippedIds.has(r.id)) return false;
        const ig = r.contacts.find((c) => c.channel === "instagram")?.value;
        return !!normalizeIgHandle(ig);
      }),
    [rawRows, skippedIds],
  );

  const current = queue[0] ?? null;
  useEffect(() => {
    if (current?.id !== currentIdRef.current) {
      currentIdRef.current = current?.id ?? null;
      setEditedMessage(null);
    }
  }, [current]);

  const igTpl = (settingsQ.data as { instagram_template?: string | null } | null)?.instagram_template?.trim();
  const renderedMessage = useMemo(() => {
    if (!current) return "";
    const vars = {
      name: String(current.name ?? ""),
      city: String((current as Record<string, unknown>).city ?? ""),
      category: String((current as Record<string, unknown>).category ?? ""),
    };
    return igTpl ? renderTemplate(igTpl, vars) : defaultDmBody(vars.name);
  }, [current, igTpl]);
  const message = editedMessage ?? renderedMessage;

  const cooldownLeft = cooldownUntil ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000)) : 0;
  const canAct = !!current && !paused && cooldownLeft === 0
    && sessionCount < prefs.sessionCap
    && counter.count < prefs.dailyCap;

  const dailyReached = counter.count >= prefs.dailyCap;
  const sessionReached = sessionCount >= prefs.sessionCap;

  const logMut = useMutation({
    mutationFn: (id: string) => logContact({ data: { companyId: id, channel: "instagram" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospect"] }),
  });
  const updateMut = useMutation({
    mutationFn: (v: { id: string; patch: Record<string, unknown> }) =>
      updLead({ data: { id: v.id, patch: v.patch as never } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospect"] }),
  });

  function startCooldown() {
    const { cooldownMinSec, cooldownMaxSec } = prefs;
    const lo = Math.min(cooldownMinSec, cooldownMaxSec);
    const hi = Math.max(cooldownMinSec, cooldownMaxSec);
    const sec = Math.floor(lo + Math.random() * (hi - lo + 1));
    setCooldownUntil(Date.now() + sec * 1000);
  }

  async function doSend() {
    if (!current || !canAct) return;
    const ig = current.contacts.find((c) => c.channel === "instagram")?.value;
    const handle = normalizeIgHandle(ig);
    if (!handle) {
      toast.error("Instagram inválido; pulando lead.");
      setSkippedIds((s) => new Set(s).add(current.id));
      return;
    }
    try { await navigator.clipboard.writeText(message); } catch { /* ignore */ }
    window.open(`https://instagram.com/${handle}`, "_blank", "noopener,noreferrer");
    logMut.mutate(current.id);
    setSessionCount((v) => v + 1);
    setCounter((c) => ({ date: todayKey(), count: c.count + 1 }));
    startCooldown();
    toast.success(`Mensagem copiada · @${handle} aberto — cole no DM e envie manualmente.`);
  }

  function doSkip() {
    if (!current) return;
    setSkippedIds((s) => new Set(s).add(current.id));
  }
  function doMarkReplied() {
    if (!current) return;
    updateMut.mutate({ id: current.id, patch: { pipeline_stage: "resposta_recebida" } });
    setSkippedIds((s) => new Set(s).add(current.id));
    toast.success("Lead movido para 'Resposta recebida'.");
  }
  function doDiscard() {
    if (!current) return;
    updateMut.mutate({ id: current.id, patch: { pipeline_stage: "descartado" } });
    setSkippedIds((s) => new Set(s).add(current.id));
    toast("Lead descartado.");
  }
  function resetSession() {
    setSessionCount(0);
    setSkippedIds(new Set());
    setCooldownUntil(null);
  }

  const cooldownAvg = Math.round((prefs.cooldownMinSec + prefs.cooldownMaxSec) / 2);
  const nextLead = queue[1];

  return (
    <PageShell
      eyebrow="Prospect Engine"
      title="Macro DM Instagram"
      description="Assistente guiado passo a passo: uma mensagem por vez, com cooldown obrigatório e limites diários. Foco em cadência humana, sem disparo em massa."
      actions={
        <>
          <Button asChild variant="outline" size="sm">
            <Link to="/prospect/leads"><ArrowLeft className="mr-2 h-4 w-4" />Leads</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettings((v) => !v)}>
            <Settings2 className="mr-2 h-4 w-4" />
            {showSettings ? "Fechar ajustes" : "Ajustes"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => queueQ.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />Atualizar fila
          </Button>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Fila disponível" value={queue.length} icon={Users} />
        <StatCard
          label="Sessão"
          value={`${sessionCount} / ${prefs.sessionCap}`}
          icon={Play}
          hint={sessionReached ? "Limite de sessão atingido" : "Envios nesta sessão"}
        />
        <StatCard
          label="Hoje"
          value={`${counter.count} / ${prefs.dailyCap}`}
          icon={Shield}
          hint={dailyReached ? "Limite diário atingido" : "Envios em 24h (local)"}
        />
        <StatCard
          label="Cooldown"
          value={cooldownLeft > 0 ? `${cooldownLeft}s` : `~${cooldownAvg}s`}
          icon={Timer}
          hint={cooldownLeft > 0 ? "Aguardando próximo envio" : `Aleatório ${prefs.cooldownMinSec}–${prefs.cooldownMaxSec}s`}
        />
      </div>

      {showSettings && (
        <SectionCard
          title="Ajustes do macro"
          description="Ajuste a cadência e os limites — quanto maiores, menor o risco de bloqueio pelo Instagram."
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label>Cooldown mínimo (s)</Label>
              <Input
                type="number" min={10} max={600}
                value={prefs.cooldownMinSec}
                onChange={(e) => setPrefs({ ...prefs, cooldownMinSec: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Cooldown máximo (s)</Label>
              <Input
                type="number" min={10} max={600}
                value={prefs.cooldownMaxSec}
                onChange={(e) => setPrefs({ ...prefs, cooldownMaxSec: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Limite por sessão</Label>
              <Input
                type="number" min={1} max={200}
                value={prefs.sessionCap}
                onChange={(e) => setPrefs({ ...prefs, sessionCap: Number(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label>Limite diário</Label>
              <Input
                type="number" min={1} max={500}
                value={prefs.dailyCap}
                onChange={(e) => setPrefs({ ...prefs, dailyCap: Number(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label>Filtrar por estágio</Label>
              <Select
                value={prefs.stageFilter || "__any"}
                onValueChange={(v) => setPrefs({ ...prefs, stageFilter: v === "__any" ? "" : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any">Qualquer estágio</SelectItem>
                  {PIPELINE_STAGES.map((s: { id: string; label: string }) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Switch checked={paused} onCheckedChange={setPaused} id="pause" />
              <Label htmlFor="pause" className="cursor-pointer">Pausar macro</Label>
            </div>
            <Button variant="ghost" size="sm" onClick={resetSession}>
              <RefreshCw className="mr-2 h-4 w-4" />Zerar sessão atual
            </Button>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Próxima ação"
        description="Copie a mensagem, revise no Instagram e cole no DM. O sistema marca 'Contato iniciado' automaticamente."
      >
        {queueQ.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !current ? (
          <EmptyState
            icon={CheckCircle2}
            title="Fila vazia"
            description="Sem leads elegíveis com Instagram no estágio selecionado. Ajuste o filtro ou capture novos leads."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            {/* Card do lead */}
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Atual</div>
                  <h3 className="mt-1 text-2xl font-black leading-tight">{String(current.name)}</h3>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {[String((current as Record<string, unknown>).category ?? ""),
                      String((current as Record<string, unknown>).city ?? ""),
                      String((current as Record<string, unknown>).state ?? "")]
                      .filter(Boolean).join(" · ") || "Sem localização"}
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0">
                  Score {Number((current as Record<string, unknown>).score ?? 0)}
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Instagram className="h-4 w-4 text-pink-500" />
                <span className="font-mono text-sm">
                  @{normalizeIgHandle(current.contacts.find((c) => c.channel === "instagram")?.value)}
                </span>
              </div>

              <div className="mt-6 space-y-2">
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!canAct}
                  onClick={doSend}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Copiar e abrir Instagram
                </Button>
                {cooldownLeft > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" />Aguardando cadência…</span>
                      <span className="font-mono">{cooldownLeft}s</span>
                    </div>
                    <Progress
                      value={
                        100 -
                        (cooldownLeft /
                          Math.max(1, (prefs.cooldownMinSec + prefs.cooldownMaxSec) / 2)) *
                          100
                      }
                    />
                  </div>
                )}
                {paused && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-300">
                    Macro pausado. Reative nos ajustes para continuar.
                  </div>
                )}
                {sessionReached && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-300">
                    Limite da sessão atingido — pare, respire ou zere a sessão para continuar.
                  </div>
                )}
                {dailyReached && (
                  <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-700 dark:text-red-300">
                    Limite diário atingido. Retomar amanhã reduz o risco de bloqueio.
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={doSkip}>
                    <SkipForward className="mr-1 h-4 w-4" />Pular
                  </Button>
                  <Button variant="outline" size="sm" onClick={doMarkReplied}>
                    <CheckCircle2 className="mr-1 h-4 w-4" />Respondeu
                  </Button>
                  <Button variant="outline" size="sm" onClick={doDiscard}>
                    <XCircle className="mr-1 h-4 w-4" />Descartar
                  </Button>
                </div>

                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link to="/prospect/$id" params={{ id: current.id }}>Ver ficha completa</Link>
                </Button>
              </div>
            </div>

            {/* Editor da mensagem */}
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Mensagem gerada</div>
                  <div className="text-sm text-muted-foreground">
                    Variáveis: <code className="text-xs">{"{{name}}"}</code> <code className="text-xs">{"{{city}}"}</code> <code className="text-xs">{"{{category}}"}</code>
                  </div>
                </div>
                {editedMessage != null && (
                  <Button variant="ghost" size="sm" onClick={() => setEditedMessage(null)}>Restaurar</Button>
                )}
              </div>
              <Textarea
                className="mt-3 min-h-[280px] font-sans text-sm"
                value={message}
                onChange={(e) => setEditedMessage(e.target.value)}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{message.length} caracteres</span>
                <span>
                  Ajuste manualmente antes de copiar — variações reduzem sinal de spam.
                </span>
              </div>
              {nextLead && (
                <div className="mt-4 rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-xs">
                  <div className="text-muted-foreground">Próximo na fila</div>
                  <div className="font-semibold">{String(nextLead.name)}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Boas práticas anti-spam" description="Cadência humana &gt; volume.">
        <ul className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
          <li>• Personalize 1–2 frases antes de enviar cada mensagem — evita padrão robótico.</li>
          <li>• Não ultrapasse ~40 DMs/dia por conta nova; contas maduras aguentam mais.</li>
          <li>• Intervale envios com curtidas/comentários orgânicos no perfil do lead.</li>
          <li>• Se o Instagram exigir verificação, pause por 24h e reduza limites.</li>
        </ul>
      </SectionCard>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setPaused((p) => !p)}>
          {paused ? <><Play className="mr-2 h-4 w-4" />Retomar macro</> : <><Pause className="mr-2 h-4 w-4" />Pausar macro</>}
        </Button>
      </div>
    </PageShell>
  );
}
