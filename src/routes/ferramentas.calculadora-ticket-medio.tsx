import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CTABand } from "@/components/dojo/landing/CTABand";
import { CurrentTicketPart, computeCurrent, type CurrentValues } from "@/components/dojo/tools/CurrentTicketPart";
import { IdealTicketPart, EMPTY_IDEAL, type IdealValues } from "@/components/dojo/tools/IdealTicketPart";

const TITLE = "Calculadora de Ticket Médio para Academias | AMT Dojo Manager";
const DESC = "Calcule grátis o ticket médio atual da sua academia de artes marciais e quanto cobrar por aluno para cobrir despesas e atingir sua meta de lucro.";

export const Route = createFileRoute("/ferramentas/calculadora-ticket-medio")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://amtfightwear.com.br/ferramentas/calculadora-ticket-medio" }],
  }),
  component: TicketCalculatorPage,
});

const EMPTY_CURRENT: CurrentValues = { revenue: "", students: "", expenses: "" };

function TicketCalculatorPage() {
  // Estado apenas em memória: nada é enviado ou salvo.
  const [current, setCurrent] = useState<CurrentValues>(EMPTY_CURRENT);
  const [ideal, setIdeal] = useState<IdealValues>(EMPTY_IDEAL);
  const currentTicket = computeCurrent(current)?.ticket ?? null;

  const reset = () => {
    setCurrent(EMPTY_CURRENT);
    setIdeal(EMPTY_IDEAL);
  };

  return (
    <div className="dojo-theme min-h-screen bg-white text-[#111111] antialiased">
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-16">
        <Link to="/dojo" className="inline-flex items-center gap-1 text-sm text-[#111111]/60 hover:text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1121F]/40">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dojo Manager
        </Link>
        <header className="mt-6 max-w-3xl">
          <span className="inline-block rounded-full border border-[#C1121F]/20 bg-[#C1121F]/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#C1121F]">
            Ferramenta gratuita
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
            Calculadora de Ticket Médio para Academias de Artes Marciais
          </h1>
          <p className="mt-4 text-base text-[#111111]/65 md:text-lg">
            Descubra seu ticket médio atual e estime quanto sua academia precisa gerar por aluno para cobrir as despesas e alcançar sua meta de lucro.
          </p>
        </header>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={reset} className="rounded-full">
            <RotateCcw className="mr-1 h-4 w-4" aria-hidden="true" /> Limpar dados
          </Button>
        </div>

        <div className="mt-4 space-y-8">
          <CurrentTicketPart values={current} onChange={setCurrent} />
          <IdealTicketPart values={ideal} onChange={setIdeal} currentTicket={currentTicket} />
        </div>

        <section className="mx-auto mt-14 flex max-w-4xl flex-col items-center gap-4 rounded-3xl border border-black/10 bg-[#111111] p-7 text-center text-white md:p-9">
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">Quer profissionalizar a gestão do seu dojo?</h2>
          <p className="max-w-2xl text-sm text-white/70 md:text-base">
            Organize alunos, turmas, horários, check-ins e financeiro em uma plataforma desenvolvida para academias de artes marciais.
          </p>
          <Button asChild size="lg" className="min-h-12 rounded-full bg-[#C1121F] px-7 font-bold text-white hover:bg-[#a30f1a]">
            <a href="/dojo/auth">Conhecer o Dojo Manager</a>
          </Button>
        </section>
      </main>
    </div>
  );
}
