import { Section, FadeIn } from "./Section";

const items = [
  "GymPass", "TotalPass", "PIX", "Cartão", "Boleto", "WhatsApp", "E-mail", "API REST",
];

export function Integrations() {
  return (
    <Section
      id="integracoes"
      eyebrow="Integrações"
      title="Conecte sua academia às principais plataformas do mercado."
      description="Pagamentos, benefícios corporativos, comunicação e APIs — tudo pronto para conectar."
      className="bg-white"
    >
      <FadeIn>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {items.map((name) => (
            <div
              key={name}
              className="flex h-20 items-center justify-center rounded-xl border border-black/5 bg-neutral-50 px-3 text-center text-sm font-semibold text-[#111111]/70 transition-all hover:-translate-y-0.5 hover:border-[#C1121F]/20 hover:bg-white hover:text-[#111111] hover:shadow-md"
            >
              {name}
            </div>
          ))}
        </div>
      </FadeIn>
    </Section>
  );
}
