import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { colors, sans } from "../theme";

export type Spotlight = {
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  screenshot: string; // path under public/
};

export const SceneSpotlight: React.FC<{ data: Spotlight }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 22, stiffness: 110 } });
  const textX = interpolate(enter, [0, 1], [-40, 0]);
  const shotX = interpolate(enter, [0, 1], [80, 0]);
  const shotScale = interpolate(enter, [0, 1], [0.94, 1]);

  const eyebrowOp = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const titleOp = interpolate(frame, [8, 22], [0, 1], { extrapolateRight: "clamp" });
  const descOp = interpolate(frame, [18, 32], [0, 1], { extrapolateRight: "clamp" });

  const outOp = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 1]);

  const barWidth = interpolate(frame - 10, [0, 26], [0, 80], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: outOp, padding: "120px 140px", display: "flex" }}>
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", gap: 90 }}>
        {/* LEFT — copy */}
        <div style={{ flex: "0 0 640px", transform: `translateX(${textX}px)` }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontFamily: sans,
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: 5,
              color: colors.ruby,
              textTransform: "uppercase",
              opacity: eyebrowOp,
            }}
          >
            <span style={{ color: colors.ink, fontVariantNumeric: "tabular-nums" }}>{data.index}</span>
            <div style={{ height: 2, width: barWidth, background: colors.ruby }} />
            <span>{data.eyebrow}</span>
          </div>

          <h1
            style={{
              fontFamily: sans,
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1,
              color: colors.ink,
              margin: "26px 0 22px",
              opacity: titleOp,
            }}
          >
            {data.title}
          </h1>

          <p
            style={{
              fontFamily: sans,
              fontSize: 24,
              fontWeight: 400,
              lineHeight: 1.45,
              color: colors.ink2,
              margin: 0,
              opacity: descOp,
              maxWidth: 620,
            }}
          >
            {data.description}
          </p>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "34px 0 0",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {data.bullets.map((b, i) => {
              const op = interpolate(frame, [28 + i * 6, 42 + i * 6], [0, 1], { extrapolateRight: "clamp" });
              const tx = interpolate(frame, [28 + i * 6, 42 + i * 6], [-10, 0], { extrapolateRight: "clamp" });
              return (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    fontFamily: sans,
                    fontSize: 20,
                    fontWeight: 500,
                    color: colors.ink,
                    opacity: op,
                    transform: `translateX(${tx}px)`,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: colors.ruby,
                      flex: "0 0 auto",
                    }}
                  />
                  {b}
                </li>
              );
            })}
          </ul>
        </div>

        {/* RIGHT — device frame with screenshot */}
        <div
          style={{
            flex: 1,
            transform: `translateX(${shotX}px) scale(${shotScale})`,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 900,
              borderRadius: 22,
              background: "#fff",
              border: `1px solid ${colors.border}`,
              boxShadow:
                "0 30px 80px -20px rgba(0,0,0,0.25), 0 12px 24px -12px rgba(0,0,0,0.12)",
              overflow: "hidden",
            }}
          >
            {/* window chrome */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 16px",
                borderBottom: `1px solid ${colors.border}`,
                background: colors.surface2,
              }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 999, background: "#ff5f57" }} />
              <span style={{ width: 12, height: 12, borderRadius: 999, background: "#febc2e" }} />
              <span style={{ width: 12, height: 12, borderRadius: 999, background: "#28c840" }} />
              <div
                style={{
                  marginLeft: 14,
                  fontFamily: sans,
                  fontSize: 12,
                  fontWeight: 500,
                  color: colors.inkDim,
                  letterSpacing: 1,
                }}
              >
                dojomanager.amtfightwear.com.br/{data.eyebrow.toLowerCase().replace(/\s.*/, "")}
              </div>
            </div>
            <Img
              src={staticFile(data.screenshot)}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
