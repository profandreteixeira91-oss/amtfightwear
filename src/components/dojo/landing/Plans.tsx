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

// Plano único com preço promocional de lançamento.
// De R$ 179,90 por R$ 99,90/mês — todos os módulos inclusos, alunos ilimitados.
type PriceSuggestion = {
  label: string;
  price: number;
  originalPrice?: number;
  positioning: string;
  rationale: string;
  highlight?: boolean;
};

const suggestions: PriceSuggestion[] = [
  {
    label: "Oferta de lançamento",
    price: 99.9,
    originalPrice: 179.9,
    positioning: "Plano único · tudo incluso",
    rationale:
      "De R$ 179,90 por R$ 99,90/mês. Alunos, unidades e modalidades ilimitados. AMT Pay com apenas 2% por transação. 14 dias grátis, sem cartão e sem taxa de setup.",
    highlight: true,
  },
];

export function Plans() {
  return (
    <Section
      id="planos"
      eyebrow="Plano único · sem pegadinhas"
      title="Um plano. Todos os módulos. Alunos ilimitados."
      description="Um único plano, todos os módulos inclusos, alunos ilimitados. Oferta de lançamento por tempo limitado."
      className="bg-white"
    >
      <FadeIn>
        <div className="mx-auto grid max-w-xl gap-6">
          {suggestions.map((s) => (
            <div
              key={s.label}
              className="relative flex flex-col rounded-3xl border-2 border-[#C1121F] bg-[#111111] p-8 text-white shadow-[0_30px_60px_-25px_rgba(193,18,31,0.55)]"
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#C1121F] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow">
                <Sparkles className="mr-1 inline h-3 w-3" /> {s.label}
              </span>

              <h3 className="mt-2 text-lg font-semibold text-white">{s.positioning}</h3>

              {s.originalPrice && (
                <div className="mt-5 flex items-center gap-2">
                  <span className="text-sm font-medium text-white/50 line-through">
                    De R$ {s.originalPrice.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="rounded-full bg-[#C1121F]/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#ff8a95]">
                    -44%
                  </span>
                </div>
              )}

              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-sm font-medium text-white/60">R$</span>
                <span className="text-6xl font-bold tracking-tight">
                  {Math.floor(s.price)}
                  <span className="text-3xl">,{String(s.price.toFixed(2)).split(".")[1]}</span>
                </span>
                <span className="text-sm font-medium text-white/60">/mês</span>
              </div>
              <p className="mt-1 text-xs text-white/50">Cobrança recorrente · cancele quando quiser</p>

              <p className="mt-5 text-sm leading-relaxed text-white/80">{s.rationale}</p>

              <Button
                asChild
                className="mt-6 min-h-12 w-full rounded-full bg-[#C1121F] text-white hover:bg-[#a30f1a]"
              >
                <a href="#cta">Testar 14 dias grátis</a>
              </Button>
            </div>
          ))}
        </div>
      </FadeIn>


      <FadeIn>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 rounded-3xl border border-[#111111]/10 bg-[#FAFAFA] p-6 sm:grid-cols-2 md:grid-cols-4 md:p-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#111111]/50">Alunos</p>
            <p className="mt-1 text-lg font-semibold">Ilimitados</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#111111]/50">Unidades</p>
            <p className="mt-1 text-lg font-semibold">Ilimitadas</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#111111]/50">Modalidades</p>
            <p className="mt-1 text-lg font-semibold">Ilimitadas</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#C1121F]">AMT Pay</p>
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
