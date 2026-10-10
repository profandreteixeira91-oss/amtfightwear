import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section id="cta" className="px-4 py-20 md:px-6 md:py-28">
      <div className="mx-auto max-w-5xl rounded-3xl bg-[#111111] px-6 py-14 text-center md:px-16 md:py-20">
        <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight text-white md:text-5xl">
          Leve a gestão do seu dojo para outro nível.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-white/65 md:text-lg">
          Conheça uma forma mais organizada de administrar sua academia e acompanhar a rotina dos seus alunos.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="group min-h-12 rounded-full bg-[#C1121F] px-7 text-base font-bold text-white hover:bg-[#a30f1a]">
            <a href="/dojo/auth">
              Quero conhecer o Dojo Manager
              <ArrowRight className="ml-1 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
          </Button>
          <Button asChild size="lg" variant="ghost" className="min-h-12 rounded-full px-6 text-base text-white/80 hover:bg-white/10 hover:text-white">
            <a href="mailto:contato@amtfightwear.com.br?subject=Demonstração AMT Dojo Manager">Solicitar demonstração</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
