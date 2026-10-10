import { useState } from "react";
import { Check, Users, CalendarDays, Award, Megaphone, Wallet, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Section } from "./Section";

type Category = { id: string; icon: LucideIcon; name: string; summary: string; items: string[] };

/** Funcionalidades reais do sistema, agrupadas por categoria. */
const CATEGORIES: Category[] = [
  {
    id: "alunos",
    icon: Users,
    name: "Alunos e equipe",
    summary: "Tudo sobre quem treina e quem ensina, em fichas completas.",
    items: ["Cadastro e perfil do aluno", "Matrículas e planos", "Contratos digitais com assinatura", "Responsável legal para menores", "Professores, escalas e folha de pagamento", "Portal da equipe com permissões"],
  },
  {
    id: "aulas",
    icon: CalendarDays,
    name: "Aulas e frequência",
    summary: "Agenda clara e presença registrada sem lista de papel.",
    items: ["Agenda e turmas com limite de vagas", "Check-in por QR Code e PIN", "Histórico de presença por aluno e turma", "Check-in retroativo", "Integração com Gympass e TotalPass", "Ranking por frequência"],
  },
  {
    id: "ensino",
    icon: Award,
    name: "Graduações e ensino",
    summary: "A evolução de cada aluno documentada do início ao fim.",
    items: ["Modalidades e faixas configuráveis", "Critérios de graduação", "Avaliações técnicas e físicas", "Editor e emissão de certificados", "Competições e resultados", "Biblioteca de vídeos técnicos"],
  },
  {
    id: "comunicacao",
    icon: Megaphone,
    name: "Comunicação e app",
    summary: "Seus alunos informados, com um aplicativo próprio.",
    items: ["App do aluno com carteirinha digital", "Mural de avisos", "Notificações push e e-mail", "Faturas e contratos no app", "Agenda e presença no celular"],
  },
  {
    id: "financeiro",
    icon: Wallet,
    name: "Gestão financeira",
    summary: "Receitas e despesas visíveis, sem surpresa no fim do mês.",
    items: ["Mensalidades recorrentes", "Antecipação de mensalidades", "Contas a pagar e receber", "Fluxo de caixa mensal", "Bloqueio de check-in por inadimplência", "AMT Pay: PIX, cartão e boleto"],
  },
  {
    id: "expansao",
    icon: Store,
    name: "Expansão",
    summary: "Estrutura para crescer além de uma unidade.",
    items: ["Múltiplas unidades", "Loja integrada", "Pedidos personalizados AMT Fight Wear", "Captação de interessados"],
  },
];

export function ModulesShowcase() {
  const [active, setActive] = useState(CATEGORIES[0].id);
  const current = CATEGORIES.find((c) => c.id === active) ?? CATEGORIES[0];

  return (
    <Section
      id="modulos"
      eyebrow="Funcionalidades"
      title="Tudo o que sua academia precisa, organizado."
      description="Escolha uma área para ver os recursos disponíveis."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-10">
        <div role="tablist" aria-label="Categorias de funcionalidades" aria-orientation="vertical" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {CATEGORIES.map((c) => {
            const selected = c.id === active;
            return (
              <button
                key={c.id}
                id={`tab-${c.id}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls="modulos-painel"
                onClick={() => setActive(c.id)}
                className={`flex min-h-12 min-w-0 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1121F] ${
                  selected ? "border-[#C1121F]/30 bg-[#C1121F]/5 text-[#111111]" : "border-black/5 text-[#111111]/65 hover:bg-black/[0.03]"
                }`}
              >
                <c.icon className={`h-5 w-5 shrink-0 ${selected ? "text-[#C1121F]" : "text-[#111111]/40"}`} aria-hidden="true" />
                <span className="min-w-0">{c.name}</span>
              </button>
            );
          })}
        </div>

        <div id="modulos-painel" role="tabpanel" aria-labelledby={`tab-${current.id}`} className="min-w-0 rounded-2xl border border-black/10 bg-white p-6 md:p-10">
          <h3 className="text-2xl font-bold tracking-tight text-[#111111]">{current.name}</h3>
          <p className="mt-2 text-[#111111]/60">{current.summary}</p>
          <ul className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {current.items.map((item) => (
              <li key={item} className="flex min-w-0 items-start gap-3 text-sm text-[#111111]/80 md:text-base">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#C1121F]" aria-hidden="true" />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
