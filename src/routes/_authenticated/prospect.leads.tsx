import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Search, Filter, Mail, MessageCircle, Instagram, Globe, Sparkles,
  ChevronLeft, ChevronRight, Star, ExternalLink, Radar,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { listLeads, enrichLead, logContactAction } from "@/lib/prospect/prospect.functions";
import { PIPELINE_STAGES, BR_STATES } from "@/features/prospect/types";
import { fmtDate, mailtoLink, whatsappLink, instagramLink, scoreToStars } from "@/features/prospect/utils";

export const Route = createFileRoute("/_authenticated/prospect/leads")({
  head: () => ({ meta: [{ title: "Leads — Prospect Engine" }] }),
  component: LeadsPage,
});

type Contact = { company_id: string; channel: string; value: string; is_primary: boolean };
type LeadRow = Record<string, unknown> & { id: string; contacts: Contact[] };

const PAGE_SIZE = 25;

function LeadsPage() {
  const [search, setSearch] = useState("");
  const [state, setState] = useState<string>("");
  const [stage, setStage] = useState<string>("");
  const [minScore, setMinScore] = useState(0);
  const [hasEmail, setHasEmail] = useState(false);
  const [hasWa, setHasWa] = useState(false);
  const [hasIg, setHasIg] = useState(false);
  const [page, setPage] = useState(0);

  const qc = useQueryClient();
  const fetchList = useServerFn(listLeads);
  const enrich = useServerFn(enrichLead);
  const logContact = useServerFn(logContactAction);

  const filters = { search, state, stage, minScore, hasEmail, hasWa, hasIg };
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["prospect", "leads", filters, page],
    queryFn: () =>
      fetchList({
        data: {
          search: search || undefined,
          state: state || undefined,
          pipeline_stage: stage || undefined,
          minScore: minScore || undefined,
          hasEmail: hasEmail || undefined,
          hasWhatsapp: hasWa || undefined,
          hasInstagram: hasIg || undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          orderBy: "created_at",
          orderDir: "desc",
        },
      }),
  });

  const enrichMut = useMutation({
    mutationFn: (id: string) => enrich({ data: { companyId: id } }),
    onSuccess: (r) => {
      toast.success(`Lead enriquecido — score ${r.score}`);
      qc.invalidateQueries({ queryKey: ["prospect"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao enriquecer"),
  });

  const contactMut = useMutation({
    mutationFn: (v: { companyId: string; channel: "email" | "whatsapp" | "instagram" | "phone" }) =>
      logContact({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospect"] }),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = (data?.rows ?? []) as LeadRow[];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Prospect Engine"
        title="Leads"
        description={`${total} leads na base — filtre, enriqueça e inicie contato em um clique.`}
        actions={
          <Button asChild size="sm">
            <Link to="/prospect/search"><Radar className="mr-2 h-4 w-4" />Nova busca</Link>
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="relative md:col-span-4">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por nome da empresa..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              />
            </div>
            <div className="md:col-span-2">
              <Select value={state || "all"} onValueChange={(v) => { setState(v === "all" ? "" : v); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos estados</SelectItem>
                  {BR_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Select value={stage || "all"} onValueChange={(v) => { setStage(v === "all" ? "" : v); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Estágio do pipeline" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos estágios</SelectItem>
                  {PIPELINE_STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Select value={String(minScore)} onValueChange={(v) => { setMinScore(Number(v)); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Score mínimo" /></SelectTrigger>
                <SelectContent>
                  {[0, 20, 40, 60, 80].map((n) => <SelectItem key={n} value={String(n)}>Score ≥ {n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Filter className="h-3 w-3" />Filtros rápidos:
            </span>
            <label className="inline-flex items-center gap-2">
              <Checkbox checked={hasEmail} onCheckedChange={(v) => { setHasEmail(!!v); setPage(0); }} />
              <Mail className="h-3.5 w-3.5" /> Com e-mail
            </label>
            <label className="inline-flex items-center gap-2">
              <Checkbox checked={hasWa} onCheckedChange={(v) => { setHasWa(!!v); setPage(0); }} />
              <MessageCircle className="h-3.5 w-3.5" /> Com WhatsApp
            </label>
            <label className="inline-flex items-center gap-2">
              <Checkbox checked={hasIg} onCheckedChange={(v) => { setHasIg(!!v); setPage(0); }} />
              <Instagram className="h-3.5 w-3.5" /> Com Instagram
            </label>
          </div>
        </CardContent>
      </Card>

      {error && <ErrorState message={String(error)} onRetry={() => refetch()} />}

      <div className="grid gap-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}

        {!isLoading && rows.length === 0 && (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
            Nenhum lead encontrado com esses filtros.
          </CardContent></Card>
        )}

        <AnimatePresence>
          {rows.map((r) => {
            const stageDef = PIPELINE_STAGES.find((s) => s.id === (r.pipeline_stage as string));
            const email = r.contacts.find((c) => c.channel === "email")?.value;
            const wa = r.contacts.find((c) => c.channel === "whatsapp")?.value;
            const ig = r.contacts.find((c) => c.channel === "instagram")?.value;
            const stars = scoreToStars(Number(r.score) || 0);
            return (
              <motion.div key={r.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card className="transition hover:border-primary/40 hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to="/prospect/$id" params={{ id: r.id }} className="truncate text-base font-semibold hover:text-primary">
                            {String(r.name)}
                          </Link>
                          {stageDef && (
                            <Badge className={`${stageDef.color} text-white text-[10px]`}>{stageDef.label}</Badge>
                          )}
                          {r.category ? <Badge variant="outline" className="text-[10px]">{String(r.category)}</Badge> : null}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {r.city ? `${r.city} — ${r.state ?? ""}` : "Localização não informada"} · Capturado em {fmtDate(String(r.created_at))}
                        </div>
                        {r.ai_summary ? (
                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{String(r.ai_summary)}</p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3.5 w-3.5 ${i < stars ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                            ))}
                            <span className="ml-1 text-xs font-semibold text-muted-foreground">{Number(r.score) || 0}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {email && <Badge variant="secondary" className="gap-1"><Mail className="h-3 w-3" />e-mail</Badge>}
                            {wa && <Badge variant="secondary" className="gap-1"><MessageCircle className="h-3 w-3" />whatsapp</Badge>}
                            {ig && <Badge variant="secondary" className="gap-1"><Instagram className="h-3 w-3" />instagram</Badge>}
                            {r.website ? <Badge variant="secondary" className="gap-1"><Globe className="h-3 w-3" />site</Badge> : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-start justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => enrichMut.mutate(r.id)} disabled={enrichMut.isPending}>
                          <Sparkles className="mr-1 h-3.5 w-3.5" />Enriquecer
                        </Button>
                        {email && (
                          <Button asChild size="sm" variant="outline"
                            onClick={() => contactMut.mutate({ companyId: r.id, channel: "email" })}>
                            <a href={mailtoLink(email)} target="_blank" rel="noreferrer"><Mail className="mr-1 h-3.5 w-3.5" />E-mail</a>
                          </Button>
                        )}
                        {wa && (
                          <Button asChild size="sm" variant="outline"
                            onClick={() => contactMut.mutate({ companyId: r.id, channel: "whatsapp" })}>
                            <a href={whatsappLink(wa)} target="_blank" rel="noreferrer"><MessageCircle className="mr-1 h-3.5 w-3.5" />WhatsApp</a>
                          </Button>
                        )}
                        {ig && (
                          <Button asChild size="sm" variant="outline"
                            onClick={() => contactMut.mutate({ companyId: r.id, channel: "instagram" })}>
                            <a href={instagramLink(ig)} target="_blank" rel="noreferrer"><Instagram className="mr-1 h-3.5 w-3.5" />DM</a>
                          </Button>
                        )}
                        <Button asChild size="sm">
                          <Link to="/prospect/$id" params={{ id: r.id }}>
                            Abrir<ExternalLink className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
