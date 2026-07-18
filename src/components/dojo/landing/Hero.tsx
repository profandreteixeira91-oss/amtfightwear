import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardMockup } from "./DashboardMockup";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-4 pt-14 pb-20 md:px-6 md:pt-20 md:pb-28">
      {/* subtle bg */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#C1121F]/5 blur-3xl" />
        <svg className="absolute inset-0 h-full w-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#111" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-[#111111]/70 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-[#C1121F]" />
            Novo · Integração completa com AMT Fight Wear
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-[#111111] md:text-5xl lg:text-6xl">
            Gerencie sua academia de artes marciais em{" "}
            <span className="text-[#C1121F]">um único lugar</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-[#111111]/60">
            O AMT Dojo Manager reúne alunos, professores, financeiro, graduações, competições e vendas em uma única plataforma moderna e intuitiva.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="group rounded-full bg-[#C1121F] px-6 text-white shadow-lg shadow-[#C1121F]/20 hover:bg-[#a30f1a]">
              <a href="#cta">
                Solicitar Demonstração
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-black/15 bg-white px-6 text-[#111111] hover:bg-black/5">
              <a href="#cta">Teste Grátis</a>
            </Button>
          </div>
          <div className="mt-8 flex items-center gap-6 text-xs text-[#111111]/50">
            <div className="flex -space-x-2">
              {["#C1121F", "#111", "#666"].map((c) => (
                <span key={c} className="h-7 w-7 rounded-full border-2 border-white" style={{ background: c }} />
              ))}
            </div>
            <span>Academias em todo Brasil já usam o AMT Dojo Manager.</span>
          </div>
        </motion.div>

        <DashboardMockup />
      </div>
    </section>
  );
}
