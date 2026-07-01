import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Handshake,
  TrendingUp,
  Target,
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  MessageCircle,
  ShoppingCart,
  Users2,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/market/crm")({
  head: () => ({ meta: [{ title: "Funil de Vendas — AMT MarketEngine" }] }),
  component: CrmPage,
});

// ---------- Types ----------
type Channel = "B2B" | "B2C";

type HistoryItem = { at: string; type: "email" | "call" | "note" | "order"; text: string };

type Deal = {
  id: string;
  channel: Channel;
  stage: string;
  name: string;
  contact: string;
  role?: string;
  city?: string;
  phone?: string;
  email?: string;
  value: number;
  items: string;
  updatedAt: string;
  activeFlow: {
    name: string;
    currentStep: number;
    totalSteps: number;
    nextSend: string;
    subject: string;
  };
  history: HistoryItem[];
};

// ---------- Stages ----------
const B2B_STAGES = [
  { id: "lead", label: "Lead Capturado" },
  { id: "proposal", label: "Proposta de Lote Enviada" },
  { id: "negotiation", label: "Negociando Quantidade" },
  { id: "closed", label: "Pedido Fechado" },
] as const;

const B2C_STAGES = [
  { id: "cart", label: "Abandono de Carrinho AMT" },
  { id: "browsing", label: "Buscando Faixa/Patches" },
  { id: "coupon", label: "Cupom Enviado" },
  { id: "converted", label: "Conversão Concluída" },
] as const;

// ---------- Mock data (nicho real) ----------
const DEALS: Deal[] = [
  // B2B — Academias reais do cenário BJJ/Judô
  {
    id: "b1",
    channel: "B2B",
    stage: "lead",
    name: "Alliance Jiu-Jitsu — Filial SP",
    contact: "Prof. Fabio Gurgel",
    role: "Head Coach",
    city: "São Paulo, SP",
    phone: "(11) 99812-4501",
    email: "atacado@alliancesp.com.br",
    value: 18400,
    items: "80 faixas Premium Kanji + 40 kimonos Training adulto",
    updatedAt: "há 2h",
    activeFlow: {
      name: "Prospecção Academias — Boas-vindas",
      currentStep: 1,
      totalSteps: 4,
      nextSend: "amanhã, 09:00",
      subject: "🥋 Condição exclusiva AMT para a Alliance SP",
    },
    history: [
      { at: "hoje 10:12", type: "email", text: "E-mail 1 enviado: apresentação institucional AMT + catálogo atacado." },
      { at: "ontem 17:40", type: "note", text: "Lead capturado via formulário 'Atacado para Academias'." },
    ],
  },
  {
    id: "b2",
    channel: "B2B",
    stage: "lead",
    name: "Gracie Barra — Barra da Tijuca",
    contact: "Prof. Vinicius Magalhães",
    role: "Diretor Técnico",
    city: "Rio de Janeiro, RJ",
    phone: "(21) 98741-2233",
    email: "vinicius@graciebarra-rj.com",
    value: 12750,
    items: "60 faixas Pro (mistas graduação) + patches sublimados",
    updatedAt: "há 5h",
    activeFlow: {
      name: "Prospecção Academias — Boas-vindas",
      currentStep: 2,
      totalSteps: 4,
      nextSend: "sexta, 08:30",
      subject: "Tabela de atacado — faixas Pro para graduação",
    },
    history: [
      { at: "hoje 08:15", type: "email", text: "E-mail 2 enviado: tabela de preços atacado + prazo de bordado Kanji." },
      { at: "3 dias atrás", type: "call", text: "Ligação de qualificação — interesse em fechar antes de dezembro." },
    ],
  },
  {
    id: "b3",
    channel: "B2B",
    stage: "proposal",
    name: "Cia Paulista de Jiu-Jitsu",
    contact: "Prof. Ricardo Vieira",
    city: "São Paulo, SP",
    phone: "(11) 97733-9812",
    email: "compras@ciapaulista.com.br",
    value: 26900,
    items: "120 faixas Premium bordadas + 30 kimonos trançadinho infantil",
    updatedAt: "há 1d",
    activeFlow: {
      name: "Graduação de Fim de Ano — Atacado",
      currentStep: 2,
      totalSteps: 5,
      nextSend: "segunda, 10:00",
      subject: "Proposta AMT #2043 — condições de pagamento",
    },
    history: [
      { at: "ontem 14:22", type: "email", text: "Proposta comercial #2043 enviada com 3 opções de lote." },
      { at: "2 dias atrás", type: "note", text: "Solicitou prazo em 3x sem juros para pedido acima de R$ 20k." },
    ],
  },
  {
    id: "b4",
    channel: "B2B",
    stage: "proposal",
    name: "CT Nova União",
    contact: "Prof. André Pederneiras",
    city: "Rio de Janeiro, RJ",
    phone: "(21) 99123-4477",
    email: "atacado@novauniao.com",
    value: 15200,
    items: "70 faixas Pro adulto + ponteira Autismo (linha especial)",
    updatedAt: "há 2d",
    activeFlow: {
      name: "Graduação de Fim de Ano — Atacado",
      currentStep: 3,
      totalSteps: 5,
      nextSend: "quinta, 09:00",
      subject: "Follow-up proposta — ponteira Autismo em destaque",
    },
    history: [
      { at: "2 dias atrás", type: "email", text: "Proposta enviada com linha especial de ponteira Autismo." },
      { at: "5 dias atrás", type: "call", text: "Ligação de descoberta — 210 alunos ativos." },
    ],
  },
  {
    id: "b5",
    channel: "B2B",
    stage: "negotiation",
    name: "Academia Cordeiro de Judô",
    contact: "Sensei Marcelo Cordeiro",
    city: "Curitiba, PR",
    phone: "(41) 99887-1120",
    email: "sensei@cordeirojudo.com.br",
    value: 9800,
    items: "50 faixas Judô Training + 20 kimonos brancos judô adulto",
    updatedAt: "há 6h",
    activeFlow: {
      name: "Negociação Ativa — Fechamento",
      currentStep: 3,
      totalSteps: 4,
      nextSend: "hoje, 18:00",
      subject: "Última condição — lote fechado com bordado incluso",
    },
    history: [
      { at: "hoje 11:00", type: "call", text: "Negociação de quantidade: pediu +10 faixas se mantiver preço unitário." },
      { at: "ontem 16:40", type: "email", text: "Contraproposta enviada com bordado Kanji incluso no pacote." },
    ],
  },
  {
    id: "b6",
    channel: "B2B",
    stage: "negotiation",
    name: "PSLPB Cicero Costha",
    contact: "Prof. Cicero Costha",
    city: "São Paulo, SP",
    phone: "(11) 98455-6621",
    email: "projeto@ciceropsl.com.br",
    value: 6400,
    items: "Projeto social — 120 faixas Training infantil (patrocínio parcial)",
    updatedAt: "há 12h",
    activeFlow: {
      name: "Projetos Sociais — Parceria",
      currentStep: 2,
      totalSteps: 3,
      nextSend: "amanhã, 14:00",
      subject: "Fechamento parceria — projeto social AMT apoia",
    },
    history: [
      { at: "hoje 09:30", type: "note", text: "Ajuste de quantidade: fechado em 120 faixas com 30% de patrocínio AMT." },
      { at: "1 semana atrás", type: "email", text: "Envio da proposta institucional para projeto social." },
    ],
  },
  {
    id: "b7",
    channel: "B2B",
    stage: "closed",
    name: "Checkmat HQ — Rio",
    contact: "Prof. Leo Vieira",
    city: "Rio de Janeiro, RJ",
    phone: "(21) 99772-3311",
    email: "compras@checkmat.com.br",
    value: 32400,
    items: "150 faixas Premium Kanji + 60 kimonos Pro adulto + patches",
    updatedAt: "há 3d",
    activeFlow: {
      name: "Pós-venda B2B — Fidelização",
      currentStep: 1,
      totalSteps: 4,
      nextSend: "próxima segunda, 10:00",
      subject: "Obrigado, Checkmat! Nota fiscal e prazo de bordado",
    },
    history: [
      { at: "3 dias atrás", type: "order", text: "Pedido #AMT-8842 fechado — faturamento R$ 32.400,00." },
      { at: "4 dias atrás", type: "email", text: "Envio do contrato de fornecimento e cronograma de bordado." },
    ],
  },
  {
    id: "b8",
    channel: "B2B",
    stage: "closed",
    name: "Ryan Gracie Team — SP",
    contact: "Prof. Rodrigo Ryan",
    city: "São Paulo, SP",
    phone: "(11) 98800-1122",
    email: "atacado@ryangracie.com",
    value: 21100,
    items: "90 faixas Pro + 25 kimonos trançadinho adulto",
    updatedAt: "há 6d",
    activeFlow: {
      name: "Pós-venda B2B — Fidelização",
      currentStep: 2,
      totalSteps: 4,
      nextSend: "quinta, 09:30",
      subject: "Como está a graduação? Envie fotos para nosso mural AMT",
    },
    history: [
      { at: "6 dias atrás", type: "order", text: "Pedido #AMT-8821 fechado — faturamento R$ 21.100,00." },
    ],
  },

  // B2C — Varejo
  {
    id: "c1",
    channel: "B2C",
    stage: "cart",
    name: "Lucas Almeida",
    contact: "lucas.almeida93@gmail.com",
    city: "Belo Horizonte, MG",
    phone: "(31) 99812-4477",
    email: "lucas.almeida93@gmail.com",
    value: 389,
    items: "1x Faixa Premium Roxa Kanji + 2x Patches sublimados",
    updatedAt: "há 40min",
    activeFlow: {
      name: "Recuperação Carrinho AMT — 24h",
      currentStep: 1,
      totalSteps: 3,
      nextSend: "em 2h",
      subject: "🥋 Sua faixa Premium ficou esperando por você",
    },
    history: [
      { at: "há 40min", type: "note", text: "Carrinho abandonado no checkout (etapa de frete)." },
    ],
  },
  {
    id: "c2",
    channel: "B2C",
    stage: "cart",
    name: "Juliana Torres",
    contact: "ju.torres@outlook.com",
    city: "Porto Alegre, RS",
    phone: "(51) 99331-7788",
    email: "ju.torres@outlook.com",
    value: 549,
    items: "1x Kimono Trançadinho Infantil branco A2",
    updatedAt: "há 2h",
    activeFlow: {
      name: "Recuperação Carrinho AMT — 24h",
      currentStep: 1,
      totalSteps: 3,
      nextSend: "em 4h",
      subject: "🥋 Ainda dá tempo — kimono infantil A2 em estoque",
    },
    history: [
      { at: "há 2h", type: "note", text: "Carrinho abandonado após adicionar frete." },
    ],
  },
  {
    id: "c3",
    channel: "B2C",
    stage: "browsing",
    name: "Rafael Monteiro",
    contact: "rafa.monteiro@gmail.com",
    city: "Salvador, BA",
    phone: "(71) 99888-2211",
    email: "rafa.monteiro@gmail.com",
    value: 260,
    items: "Navegou 6x na categoria Faixas Judô Training adulto",
    updatedAt: "há 1d",
    activeFlow: {
      name: "Educação de Produto — Faixas Judô",
      currentStep: 2,
      totalSteps: 4,
      nextSend: "amanhã, 10:00",
      subject: "Diferença entre linhas Training, Pro e Premium",
    },
    history: [
      { at: "ontem 20:11", type: "note", text: "6ª visita à página da faixa Judô Training adulto." },
    ],
  },
  {
    id: "c4",
    channel: "B2C",
    stage: "browsing",
    name: "Marcos Vinícius",
    contact: "marcosvbjj@gmail.com",
    city: "Fortaleza, CE",
    phone: "(85) 99114-8822",
    email: "marcosvbjj@gmail.com",
    value: 410,
    items: "Buscou 'faixa marrom Kanji' + 'patches Autismo'",
    updatedAt: "há 8h",
    activeFlow: {
      name: "Educação de Produto — Bordados Kanji",
      currentStep: 1,
      totalSteps: 3,
      nextSend: "amanhã, 08:00",
      subject: "Personalize sua faixa marrom com Kanji AMT",
    },
    history: [
      { at: "hoje 08:00", type: "note", text: "Buscou por 'faixa marrom Kanji' via busca interna." },
    ],
  },
  {
    id: "c5",
    channel: "B2C",
    stage: "coupon",
    name: "Ana Beatriz Ramos",
    contact: "anabeatrizr@gmail.com",
    city: "Curitiba, PR",
    phone: "(41) 99223-1198",
    email: "anabeatrizr@gmail.com",
    value: 329,
    items: "Cupom AMT10 — Faixa Premium azul feminina",
    updatedAt: "há 3h",
    activeFlow: {
      name: "Cupom AMT10 — Fechamento em 48h",
      currentStep: 2,
      totalSteps: 3,
      nextSend: "amanhã, 09:00",
      subject: "Seu cupom AMT10 expira em 24h",
    },
    history: [
      { at: "há 3h", type: "email", text: "Cupom AMT10 (10% off) enviado após 3 visitas ao produto." },
    ],
  },
  {
    id: "c6",
    channel: "B2C",
    stage: "coupon",
    name: "Pedro Henrique Souza",
    contact: "ph.souza@gmail.com",
    city: "Recife, PE",
    phone: "(81) 99887-4411",
    email: "ph.souza@gmail.com",
    value: 720,
    items: "Cupom KIMONO15 — Kimono Pro adulto A3",
    updatedAt: "há 20h",
    activeFlow: {
      name: "Cupom KIMONO15 — Fechamento em 48h",
      currentStep: 3,
      totalSteps: 3,
      nextSend: "hoje, 19:00",
      subject: "Última chance — 15% off no kimono Pro",
    },
    history: [
      { at: "ontem", type: "email", text: "Cupom KIMONO15 enviado com prazo de 48h." },
    ],
  },
  {
    id: "c7",
    channel: "B2C",
    stage: "converted",
    name: "Camila Nogueira",
    contact: "camila.nog@gmail.com",
    city: "São Paulo, SP",
    phone: "(11) 99788-2231",
    email: "camila.nog@gmail.com",
    value: 458,
    items: "Pedido #AMT-9911 — Faixa Premium roxa + 3 patches",
    updatedAt: "há 1d",
    activeFlow: {
      name: "Pós-venda B2C — Review & Upsell",
      currentStep: 1,
      totalSteps: 4,
      nextSend: "em 3 dias",
      subject: "Como foi sua experiência com a faixa Premium?",
    },
    history: [
      { at: "ontem 15:22", type: "order", text: "Pedido #AMT-9911 pago — R$ 458,00." },
    ],
  },
  {
    id: "c8",
    channel: "B2C",
    stage: "converted",
    name: "Bruno Tavares",
    contact: "brunotavares@gmail.com",
    city: "Brasília, DF",
    phone: "(61) 99311-8877",
    email: "brunotavares@gmail.com",
    value: 899,
    items: "Pedido #AMT-9922 — Kimono Trançadinho adulto A2",
    updatedAt: "há 2d",
    activeFlow: {
      name: "Pós-venda B2C — Review & Upsell",
      currentStep: 2,
      totalSteps: 4,
      nextSend: "amanhã, 10:00",
      subject: "Complete o kit — faixa da sua graduação com 10% off",
    },
    history: [
      { at: "2 dias atrás", type: "order", text: "Pedido #AMT-9922 pago — R$ 899,00." },
    ],
  },
];

// ---------- Component ----------
const HISTORY_ICON: Record<HistoryItem["type"], typeof Mail> = {
  email: Mail,
  call: Phone,
  note: MessageCircle,
  order: ShoppingCart,
};

function CrmPage() {
  const [channel, setChannel] = useState<Channel>("B2B");
  const [selected, setSelected] = useState<Deal | null>(null);

  const stages = channel === "B2B" ? B2B_STAGES : B2C_STAGES;
  const channelDeals = useMemo(() => DEALS.filter((d) => d.channel === channel), [channel]);

  const grouped = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const s of stages) map[s.id] = [];
    for (const d of channelDeals) (map[d.stage] ??= []).push(d);
    return map;
  }, [channelDeals, stages]);

  const pipelineValue = channelDeals
    .filter((d) => d.stage !== "closed" && d.stage !== "converted")
    .reduce((a, d) => a + d.value, 0);
  const wonValue = channelDeals
    .filter((d) => d.stage === "closed" || d.stage === "converted")
    .reduce((a, d) => a + d.value, 0);
  const totalDeals = channelDeals.length;

  return (
    <>
      <PageHeader
        eyebrow="MarketEngine"
        title="Funil de Vendas (CRM)"
        description="Pipeline dinâmico de negociação AMT Fight Wear — atacado para academias e varejo direto ao aluno."
      />

      <Tabs value={channel} onValueChange={(v) => setChannel(v as Channel)} className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-2">
          <TabsTrigger value="B2B" className="gap-2">
            <Handshake className="h-4 w-4" /> Funil B2B — Academias
          </TabsTrigger>
          <TabsTrigger value="B2C" className="gap-2">
            <Users2 className="h-4 w-4" /> Funil B2C — Varejo
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Pipeline aberto" value={brl(pipelineValue)} icon={Handshake} />
          <StatCard label="Vendas fechadas" value={brl(wonValue)} icon={TrendingUp} delta={12.3} />
          <StatCard label="Oportunidades" value={String(totalDeals)} icon={Target} />
        </div>

        <TabsContent value={channel} className="mt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stages.map((s, idx) => {
              const items = grouped[s.id] ?? [];
              const colValue = items.reduce((a, d) => a + d.value, 0);
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex flex-col rounded-lg border bg-muted/30 p-3"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{s.label}</h3>
                      <p className="text-[11px] text-muted-foreground">{brl(colValue)}</p>
                    </div>
                    <Badge variant="secondary">{items.length}</Badge>
                  </div>

                  <div className="flex-1 space-y-2">
                    {items.length === 0 ? (
                      <div className="rounded-md border border-dashed bg-background/50 py-6 text-center text-xs text-muted-foreground">
                        Sem cards
                      </div>
                    ) : (
                      items.map((d) => (
                        <motion.button
                          key={d.id}
                          type="button"
                          onClick={() => setSelected(d)}
                          whileHover={{ y: -2 }}
                          className="w-full rounded-md border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="truncate text-sm font-medium">{d.name}</div>
                            <span className="shrink-0 text-sm font-semibold text-primary">
                              {brl(d.value)}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {d.items}
                          </p>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {d.activeFlow.name.split(" — ")[0]}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {d.updatedAt}
                            </span>
                          </div>
                        </motion.button>
                      ))
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <AnimatePresence mode="wait">
            {selected && (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
              >
                <SheetHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-primary/40 text-primary">
                      {selected.channel === "B2B" ? "Atacado" : "Varejo"}
                    </Badge>
                    <Badge variant="secondary">
                      {(selected.channel === "B2B" ? B2B_STAGES : B2C_STAGES).find(
                        (s) => s.id === selected.stage,
                      )?.label}
                    </Badge>
                  </div>
                  <SheetTitle className="text-left">{selected.name}</SheetTitle>
                  <SheetDescription className="text-left">
                    {selected.contact}
                    {selected.role ? ` · ${selected.role}` : ""}
                  </SheetDescription>
                </SheetHeader>

                {/* Contact block */}
                <div className="mt-4 grid grid-cols-1 gap-2 rounded-md border bg-muted/30 p-3 text-sm">
                  {selected.city && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" /> {selected.city}
                    </div>
                  )}
                  {selected.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" /> {selected.phone}
                    </div>
                  )}
                  {selected.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" /> {selected.email}
                    </div>
                  )}
                  <Separator className="my-1" />
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Oportunidade
                    </p>
                    <p className="mt-1">{selected.items}</p>
                    <p className="mt-2 text-lg font-semibold text-primary">{brl(selected.value)}</p>
                  </div>
                </div>

                {/* Active email automation */}
                <div className="mt-5 rounded-md border border-primary/30 bg-primary/5 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">Automação de E-mail Marketing Ativa</h4>
                  </div>
                  <p className="text-sm font-medium">{selected.activeFlow.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Etapa {selected.activeFlow.currentStep} de {selected.activeFlow.totalSteps} ·
                    próximo envio {selected.activeFlow.nextSend}
                  </p>

                  <div className="mt-3 flex items-center gap-1">
                    {Array.from({ length: selected.activeFlow.totalSteps }).map((_, j) => (
                      <div key={j} className="flex-1">
                        <div
                          className={`h-1.5 rounded-full ${
                            j < selected.activeFlow.currentStep
                              ? "bg-primary"
                              : "bg-muted-foreground/25"
                          }`}
                        />
                        <div className="mt-1 text-center text-[10px] text-muted-foreground">
                          E{j + 1}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-md bg-background/60 p-3 text-xs">
                    <p className="font-medium">Próximo assunto</p>
                    <p className="mt-1 text-muted-foreground">{selected.activeFlow.subject}</p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="flex-1 gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Adiantar envio
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Trocar régua
                    </Button>
                  </div>
                </div>

                {/* History */}
                <div className="mt-5">
                  <h4 className="mb-2 text-sm font-semibold">Histórico do lead</h4>
                  <div className="space-y-3">
                    {selected.history.map((h, i) => {
                      const Icon = HISTORY_ICON[h.type];
                      return (
                        <div key={i} className="flex gap-3">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 rounded-md border bg-card p-2">
                            <p className="text-xs text-muted-foreground">{h.at}</p>
                            <p className="text-sm">{h.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SheetContent>
      </Sheet>
    </>
  );
}
