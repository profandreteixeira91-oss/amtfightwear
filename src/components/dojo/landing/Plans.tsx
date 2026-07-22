import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, FadeIn } from "./Section";

const allModules = [
  "Alunos e matrículas ilimitadas",
  "Financeiro completo (PIX, cartão, boleto)",
  "AMT Pay — split e carteira digital",
  "Graduações, faixas e critérios automáticos",
  "Editor de certificados (estilo Canva) + PDF A4",
  "Belt Studio — ilustrações de faixas por modalidade",
  "Agenda, turmas, presença e check-in geolocalizado",
  "Ranking por check-ins e engajamento",
  "Módulo Equipe (professores, escalas, folha)",
  "Competições, cartel e resultados",
  "Avaliações físicas e técnicas por fundamento",
  "Análise Individual do Atleta (score, radar, heatmap)",
  "Metas & objetivos com progresso automático",
  "Vídeos técnicos e biblioteca por categoria",
  "App do Aluno (PWA) com carteirinha digital",
  "Comunicados, push notifications e e-mail",
  "AMT Store integrada (varejo + atacado 25%)",
  "Integração GymPass, TotalPass e parceiros",
  "Melhor Envio, WhatsApp e API REST",
  "Multi-unidades e multi-modalidades",
  "Relatórios, exportações e automações",
  "Backup em nuvem, LGPD e RLS por conta",
  "Suporte dedicado e atualizações contínuas",
];

// Sugestões de precificação para um ÚNICO plano com todos os módulos inclusos.
// Baseado em benchmark do mercado brasileiro (Tatame, Evo, W12, Pacto) considerando
// que concorrentes cobram por módulos separados e o Dojo Manager entrega tudo incluso.
type PriceSuggestion = {
  label: string;
  price: number;
  positioning: string;
  rationale: string;
  highlight?: boolean;
};

const suggestions: PriceSuggestion[] = [
  {
    label: "Entrada agressiva",
    price: 149,
    positioning: "Ganhar mercado rápido",
    rationale:
      "Abaixo dos concorrentes diretos. Ideal para os primeiros 6 meses, gerar volume, provar valor e coletar cases.",
  },
  {
    label: "Preço recomendado",
    price: 199,
    positioning: "Valor justo × mercado",
    rationale:
      "Alinhado com Tatame/Evo básico, mas entregando 3× mais módulos. Melhor equilíbrio entre conversão e margem.",
    highlight: true,
  },
  {
    label: "Premium",
    price: 279,
    positioning: "Posicionamento aspiracional",
    rationale:
      "Reflete o valor real da plataforma completa (AMT Pay, Store, Análise Individual). Para dojos que enxergam software como investimento.",
  },
];

export function Plans() {
  return (
    <Section
      id="planos"
      eyebrow="Plano único · sem pegadinhas"
      title="Um plano. Todos os módulos. Alunos ilimitados."
      description="Sem faixas por volume, sem upsell, sem módulo pago à parte. Escolha a precificação que faz sentido para a sua estratégia de entrada no mercado."
      className="bg-white"
    >
      <FadeIn>
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {suggestions.map((s) => (
            <div
              key={s.label}
              className={
                s.highlight
                  ? "relative flex flex-col rounded-3xl border-2 border-[#C1121F] bg-[#111111] p-7 text-white shadow-[0_30px_60px_-25px_rgba(193,18,31,0.55)]"
                  : "relative flex flex-col rounded-3xl border border-[#111111]/10 bg-white p-7 text-[#111111] shadow-sm"
              }
            >
              {s.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#C1121F] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                  <Sparkles className="mr-1 inline h-3 w-3" /> Recomendado
                </span>
              )}

              <p
                className={
                  s.highlight
                    ? "text-[10px] font-bold uppercase tracking-wider text-white/70"
                    : "text-[10px] font-bold uppercase tracking-wider text-[#C1121F]"
                }
              >
                {s.label}
              </p>
              <h3 className={s.highlight ? "mt-2 text-lg font-semibold text-white" : "mt-2 text-lg font-semibold"}>
                {s.positioning}
              </h3>

              <div className="mt-5 flex items-baseline gap-1">
                <span className={s.highlight ? "text-sm font-medium text-white/60" : "text-sm font-medium text-[#111111]/60"}>
                  R$
                </span>
                <span className="text-5xl font-bold tracking-tight">{s.price}</span>
                <span className={s.highlight ? "text-sm font-medium text-white/60" : "text-sm font-medium text-[#111111]/60"}>
                  /mês
                </span>
              </div>
              <p className={s.highlight ? "mt-1 text-xs text-white/50" : "mt-1 text-xs text-[#111111]/50"}>
                No plano anual · mensal +20%
              </p>

              <p className={s.highlight ? "mt-5 text-sm leading-relaxed text-white/80" : "mt-5 text-sm leading-relaxed text-[#111111]/70"}>
                {s.rationale}
              </p>

              {s.highlight && (
                <Button
                  asChild
                  className="mt-6 w-full rounded-full bg-[#C1121F] text-white hover:bg-[#a30f1a]"
                >
                  <a href="#cta">Testar 14 dias grátis</a>
                </Button>
              )}
            </div>
          ))}
        </div>
      </FadeIn>

      <FadeIn>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 rounded-3xl border border-[#111111]/10 bg-[#FAFAFA] p-6 sm:grid-cols-2 md:grid-cols-4 md:p-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#111111]/50">Alunos</p>
            <p className="mt-1 text-lg font-semibold">Ilimitados</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#111111]/50">Unidades</p>
            <p className="mt-1 text-lg font-semibold">Ilimitadas</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#111111]/50">Modalidades</p>
            <p className="mt-1 text-lg font-semibold">Ilimitadas</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#C1121F]">AMT Pay</p>
            <p className="mt-1 text-lg font-semibold">2% por transação</p>
          </div>
        </div>
      </FadeIn>

      <FadeIn>
        <div className="mx-auto mt-8 max-w-5xl rounded-3xl border border-[#111111]/10 bg-white p-8 md:p-10">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#C1121F]">
                O que está incluso
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                {allModules.length} módulos. Zero módulos pagos à parte.
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-[#111111]/60">
                Concorrentes cobram por módulo (financeiro, app, avaliações, loja). O Dojo Manager entrega tudo em um único preço, com 14 dias grátis e sem taxa de setup.
              </p>
            </div>
          </div>

          <ul className="mt-8 grid gap-3 text-sm text-[#111111]/80 sm:grid-cols-2 lg:grid-cols-3">
            {allModules.map((m) => (
              <li key={m} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C1121F]" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      </FadeIn>
    </Section>
  );
}
