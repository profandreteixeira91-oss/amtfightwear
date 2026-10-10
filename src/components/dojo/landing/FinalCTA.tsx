import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section id="cta" className="px-4 py-20 md:px-6 md:py-24">
      <div className="mx-auto max-w-5xl rounded-3xl bg-[#111111] px-6 py-14 text-center text-white md:px-16 md:py-20">
        <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Leve a gestão do seu dojo para outro nível.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-base text-white/65 md:text-lg">
          Teste por 14 dias com acesso completo e veja a academia organizada em um só lugar.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-h-12 rounded-full bg-[#C1121F] px-7 text-base font-bold text-white hover:bg-[#a30f1a]">
            <a href="/dojo/auth">Quero conhecer o Dojo Manager</a>
          </Button>
          <a
            href="mailto:contato@amtfightwear.com.br?subject=Demonstração AMT Dojo Manager"
            className="inline-flex min-h-12 items-center px-4 text-base font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline"
          >
            Solicitar demonstração
          </a>
        </div>
      </div>
    </section>
  );
}
