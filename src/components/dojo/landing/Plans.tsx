import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, FadeIn } from "./Section";

const features = [
  "Alunos ilimitados",
  "Unidades ilimitadas",
  "Gestão financeira completa (PIX, cartão, boleto)",
  "Graduações e certificados automáticos",
  "App do Aluno com carteirinha digital",
  "Agenda de aulas e presença",
  "Competições e eventos",
  "Integração GymPass e TotalPass",
  "Integração com AMT Fight Wear",
  "WhatsApp, e-mail e API REST",
  "Relatórios e automações",
  "Backup em nuvem e segurança",
  "Suporte dedicado",
  "Atualizações constantes",
];

export function Plans() {
  return (
    <Section
      id="planos"
      eyebrow="Plano único"
      title="Um plano. Todos os recursos."
      description="Sem pegadinhas, sem upsell. Sua academia tem acesso completo à plataforma por uma mensalidade única."
      className="bg-white"
    >
      <FadeIn>
        <div className="mx-auto max-w-2xl">
          <div className="relative overflow-hidden rounded-3xl border border-[#C1121F]/20 bg-[#111111] p-8 text-white shadow-[0_40px_80px_-30px_rgba(193,18,31,0.45)] md:p-12">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#C1121F]/20 blur-3xl" />

            <div className="relative flex flex-col items-center text-center">
              <span className="rounded-full border border-[#C1121F]/40 bg-[#C1121F]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#C1121F]">
                AMT Dojo Manager · Completo
              </span>
              <h3 className="mt-5 text-2xl font-semibold text-white/90">Acesso completo à plataforma</h3>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-lg font-medium text-white/60">R$</span>
                <span className="text-6xl font-bold tracking-tight md:text-7xl">69,90</span>
                <span className="text-lg font-medium text-white/60">/mês</span>
              </div>
              <p className="mt-2 text-sm text-white/50">Mensalidade única — sem taxa de setup.</p>

              <Button
                asChild
                size="lg"
                className="mt-8 w-full max-w-sm rounded-full bg-[#C1121F] text-white shadow-lg shadow-[#C1121F]/30 hover:bg-[#a30f1a]"
              >
                <a href="#cta">Começar agora</a>
              </Button>
              <p className="mt-3 text-xs text-white/40">Teste grátis por 14 dias · Cancele quando quiser.</p>
            </div>

            <div className="relative mt-10 border-t border-white/10 pt-8">
              <p className="mb-5 text-center text-xs font-semibold uppercase tracking-wider text-white/50">
                Tudo incluso
              </p>
              <ul className="grid gap-3 text-sm text-white/80 sm:grid-cols-2">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C1121F]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </FadeIn>
    </Section>
  );
}
