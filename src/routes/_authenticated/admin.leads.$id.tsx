import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, Mail, MessageCircle, Instagram, Globe, Phone, MapPin,
  Sparkles, Star, Wand2, Building2,
} from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { SectionCard } from "@/components/common/SectionCard";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getLead, updateLead, enrichLead, generateAiPitch, logContactAction,
} from "@/lib/prospect/prospect.functions";
import { PIPELINE_STAGES } from "@/features/prospect/types";
import {
  fmtDate, fmtDateTime, mailtoLink, whatsappLink, instagramLink, scoreToStars,
} from "@/features/prospect/utils";

export const Route = createFileRoute("/_authenticated/admin/leads/$id")({
  head: () => ({ meta: [{ title: "Lead — Prospect Engine" }] }),
  component: LeadDetailPage,
});

type Contact = { id: string; channel: string; value: string; is_primary: boolean; source: string | null };
type Timeline = { id: string; event_type: string; title: string; created_at: string };
type Company = Record<string, unknown> & { id: string; name: string; pipeline_stage: string; score: number };

function LeadDetailPage() {
  const { id } = useParams({ from: "/_authenticated/prospect/$id" });
  const qc = useQueryClient();
  const getFn = useServerFn(getLead);
  const updateFn = useServerFn(updateLead);
  const enrichFn = useServerFn(enrichLead);
  const pitchFn = useServerFn(generateAiPitch);
  const contactFn = useServerFn(logContactAction);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["prospect", "lead", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const stageMut = useMutation({
    mutationFn: (stage: string) => updateFn({ data: { id, patch: { pipeline_stage: stage } } }),
    onSuccess: () => { toast.success("Estágio atualizado"); qc.invalidateQueries({ queryKey: ["prospect"] }); },
  });
  const enrichMut = useMutation({
    mutationFn: () => enrichFn({ data: { companyId: id } }),
    onSuccess: (r) => { toast.success(`Enriquecido. Score ${r.score}`); qc.invalidateQueries({ queryKey: ["prospect"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  const pitchMut = useMutation({
    mutationFn: () => pitchFn({ data: { companyId: id } }),
    onSuccess: () => { toast.success("Pitch gerado"); qc.invalidateQueries({ queryKey: ["prospect", "lead", id] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  const contactMut = useMutation({
    mutationFn: (channel: "email" | "whatsapp" | "instagram" | "phone") =>
      contactFn({ data: { companyId: id, channel } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospect"] }),
  });

  if (isLoading) return <div className="mx-auto max-w-5xl space-y-3"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;
  if (error || !data) return <ErrorState message={error ? String(error) : "Lead não encontrado"} onRetry={() => refetch()} />;

  const company = data.company as Company;
  const contacts = (data.contacts as Contact[]) ?? [];
  const timeline = (data.timeline as Timeline[]) ?? [];
  const stars = scoreToStars(Number(company.score) || 0);

  const email = contacts.find((c) => c.channel === "email")?.value;
  const wa = contacts.find((c) => c.channel === "whatsapp")?.value;
  const ig = contacts.find((c) => c.channel === "instagram")?.value;
  const phone = contacts.find((c) => c.channel === "phone")?.value ?? (company.phone as string | undefined);

  return (
    <PageShell
        eyebrow={<Link to="/admin/leads" search={{ focus: "" }} className="inline-flex items-center gap-1 hover:text-primary"><ArrowLeft className="h-3 w-3" />Voltar aos leads</Link>}
        title={String(company.name)}
        description={<span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{String(company.category ?? "sem categoria")} · {String(company.city ?? "-")} {company.state ? `— ${company.state}` : ""}</span>}
        actions={
          <>
            <Button variant="outline" onClick={() => enrichMut.mutate()} disabled={enrichMut.isPending}>
              <Sparkles className="mr-2 h-4 w-4" />Enriquecer
            </Button>
            <Button onClick={() => pitchMut.mutate()} disabled={pitchMut.isPending}>
              <Wand2 className="mr-2 h-4 w-4" />Gerar pitch IA
            </Button>
          </>
        }
      >

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 lg:col-span-2">
          <SectionCard title="Visão geral">
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Score" value={
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < stars ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                  ))}
                  <span className="ml-2 text-lg font-bold">{Number(company.score) || 0}</span>
                </div>
              } />
              <Metric label="Estágio" value={
                <Select value={String(company.pipeline_stage)} onValueChange={(v) => stageMut.mutate(v)}>
                  <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              } />
              <Metric label="Capturado em" value={fmtDate(String(company.created_at))} />
              <Metric label="Enriquecido em" value={company.enriched_at ? fmtDate(String(company.enriched_at)) : "—"} />
              <Metric label="Último contato" value={company.last_contacted_at ? fmtDateTime(String(company.last_contacted_at)) : "—"} />
              <Metric label="Origem" value={String(company.origin ?? "—")} />
            </div>

            {company.ai_summary ? (
              <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
                <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">Resumo IA</div>
                <p className="text-muted-foreground">{String(company.ai_summary)}</p>
              </div>
            ) : null}

            {company.ai_pitch ? (
              <div className="mt-3 rounded-md border border-border/40 bg-muted/30 p-3 text-sm">
                <div className="mb-1 text-xs font-semibold uppercase tracking-widest">Pitch comercial IA</div>
                <p className="whitespace-pre-line text-muted-foreground">{String(company.ai_pitch)}</p>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Timeline" description={`${timeline.length} eventos`}>
            {timeline.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum evento ainda.</div>
            ) : (
              <ol className="relative space-y-3 border-l border-border/60 pl-4">
                {timeline.map((t) => (
                  <motion.li key={t.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                    <div className="text-sm font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.event_type} · {fmtDateTime(t.created_at)}</div>
                  </motion.li>
                ))}
              </ol>
            )}
          </SectionCard>
        </div>

        <div className="grid gap-4">
          <SectionCard title="Ações rápidas">
            <div className="grid gap-2">
              {email && (
                <Button asChild variant="outline" className="justify-start" onClick={() => contactMut.mutate("email")}>
                  <a href={mailtoLink(email)} target="_blank" rel="noreferrer"><Mail className="mr-2 h-4 w-4" />{email}</a>
                </Button>
              )}
              {wa && (
                <Button asChild variant="outline" className="justify-start" onClick={() => contactMut.mutate("whatsapp")}>
                  <a href={whatsappLink(wa)} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" />{wa}</a>
                </Button>
              )}
              {ig && (
                <Button asChild variant="outline" className="justify-start" onClick={() => contactMut.mutate("instagram")}>
                  <a href={instagramLink(ig)} target="_blank" rel="noreferrer"><Instagram className="mr-2 h-4 w-4" />@{ig.replace(/^@/, "")}</a>
                </Button>
              )}
              {phone && (
                <Button asChild variant="outline" className="justify-start" onClick={() => contactMut.mutate("phone")}>
                  <a href={`tel:${phone}`}><Phone className="mr-2 h-4 w-4" />{phone}</a>
                </Button>
              )}
              {company.website ? (
                <Button asChild variant="outline" className="justify-start">
                  <a href={String(company.website)} target="_blank" rel="noreferrer"><Globe className="mr-2 h-4 w-4" />Site</a>
                </Button>
              ) : null}
              {!email && !wa && !ig && !phone && (
                <div className="text-xs text-muted-foreground">Sem contatos ainda. Clique em <span className="font-semibold">Enriquecer</span> para buscar.</div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Dados">
            <ul className="space-y-2 text-sm">
              {company.address ? <Li icon={<MapPin className="h-3.5 w-3.5" />} label="Endereço" value={String(company.address)} /> : null}
              {company.responsible_name ? <Li label="Responsável" value={String(company.responsible_name)} /> : null}
              {company.business_hours ? <Li label="Horário" value={String(company.business_hours)} /> : null}
              {(company.tags as string[] | undefined)?.length ? (
                <li className="flex flex-wrap gap-1">
                  {(company.tags as string[]).map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                </li>
              ) : null}
            </ul>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/40 bg-muted/20 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
function Li({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <li className="flex items-start gap-2">
      {icon ? <span className="mt-0.5 text-muted-foreground">{icon}</span> : null}
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="truncate">{value}</div>
      </div>
    </li>
  );
}
