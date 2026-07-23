import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, Sequence } from "remotion";
import { display, sans, colors } from "../theme";

type Module = { num: string; title: string; sub: string; kicker: string };

const ModuleCard: React.FC<{ mod: Module; delay: number; align: "left" | "right" }> = ({ mod, delay, align }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inS = spring({ frame: frame - delay, fps, config: { damping: 180 } });
  const outS = spring({ frame: frame - (delay + 55), fps, config: { damping: 180 } });
  const op = interpolate(inS, [0, 1], [0, 1]) * (1 - outS);
  const tx = interpolate(inS, [0, 1], [align === "left" ? -60 : 60, 0]);

  return (
    <div
      style={{
        opacity: op,
        transform: `translateX(${tx}px)`,
        fontFamily: sans,
        display: "flex",
        alignItems: "baseline",
        gap: 32,
        borderLeft: `3px solid ${colors.ruby}`,
        paddingLeft: 32,
      }}
    >
      <div style={{ fontFamily: display, fontSize: 90, color: colors.ruby, lineHeight: 1, minWidth: 130 }}>
        {mod.num}
      </div>
      <div>
        <div style={{ fontSize: 18, letterSpacing: 6, color: colors.inkDim, textTransform: "uppercase", marginBottom: 12 }}>
          {mod.kicker}
        </div>
        <div style={{ fontFamily: display, fontSize: 92, color: colors.ink, lineHeight: 1, letterSpacing: -2 }}>
          {mod.title}
        </div>
        <div style={{ fontSize: 26, color: colors.inkDim, marginTop: 16, fontWeight: 300, maxWidth: 700 }}>
          {mod.sub}
        </div>
      </div>
    </div>
  );
};

export const SceneModules: React.FC<{ modules: Module[]; label: string }> = ({ modules, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const labelS = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ padding: "120px 160px", justifyContent: "center", fontFamily: sans }}>
      <div style={{ position: "absolute", top: 100, left: 160, opacity: labelS }}>
        <div style={{ fontSize: 18, color: colors.ruby, letterSpacing: 8, textTransform: "uppercase" }}>{label}</div>
        <div style={{ height: 2, width: 180, background: colors.ruby, marginTop: 16, opacity: 0.5 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 56, marginTop: 40 }}>
        {modules.map((m, i) => (
          <ModuleCard key={i} mod={m} delay={i * 15} align={i % 2 === 0 ? "left" : "right"} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
