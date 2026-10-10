import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SHOT } from "./shots";

export function Hero() {
  return (
    <section id="top" className="px-4 pt-14 pb-20 md:px-6 md:pt-20 md:pb-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <motion.div className="min-w-0" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-block rounded-full border border-[#C1121F]/20 bg-[#C1121F]/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#C1121F]">
            Gestão para academias de artes marciais
          </span>
          <h1 className="mt-5 text-[2rem] font-black leading-[1.08] tracking-tight text-[#111111] sm:text-5xl lg:text-[3.5rem]">
            Seu dojo mais organizado. <span className="text-[#C1121F]">Sua gestão sob controle.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#111111]/65 md:text-lg">
            Gerencie alunos, aulas, graduações, frequência e financeiro em uma plataforma criada para a rotina das academias de artes marciais.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="group min-h-12 rounded-full bg-[#C1121F] px-7 text-base font-bold text-white shadow-lg shadow-[#C1121F]/25 hover:bg-[#a30f1a]">
              <a href="/dojo/auth">
                Conhecer o Dojo Manager
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
            </Button>
            <a href="#modulos" className="inline-flex min-h-12 items-center justify-center px-4 text-base font-semibold text-[#111111]/75 underline-offset-4 hover:text-[#C1121F] hover:underline">
              Explorar funcionalidades
            </a>
          </div>
          <p className="mt-5 text-sm text-[#111111]/50">14 dias de teste com acesso completo.</p>
        </motion.div>

        <motion.figure
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="min-w-0 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_40px_80px_-40px_rgba(0,0,0,0.35)]"
        >
          <div className="aspect-[16/10] bg-neutral-100">
            <img
              src={SHOT.dashboard}
              alt="Tela real do painel do AMT Dojo Manager"
              className="h-full w-full object-cover object-left-top"
              fetchPriority="high"
              decoding="async"
            />
          </div>
          <figcaption className="border-t border-black/5 px-4 py-2.5 text-xs font-medium text-[#111111]/50">
            Painel do dono da academia
          </figcaption>
        </motion.figure>
      </div>
    </section>
  );
}
