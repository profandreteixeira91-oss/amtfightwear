import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { colors, sans } from "../theme";

export const SceneHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({ frame, fps, config: { damping: 18, stiffness: 90, mass: 1 } });
  const logoY = interpolate(logoIn, [0, 1], [30, 0]);
  const logoOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  const lineWidth = interpolate(frame - 22, [0, 24], [0, 460], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const taglineOp = interpolate(frame, [42, 58], [0, 1], { extrapolateRight: "clamp" });
  const taglineY = interpolate(frame, [42, 58], [12, 0], { extrapolateRight: "clamp" });

  const subOp = interpolate(frame, [60, 78], [0, 1], { extrapolateRight: "clamp" });

  const outOp = interpolate(frame, [110, 130], [1, 1]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: outOp }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
        <div
          style={{
            transform: `translateY(${logoY}px)`,
            opacity: logoOp,
            filter: "drop-shadow(0 6px 24px rgba(0,0,0,0.08))",
          }}
        >
          <Img src={staticFile("images/logo.png")} style={{ height: 260, width: "auto" }} />
        </div>

        <div style={{ height: 2, width: lineWidth, background: colors.ruby, borderRadius: 2 }} />

        <div
          style={{
            transform: `translateY(${taglineY}px)`,
            opacity: taglineOp,
            fontFamily: sans,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: 6,
            color: colors.ink2,
            textTransform: "uppercase",
          }}
        >
          Software de gestão · Artes marciais
        </div>

        <div
          style={{
            opacity: subOp,
            fontFamily: sans,
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: 4,
            color: colors.inkDim,
            textTransform: "uppercase",
            marginTop: 4,
          }}
        >
          Um sistema · doze módulos · zero planilha
        </div>
      </div>
    </AbsoluteFill>
  );
};
