import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { colors, sans } from "../theme";

const modules = [
  { n: "01", t: "Dashboard" },
  { n: "02", t: "Alunos" },
  { n: "03", t: "Financeiro" },
  { n: "04", t: "AMT Pay" },
  { n: "05", t: "Agenda" },
  { n: "06", t: "Planos de aula" },
  { n: "07", t: "Graduações" },
  { n: "08", t: "Ranking" },
  { n: "09", t: "Check-in GPS" },
  { n: "10", t: "Competições" },
  { n: "11", t: "Certificados" },
  { n: "12", t: "Contratos" },
  { n: "13", t: "Equipe" },
  { n: "14", t: "Análise 360°" },
  { n: "15", t: "Loja integrada" },
];

export const SceneWall: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 14], [10, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "140px 160px", justifyContent: "center" }}>
      <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, marginBottom: 40 }}>
        <div
          style={{
            fontFamily: sans,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 6,
            color: colors.ruby,
            textTransform: "uppercase",
          }}
        >
          Um só sistema
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 68,
            fontWeight: 800,
            letterSpacing: -2,
            color: colors.ink,
            lineHeight: 1,
            marginTop: 10,
          }}
        >
          Tudo que sua academia precisa.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 16,
        }}
      >
        {modules.map((m, i) => {
          const start = 12 + i * 3;
          const s = spring({ frame: frame - start, fps, config: { damping: 20, stiffness: 140 } });
          const op = interpolate(s, [0, 1], [0, 1]);
          const y = interpolate(s, [0, 1], [16, 0]);
          return (
            <div
              key={m.n}
              style={{
                padding: "22px 20px",
                borderRadius: 14,
                background: "#fff",
                border: `1px solid ${colors.border}`,
                opacity: op,
                transform: `translateY(${y}px)`,
                boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 4px 12px -4px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 3,
                  color: colors.ruby,
                }}
              >
                {m.n}
              </div>
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 22,
                  fontWeight: 700,
                  color: colors.ink,
                  marginTop: 6,
                  letterSpacing: -0.5,
                }}
              >
                {m.t}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
