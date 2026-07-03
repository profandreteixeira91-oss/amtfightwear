import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Search, Mail, Instagram, Star, ExternalLink, Copy, Sparkles, MessageCircle, Globe,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { listLeads } from "@/lib/prospect/prospect.functions";
import { PIPELINE_STAGES } from "@/features/prospect/types";
import { scoreToStars } from "@/features/prospect/utils";

export const Route = createFileRoute("/_authenticated/prospect/qualified")({
  head: () => ({ meta: [{ title: "Potenciais Clientes — Prospect Engine" }] }),
  component: QualifiedPage,
});

type Contact = { company_id: string; channel: string; value: string; is_primary: boolean };
type LeadRow = Record<string, unknown> & { id: string; contacts: Contact[] };

const PAGE_SIZE = 25;

type OutreachDraft = {
  lead: LeadRow;
  channel: "email" | "instagram";
  email: string | null;
  igHandle: string | null;
  subject: string;
  message: string;
};

function normalizeIgHandle(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  const cleaned = s
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .trim();
  return cleaned || null;
}

function defaultEmailSubject(name: string) {
  return `AMT Fight Wear — parceria com ${name}`;
}

function defaultEmailBody(name: string, pitch: string | null | undefined) {
  if (pitch && pitch.trim()) return pitch.trim();
  return `Olá, equipe ${name},\n\nSou da AMT Fight Wear — fabricamos kimonos, faixas e patches personalizados para academias e projetos de artes marciais. Gostaríamos de apresentar condições exclusivas para a ${name}.\n\nPodemos agendar uma conversa de 15 minutos esta semana?\n\nAbraço,\nEquipe AMT Fight Wear`;
}

function defaultDmBody(name: string) {
  return `Olá, ${name}! Aqui é da AMT Fight Wear 🥋 — trabalhamos com kimonos, faixas e patches personalizados para academias e professores. Podemos te enviar nosso catálogo com condições exclusivas?`;
}

function QualifiedPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<OutreachDraft | null>(null);

  const fetchList = useServerFn(listLeads);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["prospect", "qualified", search, page],
    queryFn: () =>
      fetchList({
        data: {
          search: search || undefined,
          onlyEnriched: true,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          orderBy: "score",
          orderDir: "desc",
        },
      }),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = (data?.rows ?? []) as LeadRow[];

  const openEmail = (r: LeadRow) => {
    const email = r.contacts.find((c) => c.channel === "email")?.value ?? null;
    if (!email) {
      toast.error("Este lead ainda não tem e-mail cadastrado.");
      return;
    }
    setDraft({
      lead: r,
      channel: "email",
      email,
      igHandle: null,
      subject: defaultEmailSubject(String(r.name)),
      message: defaultEmailBody(String(r.name), r.ai_pitch as string | null),
    });
  };

  const openInstagram = (r: LeadRow) => {
    const raw = r.contacts.find((c) => c.channel === "instagram")?.value ?? null;
    const handle = normalizeIgHandle(raw);
    if (!handle) {
      toast.error("Este lead ainda não tem Instagram cadastrado.");
      return;
    }
    setDraft({
      lead: r,
      channel: "instagram",
      email: null,
      igHandle: handle,
      subject: "",
      message: defaultDmBody(String(r.name)),
    });
  };

  const sendEmail = () => {
    if (!draft || draft.channel !== "email" || !draft.email) return;
    const url = `mailto:${draft.email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.message)}`;
    window.location.href = url;
    toast.success("Abrindo cliente de e-mail...");
  };

  const openIgAndCopy = async () => {
    if (!draft || draft.channel !== "instagram" || !draft.igHandle) return;
    try {
      await navigator.clipboard.writeText(draft.message);
      toast.success("Mensagem copiada — cole no chat do Instagram.");
    } catch {
      toast.message("Copie a mensagem manualmente antes de enviar.");
    }
    window.open(`https://ig.me/m/${draft.igHandle}`, "_blank", "noopener,noreferrer");
  };

  const copyMessage = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft.message);
      toast.success("Mensagem copiada.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const pageInfo = useMemo(() => `${page + 1} / ${totalPages}`, [page, totalPages]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Prospect Engine"
        title="Potenciais Clientes"
        description={`${total} leads enriquecidos e prontos para abordagem. Envie e-mail ou abra o Instagram com a mensagem pré-pronta.`}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/prospect/leads">
              Ver todos os leads
            </Link>
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar por nome da empresa..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
        </CardContent>
      </Card>

      {error && <ErrorState message={String(error)} onRetry={() => refetch()} />}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nenhum potencial cliente ainda. Enriqueça leads em <Link to="/prospect/leads" className="text-primary underline">Leads</Link> para vê-los aqui.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead className="hidden md:table-cell">Localização</TableHead>
                  <TableHead className="hidden lg:table-cell">Estágio</TableHead>
                  <TableHead>Canais</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Abordar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const stageDef = PIPELINE_STAGES.find((s) => s.id === (r.pipeline_stage as string));
                  const email = r.contacts.find((c) => c.channel === "email")?.value;
                  const ig = r.contacts.find((c) => c.channel === "instagram")?.value;
                  const wa = r.contacts.find((c) => c.channel === "whatsapp")?.value;
                  const stars = scoreToStars(Number(r.score) || 0);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="min-w-0">
                        <Link to="/prospect/$id" params={{ id: r.id }} className="truncate font-semibold hover:text-primary">
                          {String(r.name)}
                        </Link>
                        {r.category ? (
                          <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{String(r.category)}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        {r.city ? `${r.city}${r.state ? " — " + r.state : ""}` : (r.state ? String(r.state) : "—")}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {stageDef ? (
                          <Badge className={`${stageDef.color} text-white text-[10px]`}>{stageDef.label}</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {email && <Badge variant="secondary" className="gap-1 px-1.5"><Mail className="h-3 w-3" /></Badge>}
                          {wa && <Badge variant="secondary" className="gap-1 px-1.5"><MessageCircle className="h-3 w-3" /></Badge>}
                          {ig && <Badge variant="secondary" className="gap-1 px-1.5"><Instagram className="h-3 w-3" /></Badge>}
                          {r.website ? <Badge variant="secondary" className="gap-1 px-1.5"><Globe className="h-3 w-3" /></Badge> : null}
                          {!email && !wa && !ig && !r.website && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < stars ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                          ))}
                          <span className="ml-1 text-xs font-semibold text-muted-foreground">{Number(r.score) || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            title={email ? `Enviar e-mail para ${email}` : "Sem e-mail cadastrado"}
                            disabled={!email}
                            onClick={() => openEmail(r)}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            title={ig ? "Abrir Instagram com mensagem" : "Sem Instagram cadastrado"}
                            disabled={!ig}
                            onClick={() => openInstagram(r)}
                          >
                            <Instagram className="h-4 w-4" />
                          </Button>
                          <Button asChild size="sm" variant="ghost" title="Abrir lead">
                            <Link to="/prospect/$id" params={{ id: r.id }}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>Página {pageInfo}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            Anterior
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
            Próxima
          </Button>
        </div>
      </div>

      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="max-w-lg">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {draft.channel === "email" ? <Mail className="h-4 w-4" /> : <Instagram className="h-4 w-4" />}
                  {draft.channel === "email" ? "Enviar e-mail" : "Mensagem para Instagram"}
                </DialogTitle>
                <DialogDescription>
                  {draft.channel === "email"
                    ? <>Para: <span className="font-medium text-foreground">{draft.email}</span></>
                    : <>Perfil: <span className="font-medium text-foreground">@{draft.igHandle}</span></>}
                  {" · "}
                  {draft.lead.ai_pitch ? (
                    <span className="inline-flex items-center gap-1 text-primary"><Sparkles className="h-3 w-3" /> pitch gerado por IA</span>
                  ) : (
                    <span>modelo padrão AMT</span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {draft.channel === "email" && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Assunto</label>
                    <Input
                      value={draft.subject}
                      onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mensagem</label>
                  <Textarea
                    rows={draft.channel === "email" ? 10 : 6}
                    value={draft.message}
                    onChange={(e) => setDraft({ ...draft, message: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="ghost" onClick={copyMessage}>
                  <Copy className="mr-2 h-4 w-4" /> Copiar
                </Button>
                {draft.channel === "email" ? (
                  <Button onClick={sendEmail}>
                    <Mail className="mr-2 h-4 w-4" /> Abrir e-mail
                  </Button>
                ) : (
                  <Button onClick={openIgAndCopy}>
                    <Instagram className="mr-2 h-4 w-4" /> Copiar e abrir Instagram
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
