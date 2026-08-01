import { Clock, Wallet, Award, Smartphone, TrendingDown, LayoutGrid } from "lucide-react";
import { Section, FadeIn } from "./Section";
import { CTABand } from "./CTABand";
import { SHOT, type ShotKey } from "./shots";

const items: { icon: typeof Clock; title: string; desc: string; shot: ShotKey; caption: string }[] = [
  {
    icon: Clock,
    title: "Economize horas todos os dias",
    desc: "Um painel único mostra alunos, caixa, aulas do dia e pendências. O que levava a tarde toda em planilhas vira dois cliques.",
    shot: "dashboard",
    caption: "Dashboard real do AMT Dojo Manager",
  },
  {
    icon: Wallet,
    title: "Automatize cobranças",
    desc: "Mensalidades recorrentes com PIX, cartão e boleto. O sistema gera, envia e concilia — você só acompanha o resultado.",
    shot: "finance",
    caption: "Financeiro real com mensalidades e fluxo de caixa",
  },
  {
    icon: Award,
    title: "Nunca mais esqueça uma graduação",
    desc: "Critérios por tempo, aulas e mérito. O sistema avisa quem está apto, registra o histórico e emite o certificado.",
    shot: "graduations",
    caption: "Módulo real de graduações e faixas",
  },
  {
    icon: Smartphone,
    title: "Controle tudo pelo celular",
    desc: "Aplicativo instalável para você e para o aluno. Check-in, presença, carteirinha e financeiro na palma da mão.",
    shot: "checkin",
    caption: "Check-in real com validação por localização",
  },
  {
    icon: TrendingDown,
    title: "Reduza a inadimplência",
    desc: "Lembretes automáticos antes e depois do vencimento, com link de pagamento pronto. Menos atraso, mais previsibilidade.",
    shot: "students",
    caption: "Base real de alunos com situação financeira",
  },
  {
    icon: LayoutGrid,
    title: "Tenha sua academia organizada",
    desc: "Agenda, turmas, professores, avaliações e comunicação no mesmo lugar. Nada depende mais da sua memória.",
    shot: "schedule",
    caption: "Agenda real de aulas e turmas",
  },
];

export function Transformation() {
  return (
    <Section
      id="beneficios"
      eyebrow="A transformação"
      title="O que muda na sua academia a partir de hoje."
      description="Antes de falar de módulos, veja o resultado prático — com telas reais do sistema."
      className="bg-white"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {items.map((it, i) => (
          <FadeIn key={it.title} delay={i * 0.05}>
            <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_2px_24px_-12px_rgba(0,0,0,0.15)] transition-all hover:-translate-y-1 hover:border-[#C1121F]/25 hover:shadow-[0_30px_60px_-30px_rgba(193,18,31,0.3)]">
              <div className="flex items-start gap-4 p-6 md:p-7">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#111111] text-white transition-colors group-hover:bg-[#C1121F]">
                  <it.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold tracking-tight text-[#111111] md:text-xl">{it.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#111111]/65">{it.desc}</p>
                </div>
              </div>
              <ShotFrame
                className="mt-auto border-t border-black/5"
                src={SHOT[it.shot]}
                alt={it.caption}
                caption={it.caption}
              />

            </article>
          </FadeIn>
        ))}
      </div>

      <CTABand title="Quer esse resultado na sua academia?" />
    </Section>
  );
}
