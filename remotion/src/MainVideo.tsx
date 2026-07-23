import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { Backdrop } from "./Backdrop";
import { SceneHero } from "./scenes/SceneHero";
import { SceneTagline } from "./scenes/SceneTagline";
import { SceneModules } from "./scenes/SceneModules";
import { SceneStats } from "./scenes/SceneStats";
import { SceneCTA } from "./scenes/SceneCTA";
import { colors, sans } from "./theme";

const group1 = [
  { num: "01", kicker: "Comando central", title: "Dashboard", sub: "MRR, KPIs e alunos ativos em tempo real." },
  { num: "02", kicker: "Cadastro completo", title: "Alunos", sub: "Múltiplas modalidades, graduações e documentos." },
  { num: "03", kicker: "Motor financeiro", title: "AMT Pay", sub: "Split automático, carteira e saques. Taxa 2%." },
];
const group2 = [
  { num: "04", kicker: "Agenda visual", title: "Turmas & Escala", sub: "Google Calendar com professores e planos de aula." },
  { num: "05", kicker: "Do branco ao preto", title: "Graduações", sub: "Faixas globais, critérios de tempo, aulas e mérito." },
  { num: "06", kicker: "Presença certa", title: "Check-in GPS", sub: "Geolocalizado via PWA. Ranking automático." },
];
const group3 = [
  { num: "07", kicker: "Editor Canva-like", title: "Certificados", sub: "10 presets, variáveis dinâmicas, PDF fiel A4." },
  { num: "08", kicker: "Editor premium", title: "Contratos", sub: "19 cláusulas, LGPD, cabeçalho e rodapé por página." },
  { num: "09", kicker: "Radar do atleta", title: "Análise 360°", sub: "Score, metas e fundamentos técnicos por modalidade." },
  { num: "10", kicker: "Loja integrada", title: "AMT Store", sub: "Atacado automático + Melhor Envio no seu dojo." },
];

const SectionLabel: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 8, 40, 48], [0, 1, 1, 0]);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        right: 160,
        fontFamily: sans,
        fontSize: 16,
        letterSpacing: 6,
        color: colors.inkDim,
        textTransform: "uppercase",
        opacity: op,
      }}
    >
      {text}
    </div>
  );
};

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <Backdrop />

      {/* persistent brand mark */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 160,
          fontFamily: sans,
          fontSize: 14,
          letterSpacing: 8,
          color: colors.inkDim,
          textTransform: "uppercase",
          zIndex: 10,
        }}
      >
        <span style={{ color: colors.ruby }}>●</span> AMT · DOJO MANAGER
      </div>
      <div
        style={{
          position: "absolute",
          top: 60,
          right: 160,
          fontFamily: sans,
          fontSize: 14,
          letterSpacing: 8,
          color: colors.inkDim,
          textTransform: "uppercase",
          zIndex: 10,
        }}
      >
        MMXXVI
      </div>

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={100}>
          <SceneHero />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={100}>
          <SceneTagline />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={165}>
          <SceneModules modules={group1} label="I · Gestão" />
          <SectionLabel text="Módulos 01 — 03" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={165}>
          <SceneModules modules={group2} label="II · Ensino" />
          <SectionLabel text="Módulos 04 — 06" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={190}>
          <SceneModules modules={group3} label="III · Excelência" />
          <SectionLabel text="Módulos 07 — 10" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={110}>
          <SceneStats />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={150}>
          <SceneCTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
