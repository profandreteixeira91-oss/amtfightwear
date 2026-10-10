import { Swords, Smartphone, FileSignature, ShieldCheck } from "lucide-react";
import { Section, FadeIn } from "./Section";

const ITEMS = [
  { icon: Swords, title: "Feito para artes marciais", desc: "Modalidades, faixas e graus fazem parte do sistema desde o início." },
  { icon: Smartphone, title: "App do aluno incluso", desc: "Carteirinha, faturas e avisos no celular de cada aluno." },
  { icon: FileSignature, title: "Contratos e certificados", desc: "Editores próprios, sem depender de Word ou programas externos." },
  { icon: ShieldCheck, title: "Acesso por função", desc: "Professores e recepção veem apenas o que precisam." },
];

export function Differentiators() {
  return (
    <Section id="diferenciais" eyebrow="Diferenciais" title="Pensado para a rotina do dojo.">
      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
        {ITEMS.map((it, i) => (
          <FadeIn key={it.title} delay={i * 0.05} className="flex min-w-0 gap-4 rounded-2xl border border-black/5 p-6">
            <it.icon className="mt-0.5 h-6 w-6 shrink-0 text-[#C1121F]" aria-hidden="true" />
            <div className="min-w-0">
              <h3 className="font-bold text-[#111111]">{it.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#111111]/60">{it.desc}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}
