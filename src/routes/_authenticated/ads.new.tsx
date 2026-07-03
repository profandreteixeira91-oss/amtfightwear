import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, Wand2, Users, DollarSign, Rocket, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  createBriefing,
  generateAdsStrategy,
  generateAdCopy,
  suggestAudiences,
  estimateBudget,
  createCampaign,
} from "@/lib/ads/ads.functions";
import { streamImage } from "@/lib/streamImage";

export const Route = createFileRoute("/_authenticated/ads/new")({
  head: () => ({ meta: [{ title: "Nova Campanha IA — Tráfego Pago" }] }),
  component: NewAdCampaignWizard,
});

type Strategy = {
  funnel?: string[];
  campaign_type?: string;
  structure?: string;
  adsets_count?: number;
  ads_per_adset?: number;
  recommended_budget_daily?: number;
  recommended_budget_total?: number;
  estimated_reach?: string;
  estimated_cpa?: number;
  estimated_roas?: number;
  rationale?: string;
  warnings?: string[];
};

type CopyRow = {
  id: string;
  headline: string;
  primary_text: string;
  description: string | null;
  cta: string | null;
  quality_score: number | null;
  click_potential: string | null;
  conversion_potential: string | null;
};

type Audiences = {
  interests?: Array<{ name: string; reason: string; size: string }>;
  lookalike?: Array<{ source: string; percent: number }>;
  remarketing?: Array<{ name: string; description: string }>;
  exclusions?: string[];
};

type Budget = {
  daily_budget?: number;
  monthly_budget?: number;
  expected_cpa?: number;
  expected_roas?: number;
  expected_sales?: number;
  notes?: string;
};

function NewAdCampaignWizard() {
  const [step, setStep] = useState(1);
  const [briefingId, setBriefingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    productName: "",
    objective: "sales" as
      | "sales"
      | "leads"
      | "messages"
      | "whatsapp"
      | "awareness"
      | "catalog"
      | "traffic"
      | "app"
      | "conversions",
    price: "",
    offer: "",
    region: "Brasil",
    ageRange: "25-45",
    gender: "todos",
    interests: "",
    competitors: "",
    brandTone: "próximo, autoridade, premium",
    revenueGoal: "",
    budgetDaily: "",
    campaignName: "",
  });

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [copies, setCopies] = useState<CopyRow[]>([]);
  const [audiences, setAudiences] = useState<Audiences | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [image, setImage] = useState<{ src: string; final: boolean } | null>(null);

  const createBriefingFn = useServerFn(createBriefing);
  const genStrategyFn = useServerFn(generateAdsStrategy);
  const genCopyFn = useServerFn(generateAdCopy);
  const suggestAudFn = useServerFn(suggestAudiences);
  const estimateBudgetFn = useServerFn(estimateBudget);
  const createCampaignFn = useServerFn(createCampaign);

  const briefingMut = useMutation({
    mutationFn: () =>
      createBriefingFn({
        data: {
          productName: form.productName,
          objective: form.objective,
          price: form.price ? Number(form.price) : null,
          offer: form.offer || null,
          region: form.region || null,
          ageRange: form.ageRange || null,
          gender: form.gender || null,
          interests: form.interests
            ? form.interests.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          competitors: form.competitors || null,
          brandTone: form.brandTone || null,
          revenueGoal: form.revenueGoal ? Number(form.revenueGoal) : null,
          budgetDaily: form.budgetDaily ? Number(form.budgetDaily) : null,
        },
      }),
    onSuccess: (row) => {
      setBriefingId(row.id);
      setStep(3);
      strategyMut.mutate(row.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const strategyMut = useMutation({
    mutationFn: (id: string) => genStrategyFn({ data: { briefingId: id } }),
    onSuccess: (s) => setStrategy(s as Strategy),
    onError: (e: Error) => toast.error(e.message),
  });

  const copyMut = useMutation({
    mutationFn: () => genCopyFn({ data: { briefingId: briefingId!, variants: 3 } }),
    onSuccess: (rows) => setCopies((rows ?? []) as CopyRow[]),
    onError: (e: Error) => toast.error(e.message),
  });

  const audMut = useMutation({
    mutationFn: () => suggestAudFn({ data: { briefingId: briefingId! } }),
    onSuccess: (a) => setAudiences(a as Audiences),
    onError: (e: Error) => toast.error(e.message),
  });

  const budgetMut = useMutation({
    mutationFn: () => estimateBudgetFn({ data: { briefingId: briefingId! } }),
    onSuccess: (b) => setBudget(b as Budget),
    onError: (e: Error) => toast.error(e.message),
  });

  async function generateImage() {
    if (!briefingId) return;
    setImage({ src: "", final: false });
    try {
      const prompt = `Anúncio profissional para Meta Ads. Produto: ${form.productName}. Oferta: ${form.offer || "melhor preço"}. Estilo: fotografia comercial, iluminação premium, foco no produto, espaço para texto no topo, cores vibrantes coerentes com marca premium de artes marciais. Sem texto na imagem.`;
      await streamImage("/api/generate-ad-image", { prompt, size: "1024x1024" }, (src, final) =>
        setImage({ src, final }),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar imagem");
      setImage(null);
    }
  }

  const publishMut = useMutation({
    mutationFn: () =>
      createCampaignFn({
        data: {
          briefingId: briefingId!,
          name: form.campaignName || `${form.productName} — ${new Date().toLocaleDateString("pt-BR")}`,
          budgetDaily: budget?.daily_budget ?? (form.budgetDaily ? Number(form.budgetDaily) : null),
        },
      }),
    onSuccess: () => {
      toast.success("Campanha salva como rascunho. Publicação no Meta Ads virá na próxima fase.");
      setStep(7);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        eyebrow="Tráfego Pago IA"
        title="Nova Campanha com IA"
        description="Consultor de mídia paga guiado por IA — em 6 passos você tem estratégia, copies e criativos prontos."
        actions={<Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" /> Passo {Math.min(step, 6)} de 6</Badge>}
      />

      {step === 1 && (
        <SectionCard title="1. Produto & Objetivo" description="A IA usa essas respostas para desenhar a estratégia.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Nome do produto *</Label>
              <Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="Ex: Kimono BJJ AMT Elite" />
            </div>
            <div>
              <Label>Objetivo da campanha *</Label>
              <Select value={form.objective} onValueChange={(v) => setForm({ ...form, objective: v as typeof form.objective })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Vendas / Conversões</SelectItem>
                  <SelectItem value="leads">Geração de leads</SelectItem>
                  <SelectItem value="whatsapp">Conversas no WhatsApp</SelectItem>
                  <SelectItem value="messages">Mensagens (DM)</SelectItem>
                  <SelectItem value="traffic">Tráfego para o site</SelectItem>
                  <SelectItem value="awareness">Reconhecimento de marca</SelectItem>
                  <SelectItem value="catalog">Vendas de catálogo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preço unitário (R$)</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <Label>Oferta / promoção</Label>
              <Input value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} placeholder="Ex: 20% OFF + frete grátis" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!form.productName}>
              Continuar <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </SectionCard>
      )}

      {step === 2 && (
        <SectionCard title="2. Briefing detalhado" description="Quanto mais contexto, melhor a estratégia da IA.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Região</Label>
              <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
            </div>
            <div>
              <Label>Faixa etária</Label>
              <Input value={form.ageRange} onChange={(e) => setForm({ ...form, ageRange: e.target.value })} placeholder="25-45" />
            </div>
            <div>
              <Label>Gênero</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meta de faturamento mensal (R$)</Label>
              <Input type="number" value={form.revenueGoal} onChange={(e) => setForm({ ...form, revenueGoal: e.target.value })} />
            </div>
            <div>
              <Label>Orçamento diário desejado (R$)</Label>
              <Input type="number" value={form.budgetDaily} onChange={(e) => setForm({ ...form, budgetDaily: e.target.value })} placeholder="deixe vazio para IA sugerir" />
            </div>
            <div>
              <Label>Interesses (separados por vírgula)</Label>
              <Input value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} placeholder="jiu-jitsu, judô, MMA" />
            </div>
            <div className="sm:col-span-2">
              <Label>Concorrentes</Label>
              <Textarea rows={2} value={form.competitors} onChange={(e) => setForm({ ...form, competitors: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Tom da marca</Label>
              <Input value={form.brandTone} onChange={(e) => setForm({ ...form, brandTone: e.target.value })} />
            </div>
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
            <Button onClick={() => briefingMut.mutate()} disabled={briefingMut.isPending}>
              {briefingMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              IA analisa e monta a estratégia
            </Button>
          </div>
        </SectionCard>
      )}

      {step === 3 && (
        <SectionCard title="3. Estratégia gerada pela IA" description="Revise o plano antes de gerar os criativos.">
          {strategyMut.isPending || !strategy ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Analisando produto, público e concorrência…</div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Metric label="Tipo de campanha" value={strategy.campaign_type} />
                <Metric label="Conjuntos" value={strategy.adsets_count} />
                <Metric label="Anúncios/conjunto" value={strategy.ads_per_adset} />
                <Metric label="ROAS estimado" value={strategy.estimated_roas ? `${strategy.estimated_roas}x` : "—"} />
                <Metric label="Orç. diário sugerido" value={strategy.recommended_budget_daily ? `R$ ${strategy.recommended_budget_daily}` : "—"} />
                <Metric label="Orç. total sugerido" value={strategy.recommended_budget_total ? `R$ ${strategy.recommended_budget_total}` : "—"} />
                <Metric label="Alcance estimado" value={strategy.estimated_reach} />
                <Metric label="CPA estimado" value={strategy.estimated_cpa ? `R$ ${strategy.estimated_cpa}` : "—"} />
              </div>
              {strategy.funnel && (
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Funil</div>
                  <div className="flex flex-wrap gap-2">
                    {strategy.funnel.map((f, i) => <Badge key={i} variant="secondary">{f}</Badge>)}
                  </div>
                </div>
              )}
              {strategy.structure && <p className="text-muted-foreground">{strategy.structure}</p>}
              {strategy.rationale && <p><span className="font-semibold">Por quê:</span> {strategy.rationale}</p>}
              {strategy.warnings && strategy.warnings.length > 0 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="mb-1 text-xs font-semibold uppercase text-amber-700 dark:text-amber-400">Atenção</div>
                  <ul className="list-disc space-y-1 pl-4 text-xs">
                    {strategy.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
            <Button onClick={() => { setStep(4); copyMut.mutate(); }} disabled={!strategy}>
              Gerar copies com IA <Wand2 className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </SectionCard>
      )}

      {step === 4 && (
        <SectionCard title="4. Copies (3 variações)" description="Nota de qualidade + potencial de clique/conversão calculados pela IA.">
          {copyMut.isPending || copies.length === 0 ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Copywriter IA trabalhando…</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {copies.map((c) => (
                <div key={c.id} className="rounded-md border p-3 text-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge>Nota {c.quality_score?.toFixed(1) ?? "—"}/10</Badge>
                    <span className="text-xs text-muted-foreground">{c.click_potential}</span>
                  </div>
                  <div className="font-semibold">{c.headline}</div>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{c.primary_text}</p>
                  {c.cta && <div className="mt-2 text-xs"><span className="font-semibold">CTA:</span> {c.cta}</div>}
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => copyMut.mutate()} disabled={copyMut.isPending}>Refazer copies</Button>
            <Button onClick={generateImage} variant="secondary"><Wand2 className="mr-2 h-4 w-4" /> Gerar imagem do criativo</Button>
          </div>

          {image && (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Criativo gerado</div>
              {image.src ? (
                <img
                  src={image.src}
                  alt="Criativo IA"
                  className={`mt-2 max-h-96 rounded-md border transition-[filter] ${image.final ? "" : "blur-md"}`}
                />
              ) : (
                <div className="mt-2 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Gerando…</div>
              )}
            </div>
          )}

          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(3)}>Voltar</Button>
            <Button onClick={() => { setStep(5); audMut.mutate(); budgetMut.mutate(); }} disabled={copies.length === 0}>
              Continuar <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </SectionCard>
      )}

      {step === 5 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="5a. Públicos sugeridos" description="Interesses, lookalikes, remarketing e exclusões.">
            {audMut.isPending || !audiences ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> <Users className="h-4 w-4" /> Segmentando…</div>
            ) : (
              <div className="space-y-3 text-sm">
                <AudList title="Interesses" items={audiences.interests?.map((i) => `${i.name} — ${i.size}`) ?? []} />
                <AudList title="Lookalike" items={audiences.lookalike?.map((l) => `${l.source} ${l.percent}%`) ?? []} />
                <AudList title="Remarketing" items={audiences.remarketing?.map((r) => r.name) ?? []} />
                <AudList title="Excluir" items={audiences.exclusions ?? []} />
              </div>
            )}
          </SectionCard>
          <SectionCard title="5b. Orçamento & projeções" description="Estimativas baseadas no seu produto e meta.">
            {budgetMut.isPending || !budget ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> <DollarSign className="h-4 w-4" /> Calculando…</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Diário" value={budget.daily_budget ? `R$ ${budget.daily_budget}` : "—"} />
                <Metric label="Mensal" value={budget.monthly_budget ? `R$ ${budget.monthly_budget}` : "—"} />
                <Metric label="CPA esperado" value={budget.expected_cpa ? `R$ ${budget.expected_cpa}` : "—"} />
                <Metric label="ROAS esperado" value={budget.expected_roas ? `${budget.expected_roas}x` : "—"} />
                <Metric label="Vendas esperadas" value={budget.expected_sales ?? "—"} />
                {budget.notes && <p className="col-span-2 text-xs text-muted-foreground">{budget.notes}</p>}
              </div>
            )}
          </SectionCard>
          <div className="lg:col-span-2 flex justify-between">
            <Button variant="outline" onClick={() => setStep(4)}>Voltar</Button>
            <Button onClick={() => setStep(6)} disabled={!audiences || !budget}>
              Revisar e salvar <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 6 && (
        <SectionCard title="6. Publicação" description="A campanha será salva como rascunho. Publicação direta no Meta Ads chega na próxima fase.">
          <div className="space-y-4">
            <div>
              <Label>Nome da campanha</Label>
              <Input value={form.campaignName} onChange={(e) => setForm({ ...form, campaignName: e.target.value })} placeholder={`${form.productName} — ${new Date().toLocaleDateString("pt-BR")}`} />
            </div>
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              <p>Estratégia, copies, criativos, públicos e orçamento ficam vinculados ao rascunho e podem ser reaproveitados na aba <strong>Campanhas</strong>.</p>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(5)}>Voltar</Button>
              <Button onClick={() => publishMut.mutate()} disabled={publishMut.isPending}>
                {publishMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                Salvar campanha
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {step === 7 && (
        <SectionCard title="Pronto!" description="Sua campanha foi salva.">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="rounded-full bg-primary/10 p-4"><Rocket className="h-8 w-8 text-primary" /></div>
            <p className="text-sm text-muted-foreground">Acompanhe em Campanhas ou crie outra.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep(1); setBriefingId(null); setStrategy(null); setCopies([]); setAudiences(null); setBudget(null); setImage(null); }}>Nova campanha</Button>
            </div>
          </div>
        </SectionCard>
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value ?? "—"}</div>
    </div>
  );
}

function AudList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{title}</div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">—</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((i, idx) => <Badge key={idx} variant="secondary" className="text-xs">{i}</Badge>)}
        </div>
      )}
    </div>
  );
}
