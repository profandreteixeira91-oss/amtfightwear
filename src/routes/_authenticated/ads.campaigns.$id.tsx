import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Loader2, Rocket, Pause, Play, RefreshCw, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  getCampaign, listAdsAccounts, publishCampaignToMeta,
  pauseCampaign, resumeCampaign, syncCampaignInsights, deleteCampaign,
} from "@/lib/ads/ads.functions";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/ads/campaigns/$id")({
  head: () => ({ meta: [{ title: "Campanha — Tráfego Pago IA" }] }),
  component: CampaignDetailPage,
});

function CampaignDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getCampaign);
  const accountsFn = useServerFn(listAdsAccounts);
  const publish = useServerFn(publishCampaignToMeta);
  const pause = useServerFn(pauseCampaign);
  const resume = useServerFn(resumeCampaign);
  const sync = useServerFn(syncCampaignInsights);
  const del = useServerFn(deleteCampaign);

  const { data, isLoading } = useQuery({
    queryKey: ["ads", "campaign", id],
    queryFn: () => get({ data: { id } }),
  });
  const { data: accounts } = useQuery({ queryKey: ["ads", "accounts"], queryFn: () => accountsFn() });

  const [open, setOpen] = useState(false);
  const [pubForm, setPubForm] = useState({
    adsAccountId: "",
    copyId: "",
    creativeId: "",
    linkUrl: "https://",
    countries: "BR",
    ageMin: 18,
    ageMax: 55,
    activate: false,
  });

  const publishMut = useMutation({
    mutationFn: () => publish({
      data: {
        campaignId: id,
        adsAccountId: pubForm.adsAccountId,
        copyId: pubForm.copyId,
        creativeId: pubForm.creativeId || undefined,
        linkUrl: pubForm.linkUrl,
        countries: pubForm.countries.split(",").map((s) => s.trim()).filter(Boolean),
        ageMin: pubForm.ageMin,
        ageMax: pubForm.ageMax,
        activate: pubForm.activate,
      },
    }),
    onSuccess: () => {
      toast.success("Campanha enviada para o Meta Ads");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["ads", "campaign", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pauseMut = useMutation({
    mutationFn: () => pause({ data: { campaignId: id } }),
    onSuccess: () => { toast.success("Campanha pausada"); qc.invalidateQueries({ queryKey: ["ads", "campaign", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const resumeMut = useMutation({
    mutationFn: () => resume({ data: { campaignId: id } }),
    onSuccess: () => { toast.success("Campanha ativada"); qc.invalidateQueries({ queryKey: ["ads", "campaign", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const syncMut = useMutation({
    mutationFn: () => sync({ data: { campaignId: id } }),
    onSuccess: (r) => { toast.success(`${r.synced} dias sincronizados`); qc.invalidateQueries({ queryKey: ["ads", "campaign", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: () => { toast.success("Campanha removida"); nav({ to: "/ads/campaigns" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <Skeleton className="h-96" />;
  const { campaign, copies, creatives, insights } = data;
  const published = !!campaign.meta_campaign_id;

  const totals = insights.reduce(
    (a, i) => ({
      spend: a.spend + Number(i.spend ?? 0),
      revenue: a.revenue + Number(i.revenue ?? 0),
      conv: a.conv + Number(i.conversions ?? 0),
      clicks: a.clicks + Number(i.clicks ?? 0),
      impr: a.impr + Number(i.impressions ?? 0),
    }),
    { spend: 0, revenue: 0, conv: 0, clicks: 0, impr: 0 },
  );

  return (
    <>
      <PageHeader
        eyebrow={<Link to="/ads/campaigns" className="hover:underline">← Campanhas</Link>}
        title={campaign.name}
        description={`Objetivo: ${campaign.objective} · Status: ${campaign.status}`}
        actions={
          <div className="flex gap-2">
            {!published ? (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button><Rocket className="mr-2 h-4 w-4" /> Publicar no Meta</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Publicar no Meta Ads</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Conta de anúncio</Label>
                      <Select value={pubForm.adsAccountId} onValueChange={(v) => setPubForm({ ...pubForm, adsAccountId: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {(accounts ?? []).map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name} ({a.act_id})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Copy</Label>
                      <Select value={pubForm.copyId} onValueChange={(v) => setPubForm({ ...pubForm, copyId: v })}>
                        <SelectTrigger><SelectValue placeholder="Escolha um copy" /></SelectTrigger>
                        <SelectContent>
                          {copies.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.headline}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Criativo (opcional)</Label>
                      <Select value={pubForm.creativeId} onValueChange={(v) => setPubForm({ ...pubForm, creativeId: v })}>
                        <SelectTrigger><SelectValue placeholder="Sem imagem (só texto)" /></SelectTrigger>
                        <SelectContent>
                          {creatives.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.format} — {c.aspect}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>URL de destino</Label>
                      <Input value={pubForm.linkUrl} onChange={(e) => setPubForm({ ...pubForm, linkUrl: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label>Países</Label>
                        <Input value={pubForm.countries} onChange={(e) => setPubForm({ ...pubForm, countries: e.target.value })} />
                      </div>
                      <div>
                        <Label>Idade min</Label>
                        <Input type="number" value={pubForm.ageMin} onChange={(e) => setPubForm({ ...pubForm, ageMin: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label>Idade max</Label>
                        <Input type="number" value={pubForm.ageMax} onChange={(e) => setPubForm({ ...pubForm, ageMax: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="act" checked={pubForm.activate} onCheckedChange={(v) => setPubForm({ ...pubForm, activate: !!v })} />
                      <Label htmlFor="act" className="text-sm">Ativar imediatamente (senão fica pausada)</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={() => publishMut.mutate()} disabled={publishMut.isPending || !pubForm.adsAccountId || !pubForm.copyId}>
                      {publishMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                      Publicar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : campaign.status === "active" ? (
              <Button variant="outline" onClick={() => pauseMut.mutate()} disabled={pauseMut.isPending}>
                <Pause className="mr-2 h-4 w-4" /> Pausar
              </Button>
            ) : (
              <Button onClick={() => resumeMut.mutate()} disabled={resumeMut.isPending}>
                <Play className="mr-2 h-4 w-4" /> Ativar
              </Button>
            )}
            {published && (
              <Button variant="outline" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
                <RefreshCw className={`mr-2 h-4 w-4 ${syncMut.isPending ? "animate-spin" : ""}`} /> Sincronizar
              </Button>
            )}
            <Button variant="outline" onClick={() => delMut.mutate()} disabled={delMut.isPending}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </Button>
          </div>
        }
      />

      {campaign.last_error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
          <div>
            <div className="font-semibold text-destructive">Erro na última publicação</div>
            <div className="text-xs text-muted-foreground">{campaign.last_error}</div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-5">
        <Metric label="Gasto" value={brl(totals.spend)} />
        <Metric label="Receita" value={brl(totals.revenue)} />
        <Metric label="ROAS" value={totals.spend > 0 ? `${(totals.revenue / totals.spend).toFixed(2)}x` : "—"} />
        <Metric label="Conversões" value={totals.conv} />
        <Metric label="CTR" value={totals.impr > 0 ? `${((totals.clicks / totals.impr) * 100).toFixed(2)}%` : "—"} />
      </div>

      <div className="mt-4">
        <SectionCard title="Desempenho diário" description="Últimos 30 dias — sincronização automática a cada 3h">
          {insights.length === 0 ? (
            <EmptyState icon={RefreshCw} title="Sem métricas ainda" description={published ? "Aguarde a primeira sincronização (até 3h) ou clique em Sincronizar." : "Publique a campanha para começar a coletar métricas."} />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={insights}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="spend" stroke="hsl(var(--primary))" strokeWidth={2} name="Gasto" />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Receita" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      {insights.length > 0 && (
        <div className="mt-4">
          <SectionCard title="Histórico">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="text-right">Impressões</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Conv.</TableHead>
                    <TableHead className="text-right">CPA</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...insights].reverse().map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.date}</TableCell>
                      <TableCell className="text-right">{brl(Number(i.spend ?? 0))}</TableCell>
                      <TableCell className="text-right">{i.impressions}</TableCell>
                      <TableCell className="text-right">{i.clicks}</TableCell>
                      <TableCell className="text-right">{Number(i.ctr ?? 0).toFixed(2)}%</TableCell>
                      <TableCell className="text-right">{i.conversions}</TableCell>
                      <TableCell className="text-right">{Number(i.cpa ?? 0) > 0 ? brl(Number(i.cpa)) : "—"}</TableCell>
                      <TableCell className="text-right">{Number(i.roas ?? 0) > 0 ? `${Number(i.roas).toFixed(2)}x` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <SectionCard title="Identificadores Meta">
          <div className="space-y-1 text-xs font-mono text-muted-foreground">
            <div>Campanha: {campaign.meta_campaign_id ?? "—"}</div>
            <div>Conjunto: {campaign.meta_adset_id ?? "—"}</div>
            <div>Anúncio: {campaign.meta_ad_id ?? "—"}</div>
            <div>Criativo: {campaign.meta_creative_id ?? "—"}</div>
            <div>Publicada: {campaign.published_at ? new Date(campaign.published_at).toLocaleString("pt-BR") : "—"}</div>
            <div>Última sync: {campaign.last_sync_at ? new Date(campaign.last_sync_at).toLocaleString("pt-BR") : "—"}</div>
          </div>
        </SectionCard>
        <SectionCard title="Status">
          <div className="flex flex-col gap-2 text-sm">
            <div>Status local: <Badge>{campaign.status}</Badge></div>
            <div>Orçamento diário: {campaign.budget_daily ? brl(Number(campaign.budget_daily)) : "—"}</div>
            <div>{copies.length} copies · {creatives.length} criativos vinculados</div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
