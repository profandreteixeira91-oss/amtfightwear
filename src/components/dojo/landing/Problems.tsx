import { X } from "lucide-react";
import { Section, FadeIn } from "./Section";

const problems = [
  { t: "Controle em planilhas", d: "Dados espalhados, sem histórico e sem confiança nos números." },
  { t: "Cobranças manuais", d: "Você cobrando aluno por aluno, todo mês, no WhatsApp." },
  { t: "Inadimplência", d: "Mensalidade vence e ninguém percebe até faltar dinheiro no caixa." },
  { t: "Contratos impressos", d: "Papel, assinatura na recepção e nada organizado quando precisa." },
  { t: "Graduações esquecidas", d: "Aluno pronto há meses e o professor sem visibilidade nenhuma." },
  { t: "Controle financeiro separado", d: "Caderno, app do banco e planilha que nunca fecham igual." },
  { t: "Presença manual", d: "Lista em papel, frequência incerta e zero dado para reter aluno." },
  { t: "Falta de organização", d: "Tudo depende de você lembrar. Sua academia não escala assim." },
];

export function Problems() {
  return (
    <Section
      id="problemas"
      eyebrow="O problema"
      title="Sua academia ainda sofre com isso?"
      description="Se você reconhece três ou mais itens abaixo, sua academia está perdendo tempo e dinheiro todos os meses."
      className="bg-[#0d0d0d] text-white"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {problems.map((p, i) => (
          <FadeIn key={p.t} delay={i * 0.04}>
            <div className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-colors hover:border-[#C1121F]/50">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#C1121F]/15 text-[#ff6b76]">
                <X className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold text-white">{p.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/55">{p.d}</p>
            </div>
          </FadeIn>
        ))}
      </div>

      <FadeIn>
        <p className="mx-auto mt-12 max-w-3xl text-center text-lg font-semibold leading-relaxed text-white md:text-2xl">
          Foi exatamente para resolver esses problemas que nasceu o{" "}
          <span className="text-[#ff6b76]">AMT Dojo Manager</span>.
        </p>
      </FadeIn>
    </Section>
  );
}
