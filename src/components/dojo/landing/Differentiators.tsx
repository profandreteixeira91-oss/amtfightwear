import { Swords, Smartphone, FileSignature, ShieldCheck } from "lucide-react";
import { Section, FadeIn } from "./Section";

const items = [
  { icon: Swords, title: "Feito para artes marciais", desc: "Faixas, graus, modalidades e graduações fazem parte do sistema." },
  { icon: Smartphone, title: "App do aluno incluso", desc: "Check-in, mensalidades, contratos e avisos no celular do aluno." },
  { icon: FileSignature, title: "Contratos e certificados", desc: "Editores próprios, sem depender de outros programas." },
  { icon: ShieldCheck, title: "Acesso por função", desc: "Dono, professores e recepção veem apenas o que precisam." },
];

export function Differentiators() {
  return (
    <Section id="diferenciais" eyebrow="Diferenciais" title="Pensado para a rotina do tatame." className="bg-[#111111] text-white">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <FadeIn key={it.title} delay={i * 0.05}>
            <it.icon className="h-6 w-6 text-[#C1121F]" strokeWidth={1.8} aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">{it.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">{it.desc}</p>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}
