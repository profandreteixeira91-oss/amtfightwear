import { useState } from "react";
import { Check, Users, CalendarDays, GraduationCap, Megaphone, Wallet, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { Section } from "./Section";

const CATEGORIES = [
  { id: "alunos", icon: Users, title: "Alunos e equipe", items: ["Cadastro completo com responsável legal", "Matrículas e planos", "Contratos digitais com editor próprio", "Gestão de professores e colaboradores", "Portal da equipe com acesso por função"] },
  { id: "aulas", icon: CalendarDays, title: "Aulas e frequência", items: ["Agenda e turmas", "Check-in por QR Code", "Controle de presença por aluno e turma", "Bloqueio de check-in por inadimplência", "Integrações com Gympass e TotalPass"] },
  { id: "ensino", icon: GraduationCap, title: "Graduações e ensino", items: ["Modalidades, faixas e graus", "Critérios de graduação", "Avaliações preenchidas pelo instrutor", "Editor e gerador de certificados", "Competições da equipe"] },
  { id: "comunicacao", icon: Megaphone, title: "Comunicação e app", items: ["Mural de avisos", "Aplicativo do aluno", "Notificações no celular", "Carteirinha com QR Code", "Contratos e mensalidades no app"] },
  { id: "financeiro", icon: Wallet, title: "Gestão financeira", items: ["Mensalidades e cobranças", "Antecipação de mensalidades", "Contas a pagar e a receber", "Despesas e fluxo de caixa mensal", "Pagamentos por PIX e cartão"] },
  { id: "expansao", icon: Store, title: "Expansão", items: ["Loja integrada AMT Fight Wear", "Pedidos de kimonos e faixas", "Ranking de alunos", "Relatórios do dojo"] },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

export function ModulesShowcase() {
  const [active, setActive] = useState<CategoryId>("alunos");
  const current = CATEGORIES.find((c) => c.id === active) ?? CATEGORIES[0];

  return (
    <Section id="modulos" eyebrow="Funcionalidades" title="Tudo o que o seu dojo precisa, organizado por área.">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <div role="tablist" aria-label="Áreas do sistema" className="flex flex-col gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              role="tab"
              type="button"
              aria-selected={active === c.id}
              aria-controls="modulo-painel"
              onClick={() => setActive(c.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1121F]",
                active === c.id ? "bg-[#111111] text-white" : "text-[#111111]/70 hover:bg-black/5",
              )}
            >
              <c.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {c.title}
            </button>
          ))}
        </div>
        <div id="modulo-painel" role="tabpanel" className="rounded-2xl border border-black/10 bg-white p-6 md:p-8">
          <h3 className="text-xl font-bold text-[#111111]">{current.title}</h3>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {current.items.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-[#111111]/75">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C1121F]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
