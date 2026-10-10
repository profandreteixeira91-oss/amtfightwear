import { LayoutGrid, CalendarCheck, Award, Wallet } from "lucide-react";
import { Section, FadeIn } from "./Section";

const BENEFITS = [
  { icon: LayoutGrid, title: "Gestão centralizada", desc: "Cadastros, turmas, contratos e equipe reunidos em um único painel." },
  { icon: CalendarCheck, title: "Frequência em dia", desc: "Check-in por QR Code e histórico de presença de cada aluno." },
  { icon: Award, title: "Graduações organizadas", desc: "Faixas, graus e critérios registrados por modalidade." },
  { icon: Wallet, title: "Financeiro sob controle", desc: "Mensalidades, despesas e inadimplência acompanhadas mês a mês." },
];

export function Benefits() {
  return (
    <Section
      id="recursos"
      eyebrow="Benefícios"
      title="Menos planilha. Mais tempo no tatame."
      className="border-t border-black/5 bg-neutral-50"
    >
      <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map((b, i) => (
          <FadeIn key={b.title} delay={i * 0.05} className="min-w-0">
            <b.icon className="h-6 w-6 text-[#C1121F]" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-bold text-[#111111]">{b.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#111111]/60">{b.desc}</p>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}
