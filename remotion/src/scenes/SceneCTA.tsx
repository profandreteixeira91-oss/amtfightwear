import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { display, sans, colors } from "../theme";

export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  const s2 = spring({ frame: frame - 15, fps, config: { damping: 200 } });
  const s3 = spring({ frame: frame - 35, fps, config: { damping: 200 } });
  const pulse = 1 + Math.sin(frame / 6) * 0.015;
  const glow = interpolate(Math.sin(frame / 8), [-1, 1], [30, 70]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: sans, textAlign: "center" }}>
      <div style={{ fontSize: 22, letterSpacing: 12, color: colors.ruby, textTransform: "uppercase", opacity: s }}>
        Comece hoje · 14 dias grátis
      </div>
      <div
        style={{
          fontFamily: display,
          fontSize: 240,
          lineHeight: 0.92,
          color: colors.ink,
          letterSpacing: -8,
          marginTop: 36,
          opacity: s2,
          transform: `translateY(${interpolate(s2, [0, 1], [50, 0])}px) scale(${pulse})`,
        }}
      >
        Seu dojo,
      </div>
      <div
        style={{
          fontFamily: display,
          fontStyle: "italic",
          fontSize: 240,
          lineHeight: 0.92,
          color: colors.ruby,
          letterSpacing: -8,
          opacity: s2,
          textShadow: `0 0 ${glow}px rgba(225,29,42,0.6)`,
          transform: `translateY(${interpolate(s2, [0, 1], [60, 0])}px)`,
        }}
      >
        outro nível.
      </div>

      <div
        style={{
          marginTop: 70,
          padding: "28px 72px",
          background: colors.ruby,
          color: "#fff",
          fontSize: 32,
          letterSpacing: 6,
          textTransform: "uppercase",
          fontWeight: 700,
          borderRadius: 4,
          opacity: s3,
          transform: `translateY(${interpolate(s3, [0, 1], [30, 0])}px) scale(${1 + Math.sin(frame / 10) * 0.02})`,
          boxShadow: `0 0 ${glow * 1.5}px rgba(225,29,42,0.7), 0 20px 40px rgba(0,0,0,0.4)`,
        }}
      >
        dojomanager.amtfightwear.com.br
      </div>
      <div style={{ marginTop: 32, fontSize: 22, color: colors.inkDim, letterSpacing: 2, opacity: s3 }}>
        R$ 99,90/mês · Sem fidelidade · Sem taxa de setup
      </div>
    </AbsoluteFill>
  );
};
