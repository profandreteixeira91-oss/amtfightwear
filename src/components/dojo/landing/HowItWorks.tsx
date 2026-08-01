import { Section, FadeIn } from "./Section";
import { CTABand } from "./CTABand";

const steps = [
  { n: "1", t: "Cadastre sua academia", d: "Crie a conta em menos de 2 minutos: nome, modalidades e unidade. Sem instalação, sem técnico." },
  { n: "2", t: "Importe seus alunos", d: "Traga sua planilha ou cadastre pelo wizard guiado. Faixas, planos e histórico ficam prontos." },
  { n: "3", t: "Configure planos e pagamentos", d: "Defina mensalidades, vencimentos e ative PIX, cartão e boleto com o AMT Pay." },
  { n: "4", t: "Comece a administrar tudo automaticamente", d: "Cobranças, check-ins, graduações e avisos passam a rodar sozinhos." },
];

export function HowItWorks() {
  return (
    <Section
      id="como-funciona"
      eyebrow="Como funciona"
      title="Sua academia rodando em 4 passos."
      description="Do cadastro à gestão automática — sem migração complicada e sem custo de implantação."
      className="bg-neutral-50"
    >
      <ol className="relative mx-auto max-w-3xl">
        <span className="absolute left-[26px] top-3 bottom-3 w-px bg-gradient-to-b from-[#C1121F] via-[#C1121F]/40 to-transparent md:left-[30px]" aria-hidden="true" />
        {steps.map((s, i) => (
          <FadeIn key={s.n} delay={i * 0.06}>
            <li className="relative flex gap-5 pb-9 last:pb-0">
              <span className="z-10 grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-[#111111] text-lg font-black text-white shadow-lg md:h-[60px] md:w-[60px]">
                {s.n}
              </span>
              <div className="min-w-0 pt-2">
                <h3 className="text-lg font-bold tracking-tight text-[#111111] md:text-xl">{s.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#111111]/65 md:text-base">{s.d}</p>
              </div>
            </li>
          </FadeIn>
        ))}
      </ol>

      <CTABand title="Configuração rápida. Resultado no primeiro dia." />
    </Section>
  );
}
