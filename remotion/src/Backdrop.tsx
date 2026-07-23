import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { colors } from "./theme";

// Animated ruby noir backdrop with subtle grain + drifting glow
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;
  const x = interpolate(t, [0, 1], [-10, 10]);
  const y = interpolate(t, [0, 1], [5, -5]);
  return (
    <AbsoluteFill style={{ background: colors.bg, overflow: "hidden" }}>
      {/* radial ruby glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(60% 55% at ${50 + x}% ${45 + y}%, rgba(225,29,42,0.35), rgba(122,10,18,0.15) 45%, rgba(10,3,4,0) 70%)`,
        }}
      />
      {/* vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.85) 100%)`,
        }}
      />
      {/* subtle grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(245,233,234,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(245,233,234,0.035) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(90% 70% at 50% 50%, black 40%, transparent 85%)",
        }}
      />
    </AbsoluteFill>
  );
};
