import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { display, sans, colors } from "../theme";

export const SceneHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({ frame, fps, config: { damping: 200 } });
  const line = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const sub = spring({ frame: frame - 25, fps, config: { damping: 200 } });
  const drift = interpolate(frame, [0, 90], [0, -18]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: sans }}>
      <div style={{ textAlign: "center", transform: `translateY(${drift}px)` }}>
        <div
          style={{
            fontSize: 22,
            letterSpacing: 14,
            color: colors.ruby,
            fontWeight: 500,
            opacity: reveal,
            marginBottom: 40,
            textTransform: "uppercase",
          }}
        >
          A M T · D O J O · M A N A G E R
        </div>
        <div
          style={{
            fontFamily: display,
            fontSize: 200,
            lineHeight: 0.95,
            color: colors.ink,
            letterSpacing: -6,
            opacity: line,
            transform: `translateY(${interpolate(line, [0, 1], [40, 0])}px)`,
          }}
        >
          O <span style={{ fontStyle: "italic", color: colors.ruby }}>dojo</span>
        </div>
        <div
          style={{
            fontFamily: display,
            fontSize: 200,
            lineHeight: 0.95,
            color: colors.ink,
            letterSpacing: -6,
            opacity: line,
            transform: `translateY(${interpolate(line, [0, 1], [60, 0])}px)`,
          }}
        >
          reimaginado.
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 26,
            color: colors.inkDim,
            letterSpacing: 6,
            fontWeight: 300,
            opacity: sub,
            textTransform: "uppercase",
          }}
        >
          Gestão · Ensino · Financeiro · Comunidade
        </div>
      </div>
    </AbsoluteFill>
  );
};
