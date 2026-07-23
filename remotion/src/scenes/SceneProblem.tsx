import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { colors, sans } from "../theme";

const pains = [
  "Planilhas espalhadas e cobranças manuais",
  "Alunos sem controle de frequência e graduação",
  "Certificados feitos no editor de imagem",
  "Financeiro sem visibilidade real",
];

const solutions = [
  "Cobrança recorrente automática · PIX, cartão e boleto",
  "Check-in, ranking e graduações num só fluxo",
  "Editor de certificados branded, A4, PDF fiel",
  "Dashboard com MRR, inadimplência e projeções",
];

const Column: React.FC<{
  side: "left" | "right";
  eyebrow: string;
  title: string;
  items: string[];
  accent: string;
  startFrame: number;
}> = ({ side, eyebrow, title, items, accent, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const inSp = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 22, stiffness: 90 },
  });
  const x = interpolate(inSp, [0, 1], [side === "left" ? -60 : 60, 0]);
  const op = interpolate(frame, [startFrame, startFrame + 18], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        flex: 1,
        transform: `translateX(${x}px)`,
        opacity: op,
        padding: "56px 64px",
        borderLeft: side === "right" ? `1px solid ${colors.border}` : "none",
      }}
    >
      <div
        style={{
          fontFamily: sans,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 6,
          textTransform: "uppercase",
          color: accent,
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <span
          style={{
            width: 34,
            height: 2,
            background: accent,
            display: "inline-block",
          }}
        />
        {eyebrow}
      </div>

      <div
        style={{
          fontFamily: sans,
          fontSize: 56,
          fontWeight: 800,
          lineHeight: 1.02,
          color: colors.ink,
          letterSpacing: -1.5,
          marginBottom: 36,
        }}
      >
        {title}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {items.map((it, i) => {
          const rowFrame = startFrame + 12 + i * 8;
          const rowOp = interpolate(frame, [rowFrame, rowFrame + 14], [0, 1], {
            extrapolateRight: "clamp",
          });
          const rowY = interpolate(frame, [rowFrame, rowFrame + 14], [10, 0], {
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                opacity: rowOp,
                transform: `translateY(${rowY}px)`,
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                fontFamily: sans,
                fontSize: 20,
                fontWeight: 500,
                color: colors.ink2,
                lineHeight: 1.35,
              }}
            >
              <span
                style={{
                  marginTop: 10,
                  width: 8,
                  height: 8,
                  borderRadius: side === "left" ? 2 : 999,
                  background: accent,
                  flexShrink: 0,
                }}
              />
              <span>{it}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const SceneProblem: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOp = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const headerY = interpolate(frame, [0, 18], [12, 0], { extrapolateRight: "clamp" });

  const pitchOp = interpolate(frame, [130, 150], [0, 1], { extrapolateRight: "clamp" });
  const pitchY = interpolate(frame, [130, 150], [10, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <AbsoluteFill
        style={{
          padding: "150px 90px 90px",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <div
          style={{
            opacity: headerOp,
            transform: `translateY(${headerY}px)`,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              fontFamily: sans,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: colors.inkDim,
            }}
          >
            O problema · A solução
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 34,
              fontWeight: 700,
              color: colors.ink,
              letterSpacing: -0.5,
              maxWidth: 1400,
              lineHeight: 1.15,
            }}
          >
            Gerir um dojo é uma arte — a burocracia não deveria roubar seu tatame.
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            background: colors.surface,
            overflow: "hidden",
            boxShadow: "0 30px 80px rgba(0,0,0,0.06)",
          }}
        >
          <Column
            side="left"
            eyebrow="A dor"
            title="Hoje"
            items={pains}
            accent={colors.inkDim}
            startFrame={22}
          />
          <Column
            side="right"
            eyebrow="A solução"
            title="Com Dojo Manager"
            items={solutions}
            accent={colors.ruby}
            startFrame={58}
          />
        </div>

        <div
          style={{
            opacity: pitchOp,
            transform: `translateY(${pitchY}px)`,
            fontFamily: sans,
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: colors.ink2,
            textAlign: "center",
          }}
        >
          Uma plataforma completa · Financeiro, alunos, graduações e presença — integrados.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
