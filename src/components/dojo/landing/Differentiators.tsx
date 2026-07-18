import { Cloud, Monitor, Tablet, Smartphone, RefreshCw, Lock, Database, Users } from "lucide-react";
import { Section, FadeIn } from "./Section";

const items = [
  { icon: Cloud, label: "Sistema 100% online" },
  { icon: Monitor, label: "Acesso por computador" },
  { icon: Tablet, label: "Tablet" },
  { icon: Smartphone, label: "Smartphone" },
  { icon: RefreshCw, label: "Atualizações constantes" },
  { icon: Lock, label: "Segurança em nuvem" },
  { icon: Database, label: "Backup automático" },
  { icon: Users, label: "Permissões por usuário" },
];

export function Differentiators() {
  return (
    <Section
      id="diferenciais"
      eyebrow="Diferenciais"
      title="Tecnologia de ponta a serviço do seu dojo."
      className="bg-[#111111] text-white"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <FadeIn key={it.label} delay={i * 0.04}>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-[#C1121F]/50 hover:bg-white/[0.06]">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#C1121F]/15 text-[#C1121F]">
                <it.icon className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <span className="text-sm font-medium">{it.label}</span>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}
