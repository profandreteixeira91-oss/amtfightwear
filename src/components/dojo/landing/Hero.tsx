import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SHOT } from "./shots";

/** Primeira dobra: o que é, para quem é e um caminho claro. */
export function Hero() {
  return (
    <section id="top" className="px-4 pt-14 pb-20 md:px-6 md:pt-20 md:pb-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C1121F]">
            Gestão para academias de artes marciais
          </p>
          <h1 className="mt-5 text-balance text-4xl font-black leading-[1.08] tracking-tight text-[#111111] sm:text-5xl lg:text-[3.5rem]">
            Seu dojo mais organizado. <span className="text-[#C1121F]">Sua gestão sob controle.</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-[#111111]/65 md:text-lg">
            Gerencie alunos, aulas, graduações, frequência e financeiro em uma plataforma criada para a rotina das
            academias de artes marciais.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="group min-h-12 rounded-full bg-[#C1121F] px-7 text-base font-bold text-white shadow-lg shadow-[#C1121F]/20 hover:bg-[#a30f1a]"
            >
              <a href="/dojo/auth">
                Conhecer o Dojo Manager
                <ArrowRight className="ml-1 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="min-h-12 rounded-full px-6 text-base font-semibold text-[#111111]/75 hover:bg-black/5 hover:text-[#111111]"
            >
              <a href="#modulos">Explorar funcionalidades</a>
            </Button>
          </div>
          <p className="mt-5 text-sm text-[#111111]/50">14 dias de teste com acesso completo.</p>
        </div>

        <figure className="min-w-0">
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-1.5 border-b border-black/5 bg-neutral-50 px-3 py-2" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
            </div>
            <img
              src={SHOT.dashboard}
              alt="Tela real do painel do AMT Dojo Manager"
              className="block aspect-[16/10] w-full object-cover object-left-top"
              fetchPriority="high"
              decoding="async"
            />
          </div>
          <figcaption className="mt-3 text-center text-xs text-[#111111]/45">Painel do dono da academia</figcaption>
        </figure>
      </div>
    </section>
  );
}
