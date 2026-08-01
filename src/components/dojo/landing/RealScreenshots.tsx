import { Section, FadeIn } from "./Section";
import { ShotFrame } from "./ShotFrame";

const SHOTS: { title: string; desc: string; src: string }[] = [
  { title: "Painel principal", desc: "Visão geral do dojo com KPIs, alunos recentes e resumo financeiro.", src: "/dojo-shots/dashboard.png" },
  { title: "Gestão de alunos", desc: "Cadastro, filtros e histórico completo por atleta.", src: "/dojo-shots/students.png" },
  { title: "Financeiro", desc: "Mensalidades, recebimentos e fluxo de caixa em um só lugar.", src: "/dojo-shots/finance.png" },
  { title: "Agenda de aulas", desc: "Calendário semanal com turmas, professores e presenças.", src: "/dojo-shots/schedule.png" },
  { title: "Graduações", desc: "Controle de faixas, requisitos e emissão de certificados.", src: "/dojo-shots/graduations.png" },
  { title: "Check-in", desc: "Modo kiosk e validação por localização.", src: "/dojo-shots/checkin.png" },
  { title: "Competições", desc: "Biblioteca centralizada, inscrições e logística da equipe.", src: "/dojo-shots/competitions.png" },
  { title: "Avaliações", desc: "Templates, sessões e histórico de desempenho do aluno.", src: "/dojo-shots/evaluations.png" },
  { title: "Quadro de avisos", desc: "Comunicação segmentada por turma, graduação ou aluno.", src: "/dojo-shots/announcements.png" },
  { title: "AMT Store integrada", desc: "Compra de produtos oficiais direto pelo painel da academia.", src: "/dojo-shots/store.png" },
];

export function RealScreenshots() {
  return (
    <Section
      id="prints"
      eyebrow="Sistema real"
      title="Prints reais do AMT Dojo Manager."
      description="Sem mockups fictícios: veja as telas exatamente como o instrutor utiliza no dia a dia."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {SHOTS.map((s, i) => (
          <FadeIn key={s.title} delay={i * 0.04}>
            <div className="group min-w-0 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition-all hover:shadow-xl">
              <ShotFrame
                src={s.src}
                alt={`Print real da tela ${s.title} do AMT Dojo Manager`}
              />
              <div className="min-w-0 border-t border-black/5 p-5">
                <h3 className="break-words text-base font-semibold text-[#111111]">{s.title}</h3>
                <p className="mt-1 break-words text-sm text-[#111111]/60">{s.desc}</p>
              </div>
            </div>

          </FadeIn>
        ))}
      </div>
    </Section>
  );
}
