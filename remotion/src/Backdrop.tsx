import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { colors } from "./theme";

/**
 * Subtle animated grid + soft radial glow. White bg (matches landing).
 */
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const drift = interpolate(frame, [0, durationInFrames], [0, 40]);
  return (
    <AbsoluteFill style={{ background: colors.bg, overflow: "hidden" }}>
      {/* very subtle grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.035) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          transform: `translate(${-drift}px, ${-drift * 0.3}px)`,
        }}
      />
      {/* soft ruby glow lower-right */}
      <div
        style={{
          position: "absolute",
          right: -300,
          bottom: -300,
          width: 900,
          height: 900,
          borderRadius: 9999,
          background:
            "radial-gradient(circle at center, rgba(220,38,38,0.10), rgba(220,38,38,0) 60%)",
          filter: "blur(20px)",
        }}
      />
      {/* soft neutral glow upper-left */}
      <div
        style={{
          position: "absolute",
          left: -200,
          top: -200,
          width: 700,
          height: 700,
          borderRadius: 9999,
          background:
            "radial-gradient(circle at center, rgba(10,10,10,0.045), rgba(0,0,0,0) 60%)",
          filter: "blur(20px)",
        }}
      />
    </AbsoluteFill>
  );
};
