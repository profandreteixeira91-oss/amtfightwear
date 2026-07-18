import {
  LayoutDashboard, Users, GraduationCap, School, Calendar, Wallet, Award,
  ScrollText, Trophy, ClipboardCheck, BarChart3, Bell, Smartphone, Plug, ShoppingBag, Settings,
} from "lucide-react";
import { Section, FadeIn } from "./Section";

const modules = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Users, label: "Alunos" },
  { icon: GraduationCap, label: "Professores" },
  { icon: School, label: "Turmas" },
  { icon: Calendar, label: "Agenda" },
  { icon: Wallet, label: "Financeiro" },
  { icon: Award, label: "Graduações" },
  { icon: ScrollText, label: "Certificados" },
  { icon: Trophy, label: "Competições" },
  { icon: ClipboardCheck, label: "Presença" },
  { icon: BarChart3, label: "Relatórios" },
  { icon: Bell, label: "Notificações" },
  { icon: Smartphone, label: "App do Aluno" },
  { icon: Plug, label: "Integrações" },
  { icon: ShoppingBag, label: "Loja" },
  { icon: Settings, label: "Configurações" },
];

export function ModulesGrid() {
  return (
    <Section
      id="modulos"
      eyebrow="Módulos"
      title="Tudo o que sua academia precisa."
      description="Cada módulo foi desenhado para funcionar de forma independente ou totalmente integrado."
      className="bg-neutral-50"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
        {modules.map((m, i) => (
          <FadeIn key={m.label} delay={i * 0.025}>
            <div className="group flex aspect-square flex-col items-center justify-center rounded-2xl border border-black/5 bg-white p-4 text-center transition-all hover:-translate-y-1 hover:border-[#C1121F]/30 hover:shadow-lg">
              <m.icon className="h-6 w-6 text-[#111111] transition-colors group-hover:text-[#C1121F]" strokeWidth={1.6} />
              <span className="mt-3 text-xs font-semibold text-[#111111]/80">{m.label}</span>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}
