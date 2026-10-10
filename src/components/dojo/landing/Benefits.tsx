import { LayoutGrid, CalendarCheck, Award, Wallet } from "lucide-react";
import { Section, FadeIn } from "./Section";

const benefits = [
  { icon: LayoutGrid, title: "Gestão centralizada", desc: "Alunos, equipe, contratos e planos reunidos em um único painel." },
  { icon: CalendarCheck, title: "Frequência em dia", desc: "Check-in por QR Code e histórico de presença de cada aluno." },
  { icon: Award, title: "Graduações organizadas", desc: "Faixas, graus e critérios por modalidade, com certificados." },
  { icon: Wallet, title: "Financeiro sob controle", desc: "Mensalidades, recebimentos e despesas acompanhados mês a mês." },
];

export function Benefits() {
  return (
    <Section id="recursos" eyebrow="Benefícios" title="O essencial da academia, no lugar certo." className="bg-neutral-50">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b, i) => (
          <FadeIn key={b.title} delay={i * 0.05}>
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#C1121F]/10 text-[#C1121F]">
              <b.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-[#111111]">{b.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#111111]/60">{b.desc}</p>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}
