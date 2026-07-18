import { Smartphone, Calendar, Building2, Award, ShoppingBag, Trophy, Plug, Wallet } from "lucide-react";
import { Section, FadeIn } from "./Section";

const features = [
  {
    icon: Smartphone,
    title: "App do Aluno",
    desc: "Carteirinha digital, presença nas aulas, histórico, graduações, notificações e perfil completo.",
  },
  {
    icon: Calendar,
    title: "Agenda de Aulas",
    desc: "Calendário, turmas, professores, limite de vagas e lista de presença em tempo real.",
  },
  {
    icon: Building2,
    title: "Multiunidades",
    desc: "Controle de diversas academias com relatórios individuais, consolidados e permissões por unidade.",
  },
  {
    icon: Award,
    title: "Sistema de Graduação",
    desc: "Controle completo das faixas, histórico, requisitos, tempo mínimo e emissão automática de certificados.",
  },
  {
    icon: ShoppingBag,
    title: "Integração AMT Fight Wear",
    desc: "Compra de faixas, kimonos, patches e produtos personalizados direto pelo sistema.",
  },
  {
    icon: Trophy,
    title: "Competições",
    desc: "Calendário de campeonatos, inscrições, histórico, resultados e agenda de eventos.",
  },
  {
    icon: Plug,
    title: "Integrações",
    desc: "GymPass, TotalPass, PIX, cartão, boleto, WhatsApp, e-mail e API REST prontos para uso.",
  },
  {
    icon: Wallet,
    title: "Financeiro Completo",
    desc: "Mensalidades, fluxo de caixa, receitas, despesas, inadimplência e relatórios detalhados.",
  },
];

export function Features() {
  return (
    <Section
      id="recursos"
      eyebrow="Funcionalidades"
      title="Tudo que sua academia precisa, em um só sistema."
      description="Módulos integrados que trabalham juntos para simplificar a gestão."
      className="bg-neutral-50"
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <FadeIn key={f.title} delay={i * 0.04}>
            <div className="group flex h-full flex-col rounded-2xl border border-black/5 bg-white p-6 transition-all hover:border-[#111111]/20 hover:shadow-lg">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg border border-black/10 bg-white text-[#C1121F] transition-colors group-hover:bg-[#C1121F] group-hover:text-white">
                <f.icon className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <h3 className="text-base font-semibold text-[#111111]">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#111111]/60">{f.desc}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}
