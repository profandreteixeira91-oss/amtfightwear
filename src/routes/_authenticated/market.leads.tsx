import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Plus, Trash2, Search, Sparkles, Mail, MessageCircle, Instagram, Loader2, Copy, ExternalLink, Bot, MapPin, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { leadsService, type Lead } from "@/services/leadsService";
import { scrapeLeads, generateOutreach } from "@/lib/leads-scraper.functions";
import { getOutreachSettings, updateOutreachSettings, getOutreachStats, runOutreachNow, markOutreachSent } from "@/lib/outreach.functions";
import { Switch } from "@/components/ui/switch";
import { CitySearchCombobox, type SelectedCity } from "@/components/leads/CitySearchCombobox";
import { LeadsMap, type LeadPoint } from "@/components/leads/LeadsMap";
import { geocodeCity } from "@/lib/ibge";

export const Route = createFileRoute("/_authenticated/market/leads")({
  head: () => ({ meta: [{ title: "AMT MarketEngine — Lead Scraper" }] }),
  component: LeadsPage,
});

const STATUS = ["Novo", "Contactado", "Negociando", "Convertido", "Perdido"] as const;
const TYPES = ["Professor", "Academia", "Escola/Projeto Social"] as const;
const MODALITIES = ["BJJ", "Judô", "BJJ + Judô"] as const;
const PAGE_SIZE = 10;

// Sugestões de busca populares no Google para prospecção B2B de Jiu-Jitsu / Judô.
// Termos curtos, do jeito que o usuário digitaria no Google.
const SEARCH_SUGGESTIONS: Record<"google" | "instagram", string[]> = {
  google: [
    "academia de jiu jitsu",
    "escola de jiu jitsu",
    "professor de jiu jitsu faixa preta",
    "academia de judô",
    "escola de judô federada",
    "professor de judô",
    "projeto social jiu jitsu",
    "projeto social judô",
    "equipe de jiu jitsu competição",
    "loja de kimono jiu jitsu",
    "loja de kimono judô",
    "cbjj academia filiada",
    "federação jiu jitsu",
    "federação judô",
    "camp de jiu jitsu",
    "seminário faixa preta jiu jitsu",
    "kimono infantil jiu jitsu",
    "faixa preta bjj professor",
  ],
  instagram: [
    "academia bjj",
    "professor faixa preta",
    "kids jiu jitsu",
    "judô kids",
    "team jiu jitsu",
    "faixa preta judô",
    "projeto social bjj",
    "cbjj oficial",
    "cbj judô",
    "campeão brasileiro bjj",
    "equipe de competição bjj",
    "instrutor de judô",
  ],
};

function statusColor(s: string) {
  return s === "Convertido" ? "default" : s === "Perdido" ? "destructive" : s === "Negociando" ? "secondary" : "outline";
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function LeadsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [openNew, setOpenNew] = useState(false);
  const [outreach, setOutreach] = useState<{ lead: Lead; channel: "email" | "whatsapp" | "direct" } | null>(null);

  const { data: leads, isLoading } = useQuery({ queryKey: ["leads"], queryFn: leadsService.list });

  const create = useMutation({
    mutationFn: leadsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead cadastrado");
      setOpenNew(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => leadsService.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const remove = useMutation({
    mutationFn: leadsService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead removido");
    },
  });

  // Ordena por data de criação decrescente (mais recente primeiro) — o service já retorna assim,
  // mas garantimos aqui caso o cache seja mesclado.
  const sorted = useMemo(
    () =>
      [...(leads ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [leads],
  );

  const filtered = useMemo(
    () =>
      sorted.filter((l) =>
        q
          ? `${l.name} ${l.responsible ?? ""} ${l.city ?? ""} ${l.email ?? ""}`.toLowerCase().includes(q.toLowerCase())
          : true,
      ),
    [sorted, q],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset para a página 1 quando a busca muda
  function onSearch(v: string) {
    setQ(v);
    setPage(1);
  }

  return (
    <>
      <PageHeader
        eyebrow="MarketEngine"
        title="Lead Scraper"
        description="Prospecção automática de professores, academias e projetos sociais de Jiu-Jitsu/Judô — com IA para redação de contato."
        actions={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-1">
                <Plus className="h-4 w-4" /> Novo lead
              </Button>
            </DialogTrigger>
            <NewLeadDialog onSubmit={(v) => create.mutate(v)} loading={create.isPending} />
          </Dialog>
        }
      />

      <ScraperPanel />

      <MapPanel leads={leads ?? []} />

      <AutopilotPanel />

      <SectionCard title="Base de leads" delay={0.1}>
        <div className="mb-3 flex items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar por nome, cidade, e-mail..."
              className="pl-8"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {filtered.length} de {leads?.length ?? 0}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={leads?.length ? "Nenhum lead corresponde à busca" : "Nenhum lead cadastrado"}
            description="Use a busca automática acima ou cadastre um lead manualmente."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome / Academia</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações IA</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((l: Lead, i) => (
                    <motion.tr key={l.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="border-b">
                      <TableCell className="font-medium">
                        <div>{l.name}</div>
                        <div className="text-xs text-muted-foreground">{l.responsible ?? "—"}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{l.email ?? "—"}</div>
                        <div className="text-muted-foreground">{l.phone ?? ""}</div>
                      </TableCell>
                      <TableCell className="text-sm">{l.city ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{l.source ?? "Manual"}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(l.created_at)}
                      </TableCell>
                      <TableCell>
                        <Select value={l.status} onValueChange={(v) => patchStatus.mutate({ id: l.id, status: v })}>
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue>
                              <Badge variant={statusColor(l.status) as never}>{l.status}</Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title="Gerar e-mail IA" disabled={!l.email} onClick={() => setOutreach({ lead: l, channel: "email" })}>
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Gerar WhatsApp IA" disabled={!l.phone} onClick={() => setOutreach({ lead: l, channel: "whatsapp" })}>
                            <MessageCircle className="h-4 w-4 text-emerald-500" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Gerar Direct IA" onClick={() => setOutreach({ lead: l, channel: "direct" })}>
                            <Instagram className="h-4 w-4 text-pink-500" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => remove.mutate(l.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} total={filtered.length} />
          </>
        )}
      </SectionCard>

      {outreach && <OutreachDialog lead={outreach.lead} channel={outreach.channel} onClose={() => setOutreach(null)} />}
    </>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  // Janela de páginas: até 5 números centrados na página atual
  const windowSize = 5;
  const start = Math.max(1, Math.min(page - Math.floor(windowSize / 2), totalPages - windowSize + 1));
  const end = Math.min(totalPages, start + windowSize - 1);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <div>
        Mostrando <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> de{" "}
        <span className="font-medium text-foreground">{total}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="outline" className="h-8 w-8" disabled={page === 1} onClick={() => onChange(1)} title="Primeira página">
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" className="h-8 w-8" disabled={page === 1} onClick={() => onChange(page - 1)} title="Anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={p === page ? "default" : "outline"}
            className="h-8 min-w-8 px-2"
            onClick={() => onChange(p)}
          >
            {p}
          </Button>
        ))}
        <Button size="icon" variant="outline" className="h-8 w-8" disabled={page === totalPages} onClick={() => onChange(page + 1)} title="Próxima">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" className="h-8 w-8" disabled={page === totalPages} onClick={() => onChange(totalPages)} title="Última página">
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ScraperPanel() {
  const qc = useQueryClient();
  const scrapeFn = useServerFn(scrapeLeads);
  const [source, setSource] = useState<"google" | "instagram">("google");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<SelectedCity | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [modality, setModality] = useState("BJJ");

  async function pickCity(c: SelectedCity | null) {
    setCity(c);
    setCoords(null);
    if (c) {
      setGeocoding(true);
      const g = await geocodeCity({ id: 0, nome: c.name, uf: c.uf, ufName: c.ufName });
      setCoords(g);
      setGeocoding(false);
    }
  }

  const run = useMutation({
    mutationFn: () =>
      scrapeFn({
        data: {
          source,
          query,
          city: city?.name ?? null,
          state: city?.uf ?? null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          modality,
          limit: 8,
        },
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      if (r.inserted > 0) toast.success(`${r.inserted} lead${r.inserted > 1 ? "s" : ""} adicionado${r.inserted > 1 ? "s" : ""} (${r.skipped} ignorados)`);
      else toast.info(r.skipped ? `Todos os ${r.skipped} resultados já estavam na base` : "Nenhum lead encontrado — refine a busca");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SectionCard title="🔎 Busca automática de leads B2B">
      <Tabs value={source} onValueChange={(v) => setSource(v as "google" | "instagram")}>
        <TabsList>
          <TabsTrigger value="google" className="gap-2">
            <Search className="h-3.5 w-3.5" /> Google
          </TabsTrigger>
          <TabsTrigger value="instagram" className="gap-2">
            <Instagram className="h-3.5 w-3.5" /> Instagram
          </TabsTrigger>
        </TabsList>
        <TabsContent value={source} className="mt-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-3">
              <div>
                <Label>Termo de busca</Label>
                <Input
                  list={`suggest-${source}`}
                  placeholder={source === "google" ? "Ex.: academia de jiu jitsu, professor faixa preta, projeto social judô" : "Ex.: academia bjj, faixa preta, kids judo"}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <datalist id={`suggest-${source}`}>
                  {SEARCH_SUGGESTIONS[source].map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <div className="mt-1 flex flex-wrap gap-1">
                  {SEARCH_SUGGESTIONS[source].slice(0, 6).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setQuery(s)}
                      className="rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground transition hover:border-primary hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px]">
                <div>
                  <Label>Cidade (autocomplete IBGE)</Label>
                  <CitySearchCombobox value={city} onChange={pickCity} />
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {geocoding
                      ? "Localizando no mapa..."
                      : city
                        ? coords
                          ? `📍 ${city.label} · ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`
                          : city.label
                        : "Digite para ver sugestões — leads do Nordeste têm prioridade no piloto."}
                  </div>
                </div>
                <div>
                  <Label>Modalidade</Label>
                  <Select value={modality} onValueChange={setModality}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODALITIES.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full gap-2" disabled={query.length < 3 || run.isPending} onClick={() => run.mutate()}>
                {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                {run.isPending ? "Rastreando..." : `Rastrear${city ? ` em ${city.label}` : ""}`}
              </Button>
              <p className="text-xs text-muted-foreground">
                A IA vasculha {source === "google" ? "resultados do Google" : "perfis do Instagram"} de academias/professores/projetos, extrai contatos e insere aqui sem duplicar. A cidade selecionada é passada ao motor de busca para melhorar a precisão.
              </p>
            </div>
            <div>
              <Label className="mb-2 flex items-center gap-1"><MapPin className="h-3 w-3" /> Prévia da região</Label>
              <LeadsMap
                leads={[]}
                focus={coords ? { lat: coords.lat, lng: coords.lng, label: city?.label } : null}
                height={280}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </SectionCard>
  );
}

function MapPanel({ leads }: { leads: Lead[] }) {
  const points: LeadPoint[] = useMemo(
    () =>
      leads
        .filter((l) => l.lat != null && l.lng != null)
        .map((l) => ({
          id: l.id,
          name: l.name,
          city: l.city,
          state: l.state,
          lat: Number(l.lat),
          lng: Number(l.lng),
          status: l.status,
        })),
    [leads],
  );

  return (
    <SectionCard title="🗺️ Mapa de leads" delay={0.08}>
      {points.length === 0 ? (
        <EmptyState
          title="Nenhum lead geolocalizado ainda"
          description="Use a busca automática acima com uma cidade selecionada — os novos leads aparecerão no mapa com localização."
        />
      ) : (
        <>
          <div className="mb-2 text-xs text-muted-foreground">
            {points.length} de {leads.length} leads com coordenadas.
          </div>
          <LeadsMap leads={points} height={420} />
        </>
      )}
    </SectionCard>
  );
}

function OutreachDialog({ lead, channel, onClose }: { lead: Lead; channel: "email" | "whatsapp" | "direct"; onClose: () => void }) {
  const gen = useServerFn(generateOutreach);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(false);

  const run = useMutation({
    mutationFn: (angle?: string) => gen({ data: { leadId: lead.id, channel, angle } }),
    onSuccess: (r) => {
      setSubject(r.subject ?? "");
      setBody(r.body ?? "");
      setLoaded(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Auto-generate on open
  if (!loaded && !run.isPending && !run.isError) run.mutate(undefined);

  const label = channel === "email" ? "E-mail marketing" : channel === "whatsapp" ? "WhatsApp" : "Instagram Direct";
  const Icon = channel === "email" ? Mail : channel === "whatsapp" ? MessageCircle : Instagram;

  function open() {
    if (channel === "email" && lead.email) {
      const b = body.replace(/<[^>]+>/g, "\n").replace(/\n{3,}/g, "\n\n");
      window.open(`mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(b)}`);
    } else if (channel === "whatsapp" && lead.phone) {
      const phone = lead.phone.replace(/\D/g, "");
      window.open(`https://wa.me/${phone.startsWith("55") ? phone : "55" + phone}?text=${encodeURIComponent(body)}`, "_blank");
    } else if (channel === "direct") {
      const handle = extractIGHandle(lead.notes);
      if (!handle) {
        toast.error("Handle do Instagram não encontrado nas notas do lead");
        return;
      }
      openInstagramDirect(handle, body);
    }
  }

  function copyBody() {
    navigator.clipboard.writeText(body).then(() => toast.success("Copiado"));
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4" /> {label} — {lead.name}
          </DialogTitle>
          <DialogDescription>Conteúdo publicitário gerado por IA, personalizado para este lead.</DialogDescription>
        </DialogHeader>

        {run.isPending && !loaded ? (
          <div className="space-y-2 py-6">
            <Skeleton className="h-8" />
            <Skeleton className="h-32" />
          </div>
        ) : (
          <div className="space-y-3">
            {channel === "email" && (
              <div>
                <Label>Assunto</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
            )}
            <div>
              <Label>Mensagem</Label>
              <Textarea rows={channel === "email" ? 10 : 6} value={body} onChange={(e) => setBody(e.target.value)} />
              <div className="mt-1 text-xs text-muted-foreground">{body.length} caracteres</div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" className="gap-1" disabled={run.isPending} onClick={() => run.mutate("reescreva com outro ângulo, mais direto")}>
            <Sparkles className="h-4 w-4" /> Regerar
          </Button>
          <Button variant="outline" className="gap-1" onClick={copyBody}>
            <Copy className="h-4 w-4" /> Copiar
          </Button>
          <Button className="gap-1" onClick={open} disabled={!body}>
            <ExternalLink className="h-4 w-4" /> Abrir {channel === "email" ? "e-mail" : channel === "whatsapp" ? "WhatsApp" : "Instagram"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewLeadDialog({ onSubmit, loading }: { onSubmit: (v: Record<string, string>) => void; loading: boolean }) {
  const [form, setForm] = useState<Record<string, string>>({
    name: "",
    responsible: "",
    phone: "",
    email: "",
    city: "",
    modality: "BJJ",
    lead_type: "Academia",
    source: "Manual",
    notes: "",
    status: "Novo",
  });
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Novo lead</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Nome / Academia</Label>
          <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div>
          <Label>Responsável</Label>
          <Input value={form.responsible} onChange={(e) => update("responsible", e.target.value)} />
        </div>
        <div>
          <Label>Cidade</Label>
          <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>
        <div>
          <Label>E-mail</Label>
          <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select value={form.lead_type} onValueChange={(v) => update("lead_type", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Modalidade</Label>
          <Select value={form.modality} onValueChange={(v) => update("modality", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODALITIES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Observações</Label>
          <Textarea rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button disabled={!form.name || loading} onClick={() => onSubmit(form)}>
          {loading ? "Salvando..." : "Cadastrar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AutopilotPanel() {
  const qc = useQueryClient();
  const getFn = useServerFn(getOutreachSettings);
  const updateFn = useServerFn(updateOutreachSettings);
  const statsFn = useServerFn(getOutreachStats);
  const runFn = useServerFn(runOutreachNow);

  const { data: settings } = useQuery({ queryKey: ["outreach-settings"], queryFn: () => getFn() });
  const { data: stats } = useQuery({ queryKey: ["outreach-stats"], queryFn: () => statsFn(), refetchInterval: 30_000 });

  const patch = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outreach-settings"] });
      toast.success("Piloto atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runNow = useMutation({
    mutationFn: () => runFn({}),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["outreach-stats"] });
      toast.success(`Piloto executado — ${r.result?.processed ?? 0} disparo(s)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = settings as {
    enabled: boolean;
    daily_email_cap: number;
    daily_instagram_cap: number;
    weekly_cooldown_days: number;
    tone: string;
    site_url: string;
    from_email: string | null;
    from_name: string;
    priority_region: string | null;
  } | null;

  const stats24 = stats?.last24 ?? [];
  const sentEmails = stats24.filter((r) => r.channel === "email" && r.status === "sent").length;
  const sentIG = stats24.filter((r) => r.channel === "instagram").length;

  return (
    <SectionCard title="🤖 Piloto Automático de Outreach B2B" delay={0.05}>
      {!s ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
            <div>
              <div className="flex items-center gap-2 font-medium">
                <Bot className="h-4 w-4" /> Robô de disparos
                <Badge variant={s.enabled ? "default" : "outline"}>{s.enabled ? "Ativo" : "Pausado"}</Badge>
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="h-3 w-3" /> Prioridade: {s.priority_region ?? "nordeste"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Roda a cada hora. Gera copy com IA, respeita 1 disparo/{s.weekly_cooldown_days}d por lead e cap diário. Leads da região prioritária vão primeiro. Sempre inclui {s.site_url}.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" className="gap-1" disabled={runNow.isPending} onClick={() => runNow.mutate()}>
                {runNow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Rodar agora
              </Button>
              <Switch checked={s.enabled} onCheckedChange={(v) => patch.mutate({ enabled: v })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <Label>E-mails / dia</Label>
              <Input
                type="number"
                min={0}
                max={500}
                defaultValue={s.daily_email_cap}
                onBlur={(e) => patch.mutate({ daily_email_cap: Number(e.target.value) })}
              />
              <div className="mt-1 text-xs text-muted-foreground">{sentEmails}/{s.daily_email_cap} nas últimas 24h</div>
            </div>
            <div>
              <Label>Directs IG / dia</Label>
              <Input
                type="number"
                min={0}
                max={200}
                defaultValue={s.daily_instagram_cap}
                onBlur={(e) => patch.mutate({ daily_instagram_cap: Number(e.target.value) })}
              />
              <div className="mt-1 text-xs text-muted-foreground">{sentIG}/{s.daily_instagram_cap} nas últimas 24h</div>
            </div>
            <div>
              <Label>Cooldown (dias)</Label>
              <Input
                type="number"
                min={1}
                max={60}
                defaultValue={s.weekly_cooldown_days}
                onBlur={(e) => patch.mutate({ weekly_cooldown_days: Number(e.target.value) })}
              />
              <div className="mt-1 text-xs text-muted-foreground">Nunca reenvia antes disso</div>
            </div>
            <div>
              <Label>Tom da IA</Label>
              <Select value={s.tone} onValueChange={(v) => patch.mutate({ tone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultivo">Consultivo</SelectItem>
                  <SelectItem value="camarada">Camarada</SelectItem>
                  <SelectItem value="direto">Direto</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <Label>Remetente (nome)</Label>
              <Input defaultValue={s.from_name} onBlur={(e) => patch.mutate({ from_name: e.target.value })} />
            </div>
            <div>
              <Label>Remetente (e-mail)</Label>
              <Input
                type="email"
                placeholder="contato@amtfightwear.com.br"
                defaultValue={s.from_email ?? ""}
                onBlur={(e) => patch.mutate({ from_email: e.target.value || null })}
              />
            </div>
            <div>
              <Label>Site de destino</Label>
              <Input defaultValue={s.site_url} onBlur={(e) => patch.mutate({ site_url: e.target.value })} />
            </div>
            <div>
              <Label>Região prioritária</Label>
              <Select
                value={s.priority_region ?? "nordeste"}
                onValueChange={(v) => patch.mutate({ priority_region: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nordeste">Nordeste</SelectItem>
                  <SelectItem value="sudeste">Sudeste</SelectItem>
                  <SelectItem value="sul">Sul</SelectItem>
                  <SelectItem value="norte">Norte</SelectItem>
                  <SelectItem value="centro-oeste">Centro-Oeste</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <IGQueueSection queue={(stats as { igQueue?: IGQueueItem[] } | undefined)?.igQueue ?? []} onChanged={() => qc.invalidateQueries({ queryKey: ["outreach-stats"] })} />

          {stats?.recent && stats.recent.length > 0 && (
            <div>
              <Label>Últimos disparos</Label>
              <div className="mt-2 max-h-56 overflow-y-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Quando</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recent.slice(0, 15).map((r) => {
                      const rec = r as { id: string; channel: string; status: string; sent_at: string; leads?: { name?: string; city?: string } | null };
                      return (
                        <TableRow key={rec.id}>
                          <TableCell className="text-xs">{rec.leads?.name ?? "—"}</TableCell>
                          <TableCell><Badge variant="outline">{rec.channel}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={rec.status === "sent" || rec.status === "sent_manual" ? "default" : rec.status === "failed" ? "destructive" : "secondary"}>{rec.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(rec.sent_at).toLocaleString("pt-BR")}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

type IGQueueItem = {
  id: string;
  body: string | null;
  sent_at: string;
  lead_id: string;
  leads?: { name?: string | null; city?: string | null; notes?: string | null } | null;
};

function extractIGHandle(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m1 = notes.match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
  if (m1) return m1[1].replace(/\/$/, "");
  const m2 = notes.match(/IG:\s*@?([A-Za-z0-9_.]+)/i);
  if (m2) return m2[1];
  const m3 = notes.match(/@([A-Za-z0-9_.]{2,})/);
  return m3 ? m3[1] : null;
}

/**
 * Abre o Instagram Direct do lead da forma mais direta possível.
 * Não existe URL pública oficial que abra a thread de DM de um usuário pessoal
 * pela API/web (Meta bloqueia isso), então:
 *  - Mobile: tenta o deep link do app (`instagram://user?username=`) que abre o
 *    perfil dentro do app — 1 toque em "Mensagem" e o texto (já copiado) é colado.
 *    Fallback para `https://ig.me/m/{handle}` que funciona para contas Business.
 *  - Desktop: abre `https://www.instagram.com/direct/new/?username=` que exibe
 *    o modal de composição de nova mensagem já com o usuário selecionado
 *    (quando o usuário está logado). Fallback: abre o perfil.
 * Em qualquer caso, o texto é copiado para o clipboard antes de abrir.
 */
function openInstagramDirect(handle: string, body: string) {
  const clean = handle.replace(/^@/, "").replace(/\/$/, "");
  try { navigator.clipboard.writeText(body); } catch { /* ignore */ }

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

  if (isMobile) {
    // Deep link do app: abre o perfil já dentro do Instagram.
    // Se o app não estiver instalado, o fallback abre o web em ~800ms.
    const start = Date.now();
    const fallback = setTimeout(() => {
      if (Date.now() - start < 2500 && document.visibilityState === "visible") {
        window.open(`https://ig.me/m/${clean}`, "_blank");
      }
    }, 800);
    window.location.href = `instagram://user?username=${clean}`;
    window.addEventListener("pagehide", () => clearTimeout(fallback), { once: true });
    toast.success("Mensagem copiada — toque em 'Mensagem' no perfil e cole");
    return;
  }

  // Desktop: composer nativo do Instagram web (funciona se o usuário estiver logado).
  const composer = window.open(
    `https://www.instagram.com/direct/new/?username=${encodeURIComponent(clean)}`,
    "_blank",
    "noopener",
  );
  if (!composer) {
    // Popup bloqueado — cai para o perfil.
    window.location.href = `https://www.instagram.com/${clean}/`;
  }
  toast.success("Mensagem copiada — cole no campo de nova mensagem do Instagram");
}

function IGQueueSection({ queue, onChanged }: { queue: IGQueueItem[]; onChanged: () => void }) {
  const markFn = useServerFn(markOutreachSent);
  const mark = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: () => { toast.success("Marcado como enviado"); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!queue.length) return null;

  return (
    <div>
      <Label className="flex items-center gap-2">
        <Instagram className="h-4 w-4 text-pink-500" /> Fila do Instagram Direct — envio assistido ({queue.length})
      </Label>
      <p className="mt-1 text-xs text-muted-foreground">
        A Meta não permite iniciar DMs pela API. Copie a mensagem, abra o Direct do lead e cole — depois marque como enviado.
      </p>
      <div className="mt-2 space-y-2 max-h-80 overflow-y-auto">
        {queue.map((item) => {
          const handle = extractIGHandle(item.leads?.notes);
          const body = item.body ?? "";
          return (
            <div key={item.id} className="rounded border bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{item.leads?.name ?? "Lead"}</div>
                  <div className="text-xs text-muted-foreground">
                    {handle ? `@${handle}` : "sem handle"} {item.leads?.city ? `• ${item.leads.city}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(body); toast.success("Mensagem copiada"); }}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" disabled={!handle} onClick={() => {
                    if (!handle) return;
                    openInstagramDirect(handle, body);
                  }}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir Direct
                  </Button>
                  <Button size="sm" onClick={() => mark.mutate(item.id)} disabled={mark.isPending}>
                    Enviado
                  </Button>
                </div>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-xs text-foreground/80 line-clamp-4">{body}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

