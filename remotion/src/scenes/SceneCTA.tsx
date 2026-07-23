import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { colors, sans } from "../theme";

export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 20, stiffness: 90 } });
  const y = interpolate(s, [0, 1], [30, 0]);
  const op = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const barW = interpolate(frame - 20, [0, 30], [0, 340], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const trialOp = interpolate(frame, [30, 48], [0, 1], { extrapolateRight: "clamp" });
  const urlOp = interpolate(frame, [46, 62], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26, transform: `translateY(${y}px)`, opacity: op }}>
        <Img src={staticFile("images/logo.png")} style={{ height: 200, width: "auto" }} />

        <div style={{ height: 2, width: barW, background: colors.ruby, borderRadius: 2, marginTop: 6 }} />

        <div
          style={{
            fontFamily: sans,
            fontSize: 44,
            fontWeight: 800,
            letterSpacing: -1.5,
            color: colors.ink,
            opacity: trialOp,
            textAlign: "center",
          }}
        >
          Comece grátis por <span style={{ color: colors.ruby }}>14 dias</span>.
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "18px 34px",
            borderRadius: 999,
            background: colors.ink,
            color: "#fff",
            fontFamily: sans,
            fontWeight: 600,
            fontSize: 22,
            letterSpacing: 1,
            opacity: urlOp,
            boxShadow: "0 12px 30px -6px rgba(0,0,0,0.25)",
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 999, background: colors.ruby }} />
          dojomanager.amtfightwear.com.br
        </div>
      </div>
    </AbsoluteFill>
  );
};
