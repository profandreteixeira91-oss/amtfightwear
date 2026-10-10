import { Link } from "@tanstack/react-router";
import { ArrowRight, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, FadeIn } from "./Section";

/** Seção "Ferramentas gratuitas" da landing do Dojo Manager. */
export function FreeTools() {
  return (
    <Section
      id="ferramentas"
      eyebrow="Grátis"
      title="Ferramentas gratuitas para a gestão do seu dojo."
      description="Utilize ferramentas práticas para entender melhor os números da sua academia, planejar suas metas e tomar decisões financeiras com mais clareza."
      className="bg-[#FAFAFA]"
    >
      <FadeIn className="mx-auto max-w-3xl">
        <article className="flex flex-col gap-6 rounded-3xl border border-black/10 bg-white p-7 shadow-sm md:flex-row md:items-center md:p-9">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#C1121F]/10 text-[#C1121F]">
            <Calculator className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold tracking-tight">Calculadora de Ticket Médio</h3>
            <p className="mt-2 text-sm text-[#111111]/65 md:text-base">
              Descubra quanto cada aluno gera de receita para sua academia e estime quanto você precisa cobrar para
              cobrir os custos e alcançar seu objetivo de lucro.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="group min-h-12 shrink-0 rounded-full bg-[#C1121F] px-6 font-bold text-white hover:bg-[#a30f1a]"
          >
            <Link to="/ferramentas/calculadora-ticket-medio">
              Calcular meu ticket médio
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </article>
      </FadeIn>
    </Section>
  );
}
