import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section id="cta" className="px-4 py-24 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-black/5 bg-white p-10 text-center shadow-[0_40px_80px_-30px_rgba(193,18,31,0.25)] md:p-16"
      >
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#C1121F]/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#111111]/5 blur-3xl" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[#111111] md:text-5xl">
          Transforme a gestão da sua academia.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base text-[#111111]/60 md:text-lg">
          Centralize alunos, professores, financeiro, graduações, competições e vendas em uma única plataforma.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="rounded-full bg-[#C1121F] px-7 text-white shadow-lg shadow-[#C1121F]/20 hover:bg-[#a30f1a]">
            <a href="mailto:contato@amtfightwear.com.br?subject=Demonstração AMT Dojo Manager">Solicitar Demonstração</a>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full border-black/15 bg-white px-7 text-[#111111] hover:bg-black/5">
            <a href="/dojo/auth">Teste Grátis</a>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
