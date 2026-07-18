import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, FadeIn } from "./Section";

const plans = [
  {
    name: "Starter",
    tag: "Pequenas academias",
    features: [
      "Até 100 alunos",
      "1 unidade",
      "Gestão financeira",
      "Graduações e certificados",
      "App do aluno",
      "Suporte por e-mail",
    ],
  },
  {
    name: "Professional",
    tag: "Academias em crescimento",
    highlight: true,
    features: [
      "Alunos ilimitados",
      "Até 3 unidades",
      "Integração GymPass e TotalPass",
      "Integração AMT Fight Wear",
      "Competições",
      "Automações e WhatsApp",
      "Suporte prioritário",
    ],
  },
  {
    name: "Enterprise",
    tag: "Redes de academias",
    features: [
      "Unidades ilimitadas",
      "Relatórios consolidados",
      "Permissões avançadas",
      "API REST dedicada",
      "Onboarding personalizado",
      "Gerente de conta dedicado",
    ],
  },
];

export function Plans() {
  return (
    <Section
      id="planos"
      eyebrow="Planos"
      title="Escolha o plano ideal para a sua academia."
      description="Do dojo local à rede nacional — temos o plano certo para o seu momento."
      className="bg-white"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((p, i) => (
          <FadeIn key={p.name} delay={i * 0.08}>
            <div
              className={`relative flex h-full flex-col rounded-3xl border p-8 transition-all ${
                p.highlight
                  ? "border-[#C1121F] bg-[#111111] text-white shadow-[0_30px_60px_-20px_rgba(193,18,31,0.4)]"
                  : "border-black/10 bg-white text-[#111111] hover:shadow-lg"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#C1121F] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Mais popular
                </span>
              )}
              <p className={`text-xs font-semibold uppercase tracking-wider ${p.highlight ? "text-[#C1121F]" : "text-[#C1121F]"}`}>
                {p.tag}
              </p>
              <h3 className="mt-2 text-2xl font-bold">{p.name}</h3>
              <ul className={`mt-6 flex-1 space-y-3 text-sm ${p.highlight ? "text-white/80" : "text-[#111111]/70"}`}>
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${p.highlight ? "text-[#C1121F]" : "text-[#C1121F]"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="lg"
                className={`mt-8 w-full rounded-full ${
                  p.highlight
                    ? "bg-[#C1121F] text-white hover:bg-[#a30f1a]"
                    : "bg-[#111111] text-white hover:bg-black"
                }`}
              >
                <a href="#cta">Solicitar orçamento</a>
              </Button>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}
