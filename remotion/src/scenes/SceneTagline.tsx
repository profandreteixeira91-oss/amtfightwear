import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { display, sans, colors } from "../theme";

export const SceneTagline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 180 } });
  const s2 = spring({ frame: frame - 20, fps, config: { damping: 200 } });
  const barW = interpolate(s, [0, 1], [0, 640]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-start", padding: "0 160px", fontFamily: sans }}>
      <div style={{ fontSize: 20, letterSpacing: 10, color: colors.ruby, marginBottom: 40, opacity: s, textTransform: "uppercase" }}>
        Um ecossistema · Não mais planilhas
      </div>
      <div
        style={{
          fontFamily: display,
          fontSize: 150,
          lineHeight: 1.02,
          color: colors.ink,
          letterSpacing: -4,
          maxWidth: 1500,
          opacity: s,
          transform: `translateX(${interpolate(s, [0, 1], [-40, 0])}px)`,
        }}
      >
        Tudo que sua academia<br />
        precisa em <span style={{ fontStyle: "italic", color: colors.ruby }}>um só lugar</span>.
      </div>
      <div style={{ height: 4, width: barW, background: colors.ruby, marginTop: 60, boxShadow: `0 0 40px ${colors.rubyGlow}` }} />
      <div style={{ marginTop: 30, fontSize: 24, color: colors.inkDim, letterSpacing: 2, opacity: s2, fontWeight: 300 }}>
        14 módulos · 1 plataforma · Zero fricção
      </div>
    </AbsoluteFill>
  );
};
