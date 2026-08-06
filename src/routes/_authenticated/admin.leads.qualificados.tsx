import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Search, Mail, Instagram, Star, ExternalLink, Copy, Sparkles, MessageCircle, Globe, Send, Loader2, Image as ImageIcon, Trash2,
} from "lucide-react";
import { sendTransactionalEmail } from "@/lib/email/send";
import { PageShell } from "@/components/common/PageShell";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { listLeads, bulkUpdateLeads, bulkDeleteLeads, getSettings } from "@/lib/prospect/prospect.functions";
import { sendLeadOutreachDm, listInboxConnectedHandles } from "@/lib/ig-hub.functions";
import { PIPELINE_STAGES } from "@/features/prospect/types";
import { scoreToStars } from "@/features/prospect/utils";

export const Route = createFileRoute("/_authenticated/admin/leads/qualificados")({
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

const OUTREACH_IMAGE_URL =
  "https://api.freelovable.com.br/storage/v1/object/public/anexos/13e5c537-39e1-420f-bbbb-f3ae7eded199.png";

function defaultEmailSubject(name: string) {
  return `Parceria B2B | Kimonos, Faixas e Patches Personalizados — ${name}`;
}

function defaultEmailBody(_name: string, _pitch?: string | null) {
  return `Meu nome é Equipe Comercial e faço parte da AMT Fight Wear.

Gostaria de apresentar uma oportunidade de parceria para academias, equipes esportivas e revendedores que buscam produtos personalizados com alta qualidade.

A AMT Fight Wear fabrica:

• Kimonos personalizados para Jiu-Jitsu e Judô;
• Faixas de graduação;
• Patches bordados personalizados;
• Uniformes e roupas esportivas sob medida.

Nossos diferenciais incluem:

- Produção personalizada com a identidade visual da sua academia;
- Materiais de alta qualidade e excelente acabamento;
- Atendimento especializado durante todo o processo;
- Condições comerciais exclusivas para parceiros B2B;
- Produção para pequenas e grandes quantidades.

Nosso objetivo é ajudar nossos parceiros a oferecer produtos de alto padrão aos seus alunos, fortalecendo sua marca e gerando novas oportunidades de receita.

Conheça nosso site: www.amtfightwear.com.br

Caso tenha interesse, ficaremos felizes em apresentar nosso catálogo, esclarecer dúvidas e elaborar uma proposta personalizada.

Agradeço pela atenção e fico à disposição.`;
}

function defaultDmBody(name: string) {
  return `Olá, ${name}! Tudo bem? 👋

Vi o perfil de vocês e acredito que existe uma excelente oportunidade de parceria.

A AMT Fight Wear é especializada na fabricação de kimonos personalizados, faixas de graduação, patches bordados e roupas esportivas, atendendo academias, equipes, eventos e marcas em todo o Brasil.

Trabalhamos com produção personalizada, excelente acabamento, materiais de alta qualidade e condições especiais para parceiros B2B.

Se vocês buscam um fornecedor confiável para fortalecer a marca da academia ou ampliar o portfólio de produtos, acredito que podemos construir uma parceria de longo prazo.

Conheça nossos produtos e condições especiais para professores e academias através do nosso site: https://amtfightwear.com.br`;
}



function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

function QualifiedPage() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<OutreachDraft | null>(null);
  const [sending, setSending] = useState(false);

  const fetchList = useServerFn(listLeads);
  const bulkUpdate = useServerFn(bulkUpdateLeads);
  const bulkDelete = useServerFn(bulkDeleteLeads);
  const fetchSettings = useServerFn(getSettings);
  const fetchInboxHandles = useServerFn(listInboxConnectedHandles);
  const sendDm = useServerFn(sendLeadOutreachDm);
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["prospect", "settings"],
    queryFn: () => fetchSettings(),
    staleTime: 30_000,
  });

  const { data: inboxHandles } = useQuery({
    queryKey: ["ig", "inbox-handles"],
    queryFn: () => fetchInboxHandles(),
    staleTime: 60_000,
  });
  const connectedSet = useMemo(() => new Set((inboxHandles ?? []).map((h) => h.toLowerCase())), [inboxHandles]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["prospect", "qualified", search, stageFilter, page],
    queryFn: () =>
      fetchList({
        data: {
          search: search || undefined,
          onlyEnriched: true,
          pipeline_stage: stageFilter !== "all" ? stageFilter : undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          orderBy: "score",
          orderDir: "desc",
        },
      }),
  });

  const stageMut = useMutation({
    mutationFn: (v: { id: string; pipeline_stage: string }) =>
      bulkUpdate({ data: { ids: [v.id], patch: { pipeline_stage: v.pipeline_stage } } }),
    onSuccess: () => {
      toast.success("Estágio atualizado");
      qc.invalidateQueries({ queryKey: ["prospect"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao atualizar"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => bulkDelete({ data: { ids: [id] } }),
    onSuccess: () => {
      toast.success("Lead excluído");
      qc.invalidateQueries({ queryKey: ["prospect"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao excluir"),
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
    const vars = {
      name: String(r.name ?? ""),
      city: String((r as Record<string, unknown>).city ?? ""),
      category: String((r as Record<string, unknown>).category ?? ""),
    };
    const s = settings as { email_subject_template?: string | null; email_template?: string | null } | undefined;
    const subjectTpl = s?.email_subject_template?.trim();
    const bodyTpl = s?.email_template?.trim();
    setDraft({
      lead: r,
      channel: "email",
      email,
      igHandle: null,
      subject: subjectTpl ? renderTemplate(subjectTpl, vars) : defaultEmailSubject(vars.name),
      message: bodyTpl ? renderTemplate(bodyTpl, vars) : defaultEmailBody(vars.name, r.ai_pitch as string | null),
    });
  };

  const openInstagram = (r: LeadRow) => {
    const raw = r.contacts.find((c) => c.channel === "instagram")?.value ?? null;
    const handle = normalizeIgHandle(raw);
    if (!handle) {
      toast.error("Este lead ainda não tem Instagram cadastrado.");
      return;
    }
    const vars = {
      name: String(r.name ?? ""),
      city: String((r as Record<string, unknown>).city ?? ""),
      category: String((r as Record<string, unknown>).category ?? ""),
    };
    const s = settings as { instagram_template?: string | null } | undefined;
    const igTpl = s?.instagram_template?.trim();
    setDraft({
      lead: r,
      channel: "instagram",
      email: null,
      igHandle: handle,
      subject: "",
      message: igTpl ? renderTemplate(igTpl, vars) : defaultDmBody(vars.name),
    });
  };

  const sendEmail = async () => {
    if (!draft || draft.channel !== "email" || !draft.email) return;
    setSending(true);
    try {
      await sendTransactionalEmail({
        templateName: "outreach-b2b",
        recipientEmail: draft.email,
        idempotencyKey: `outreach-b2b-${draft.lead.id}-${Date.now()}`,
        templateData: {
          leadName: String(draft.lead.name),
          customMessage: draft.message,
          imageUrl: OUTREACH_IMAGE_URL,
        },
      });
      toast.success(`E-mail enviado para ${draft.email}`);
      setDraft(null);
    } catch (e) {
      toast.error(`Falha ao enviar: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSending(false);
    }
  };


  const sendDmDirect = async () => {
    if (!draft || draft.channel !== "instagram" || !draft.igHandle) return;
    setSending(true);
    try {
      const res = await sendDm({
        data: { igHandle: draft.igHandle, text: draft.message, leadId: draft.lead.id },
      });
      if (res.status === "sent") {
        toast.success(`DM enviado para @${draft.igHandle} pelo painel.`);
        qc.invalidateQueries({ queryKey: ["ig-conversations"] });
        qc.invalidateQueries({ queryKey: ["prospect"] });
        setDraft(null);
      } else {
        // Fallback controlado (limitação da Meta): copia e abre ig.me.
        try { await navigator.clipboard.writeText(draft.message); } catch { /* ignore */ }
        toast.warning(res.message, { duration: 8000 });
        window.open(res.igMeUrl, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      toast.error(`Falha ao enviar DM: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSending(false);
    }
  };

  const openIgFallback = async () => {
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
    <PageShell
        eyebrow="Prospect Engine"
        title="Potenciais Clientes"
        description={`${total} leads enriquecidos e prontos para abordagem. Envie e-mail ou abra o Instagram com a mensagem pré-pronta.`}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/leads" search={{ q: "", pipeline_stage: "all" }}>
              Ver todos os leads
            </Link>
          </Button>
        }
      >

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por nome da empresa..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              />
            </div>
            <Select value={stageFilter} onValueChange={(v) => { setStageFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Filtrar por estágio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estágios</SelectItem>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${s.color}`} />
                      {s.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {stageFilter !== "all" && (
              <Button variant="ghost" size="sm" onClick={() => { setStageFilter("all"); setPage(0); }}>
                Limpar
              </Button>
            )}
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
              Nenhum potencial cliente ainda. Enriqueça leads em <Link to="/admin/leads" search={{ q: "", pipeline_stage: "all" }} className="text-primary underline">Leads</Link> para vê-los aqui.
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
                        <Link to="/admin/leads/$id" params={{ id: r.id }} className="truncate font-semibold hover:text-primary">
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
                        <Select
                          value={(r.pipeline_stage as string) || ""}
                          onValueChange={(v) => stageMut.mutate({ id: r.id, pipeline_stage: v })}
                        >
                          <SelectTrigger className="h-8 w-[170px]">
                            <SelectValue placeholder="—">
                              {stageDef ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <span className={`h-2 w-2 rounded-full ${stageDef.color}`} />
                                  <span className="text-xs">{stageDef.label}</span>
                                </span>
                              ) : "—"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {PIPELINE_STAGES.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          {(() => {
                            const igHandleLc = ig ? String(ig).trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").split(/[/?#]/)[0].toLowerCase() : null;
                            const isConnected = !!igHandleLc && connectedSet.has(igHandleLc);
                            return (
                              <Button
                                size="sm"
                                variant={isConnected ? "default" : "outline"}
                                title={
                                  !ig ? "Sem Instagram cadastrado"
                                    : isConnected ? "Enviar DM direto pelo painel (inbox conectado)"
                                    : "Enviar DM (fallback pelo Instagram se ainda sem conversa)"
                                }
                                disabled={!ig}
                                onClick={() => openInstagram(r)}
                              >
                                <Instagram className="h-4 w-4" />
                              </Button>
                            );
                          })()}
                          <Button asChild size="sm" variant="ghost" title="Abrir lead">
                            <Link to="/admin/leads/$id" params={{ id: r.id }}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" title="Excluir lead" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação removerá <strong>{String(r.name)}</strong> permanentemente do Prospect Engine.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMut.mutate(r.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
                    rows={draft.channel === "email" ? 10 : 8}
                    value={draft.message}
                    onChange={(e) => setDraft({ ...draft, message: e.target.value })}
                  />
                </div>
                <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                  <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ImageIcon className="h-3 w-3" />
                    {draft.channel === "email" ? "Imagem anexada ao e-mail" : "Imagem sugerida para o Instagram (baixe e anexe)"}
                  </div>
                  <img
                    src={OUTREACH_IMAGE_URL}
                    alt="AMT Fight Wear — imagem de campanha"
                    className="max-h-48 w-full rounded object-contain"
                  />
                  {draft.channel === "instagram" && (
                    <a
                      href={OUTREACH_IMAGE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs text-primary underline"
                    >
                      Baixar imagem
                    </a>
                  )}
                </div>
                {draft.channel === "instagram" && (
                  <p className="text-xs text-muted-foreground">
                    {draft.igHandle && connectedSet.has(draft.igHandle.toLowerCase())
                      ? "Este lead já tem conversa aberta no inbox — o DM será enviado direto pelo painel."
                      : "A Meta bloqueia o primeiro DM via API. Vamos enviar direto se o lead já respondeu alguma vez; senão, abre o Instagram com a mensagem copiada."}
                  </p>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="ghost" onClick={copyMessage} disabled={sending}>
                  <Copy className="mr-2 h-4 w-4" /> Copiar
                </Button>
                {draft.channel === "email" ? (
                  <Button onClick={sendEmail} disabled={sending}>
                    {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {sending ? "Enviando..." : "Enviar e-mail"}
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={openIgFallback} disabled={sending} title="Abrir o Instagram com a mensagem copiada">
                      <Instagram className="mr-2 h-4 w-4" /> Abrir Instagram
                    </Button>
                    <Button onClick={sendDmDirect} disabled={sending}>
                      {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      {sending ? "Enviando..." : "Enviar DM pelo painel"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
