import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Backdrop } from "./Backdrop";
import { SceneHero } from "./scenes/SceneHero";
import { SceneProblem } from "./scenes/SceneProblem";
import { SceneSpotlight, Spotlight } from "./scenes/SceneSpotlight";
import { SceneWall } from "./scenes/SceneWall";
import { SceneCTA } from "./scenes/SceneCTA";
import { colors, sans } from "./theme";

const spotlights: Spotlight[] = [
  {
    index: "01",
    eyebrow: "Comando central",
    title: "Dashboard",
    description:
      "MRR, alunos ativos, próximas cobranças e frequência — a saúde do seu dojo em tempo real.",
    bullets: ["KPIs financeiros ao vivo", "Alertas de inadimplência", "Gráficos de evolução"],
    screenshot: "screens/dashboard.png",
  },
  {
    index: "02",
    eyebrow: "Ficha completa",
    title: "Alunos",
    description:
      "Múltiplas modalidades por aluno, contratos, anamnese, documentos e histórico financeiro num só lugar.",
    bullets: ["Cadastro 360°", "Contratos com assinatura", "Impressão A4 branded"],
    screenshot: "screens/students.png",
  },
  {
    index: "03",
    eyebrow: "Motor financeiro",
    title: "Financeiro",
    description:
      "Cobranças recorrentes, PIX, cartão e boletos. Relatórios PDF e CSV com 8 tipos de análise.",
    bullets: ["AMT Pay · split 2%", "Fluxo, DRE e inadimplência", "Exportação PDF & CSV"],
    screenshot: "screens/finance.png",
  },
  {
    index: "04",
    eyebrow: "Agenda visual",
    title: "Turmas & Escala",
    description:
      "Grade estilo Google Calendar com escala automática de professores e planos de aula integrados.",
    bullets: ["Escala da equipe", "Planos de aula reutilizáveis", "Substituições em 1 clique"],
    screenshot: "screens/schedule.png",
  },
  {
    index: "05",
    eyebrow: "Do branco ao preto",
    title: "Graduações",
    description:
      "Faixas globais para Jiu-Jitsu, Judô e Muay Thai. Critérios de tempo, aulas e mérito automáticos.",
    bullets: ["Editor visual de faixas", "Certificados vinculados", "Histórico por atleta"],
    screenshot: "screens/graduations.png",
  },
  {
    index: "06",
    eyebrow: "Presença certa",
    title: "Check-in & Ranking",
    description:
      "Check-in geolocalizado via PWA e pódio automático por presença e desempenho da turma.",
    bullets: ["Geolocalização GPS", "PWA no celular do aluno", "Pódio ouro · prata · bronze"],
    screenshot: "screens/ranking.png",
  },
  {
    index: "07",
    eyebrow: "Editor Canva-like",
    title: "Certificados",
    description:
      "Editor visual com 10 presets prontos, variáveis dinâmicas e exportação fiel em PDF A4.",
    bullets: ["Studio arrasta-e-solta", "Variáveis por aluno", "Impressão A4 fiel"],
    screenshot: "screens/belts.png",
  },
  {
    index: "08",
    eyebrow: "Aluno no bolso",
    title: "PWA do Aluno",
    description:
      "Portal instalável com carteirinha digital, agenda, avisos, check-in e histórico de graduações.",
    bullets: ["Instalável no celular", "Avisos push", "Carteirinha digital"],
    screenshot: "screens/checkin.png",
  },
];

const PersistentNav: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const op = interpolate(
    frame,
    [30, 60, durationInFrames - 40, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <div
      style={{
        position: "absolute",
        top: 44,
        left: 60,
        right: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 20,
        opacity: op,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Img src={staticFile("images/logo.png")} style={{ height: 44, width: "auto" }} />
      </div>
      <div
        style={{
          fontFamily: sans,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 6,
          color: colors.inkDim,
          textTransform: "uppercase",
        }}
      >
        <span style={{ color: colors.ruby }}>●</span> Gestão · Disciplina · Evolução
      </div>
    </div>
  );
};

export const MainVideo: React.FC = () => {
  // 30fps composition
  // Hero 135 + Problem 165 + 8 x 130 spotlights (1040) + Wall 130 + CTA 110 = 1580
  // Transitions overlap ~14 frames each (10 transitions) => ~1440 frames ≈ 48s
  const spotlightDuration = 130;
  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <Backdrop />
      <PersistentNav />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={135}>
          <SceneHero />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 14 })}
        />

        <TransitionSeries.Sequence durationInFrames={165}>
          <SceneProblem />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 14 })}
        />

        {spotlights.map((s, i) => (
          <React.Fragment key={s.index}>
            <TransitionSeries.Sequence durationInFrames={spotlightDuration}>
              <SceneSpotlight data={s} />
            </TransitionSeries.Sequence>
            {i < spotlights.length - 1 && (
              <TransitionSeries.Transition
                presentation={slide({ direction: "from-right" })}
                timing={springTiming({ config: { damping: 200 }, durationInFrames: 14 })}
              />
            )}
          </React.Fragment>
        ))}

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 16 })}
        />
        <TransitionSeries.Sequence durationInFrames={130}>
          <SceneWall />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 14 })}
        />
        <TransitionSeries.Sequence durationInFrames={110}>
          <SceneCTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
