import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { display, sans, colors } from "../theme";

const stats = [
  { n: "14", l: "Módulos integrados" },
  { n: "100%", l: "White-label" },
  { n: "2%", l: "Taxa AMT Pay" },
  { n: "24/7", l: "PWA para alunos" },
];

export const SceneStats: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ padding: 160, justifyContent: "center", fontFamily: sans }}>
      <div style={{ fontSize: 20, letterSpacing: 10, color: colors.ruby, textTransform: "uppercase", opacity: s }}>
        Feito para quem lidera
      </div>
      <div
        style={{
          fontFamily: display,
          fontSize: 130,
          color: colors.ink,
          letterSpacing: -3,
          lineHeight: 1.02,
          marginTop: 40,
          opacity: s,
          transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)`,
        }}
      >
        Da matrícula ao <span style={{ fontStyle: "italic", color: colors.ruby }}>dan preto</span>.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 48, marginTop: 90 }}>
        {stats.map((st, i) => {
          const si = spring({ frame: frame - 20 - i * 8, fps, config: { damping: 180 } });
          return (
            <div key={i} style={{ opacity: si, transform: `translateY(${interpolate(si, [0, 1], [30, 0])}px)` }}>
              <div style={{ fontFamily: display, fontSize: 96, color: colors.ruby, lineHeight: 1 }}>{st.n}</div>
              <div style={{ height: 2, width: 60, background: colors.ink, opacity: 0.4, margin: "18px 0" }} />
              <div style={{ fontSize: 22, color: colors.inkDim, letterSpacing: 1 }}>{st.l}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
