import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Plus, Trash2, Search, Sparkles, Mail, MessageCircle, Instagram, Loader2, Copy, ExternalLink, Bot } from "lucide-react";
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
import { getOutreachSettings, updateOutreachSettings, getOutreachStats, runOutreachNow } from "@/lib/outreach.functions";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/market/leads")({
  head: () => ({ meta: [{ title: "AMT MarketEngine — Lead Scraper" }] }),
  component: LeadsPage,
});

const STATUS = ["Novo", "Contactado", "Negociando", "Convertido", "Perdido"] as const;
const TYPES = ["Professor", "Academia", "Escola/Projeto Social"] as const;
const MODALITIES = ["BJJ", "Judô", "BJJ + Judô"] as const;

function statusColor(s: string) {
  return s === "Convertido" ? "default" : s === "Perdido" ? "destructive" : s === "Negociando" ? "secondary" : "outline";
}

function LeadsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
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

  const filtered = (leads ?? []).filter((l) =>
    q ? `${l.name} ${l.responsible ?? ""} ${l.city ?? ""} ${l.email ?? ""}`.toLowerCase().includes(q.toLowerCase()) : true,
  );

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

      <AutopilotPanel />

      <SectionCard title="Base de leads" delay={0.1}>
        <div className="mb-3 flex items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, cidade, e-mail..." className="pl-8" />
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome / Academia</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações IA</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l: Lead, i) => (
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
        )}
      </SectionCard>

      {outreach && <OutreachDialog lead={outreach.lead} channel={outreach.channel} onClose={() => setOutreach(null)} />}
    </>
  );
}

function ScraperPanel() {
  const qc = useQueryClient();
  const scrapeFn = useServerFn(scrapeLeads);
  const [source, setSource] = useState<"google" | "instagram">("google");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [modality, setModality] = useState("BJJ");

  const run = useMutation({
    mutationFn: () => scrapeFn({ data: { source, query, city: city || null, modality, limit: 8 } }),
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_140px_auto]">
            <div>
              <Label>Termo de busca</Label>
              <Input
                placeholder={source === "google" ? "Ex.: academia jiu-jitsu, professor faixa preta, projeto social judô" : "Ex.: academia bjj, faixa preta, kids judo"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div>
              <Label>Cidade / região</Label>
              <Input placeholder="Ex.: São Paulo SP" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label>Modalidade</Label>
              <Select value={modality} onValueChange={setModality}>
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
            <div className="flex items-end">
              <Button className="w-full gap-2" disabled={query.length < 3 || run.isPending} onClick={() => run.mutate()}>
                {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                {run.isPending ? "Rastreando..." : "Rastrear"}
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            A IA vasculha {source === "google" ? "resultados do Google" : "perfis do Instagram"} de academias/professores, extrai contatos e insere aqui automaticamente (sem duplicar).
          </p>
        </TabsContent>
      </Tabs>
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
      const igMatch = /IG:\s*@?([\w.]+)/i.exec(lead.notes ?? "");
      const handle = igMatch?.[1];
      navigator.clipboard.writeText(body).then(() => toast.success("Mensagem copiada — cole no Direct"));
      if (handle) window.open(`https://instagram.com/${handle}`, "_blank");
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
