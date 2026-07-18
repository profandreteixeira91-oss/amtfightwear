import { Clock, LayoutGrid, Wallet, TrendingUp, UserCheck, Zap } from "lucide-react";
import { Section, FadeIn } from "./Section";

const benefits = [
  { icon: Clock, title: "Economia de tempo", desc: "Automatize tarefas repetitivas e foque no que importa: seus alunos." },
  { icon: LayoutGrid, title: "Organização completa", desc: "Todos os dados da academia centralizados em um único painel." },
  { icon: Wallet, title: "Gestão financeira", desc: "Controle mensalidades, receitas, despesas e inadimplência em tempo real." },
  { icon: TrendingUp, title: "Crescimento da academia", desc: "Dados e relatórios que ajudam a tomar decisões estratégicas." },
  { icon: UserCheck, title: "Controle de alunos", desc: "Frequência, graduações, histórico e engajamento de cada aluno." },
  { icon: Zap, title: "Automações inteligentes", desc: "Cobranças, notificações e certificados gerados automaticamente." },
];

export function Benefits() {
  return (
    <Section
      id="beneficios"
      eyebrow="Benefícios"
      title="Feito para academias que buscam excelência."
      description="Uma plataforma pensada para eliminar a complexidade da gestão diária."
      className="bg-white"
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map((b, i) => (
          <FadeIn key={b.title} delay={i * 0.05}>
            <div className="group h-full rounded-2xl border border-black/5 bg-white p-6 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-1 hover:border-[#C1121F]/20 hover:shadow-[0_20px_40px_-20px_rgba(193,18,31,0.25)]">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[#111111] text-white transition-colors group-hover:bg-[#C1121F]">
                <b.icon className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <h3 className="text-lg font-semibold text-[#111111]">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#111111]/60">{b.desc}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}
