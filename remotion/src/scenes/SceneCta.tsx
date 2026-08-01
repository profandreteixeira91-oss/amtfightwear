import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BRAND, COPY } from "../brand";
import { Backdrop, Frame, Headline, Red, Rise, useUnit } from "../kit";

const Cta: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useUnit();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 180 } });
  const pulse = 1 + Math.sin(frame / 8) * 0.015;
  return (
    <div
      style={{
        opacity: s,
        transform: `scale(${interpolate(s, [0, 1], [0.86, 1]) * pulse})`,
        display: "inline-flex",
        alignItems: "center",
        gap: u * 1.6,
        padding: `${u * 2.2}px ${u * 4.6}px`,
        background: BRAND.red,
        fontFamily: "var(--body)",
        fontWeight: 900,
        textTransform: "uppercase",
        letterSpacing: u * 0.26,
        fontSize: u * 2.5,
        color: "#fff",
        boxShadow: `0 ${u * 1.6}px ${u * 4.5}px rgba(220,38,38,0.45)`,
      }}
    >
      Pedir orçamento de atacado
    </div>
  );
};

export const SceneCta: React.FC = () => {
  const { u, portrait } = useUnit();
  return (
    <AbsoluteFill>
      <Backdrop image="loja-hero-banner.jpg" />
      <Frame align="center">
        <Rise delay={2}>
          <Img
            src={staticFile("images/amt-fightwear-logo-white.jpg")}
            style={{ height: u * 7, objectFit: "contain", borderRadius: u * 0.6 }}
          />

        </Rise>
        <Headline delay={10} size={portrait ? 6.6 : 6.6}>
          Peça hoje, <Red>-{COPY.discount}</Red> no pedido da sua academia
        </Headline>
        <Cta delay={22} />
        <Rise delay={34}>
          <div
            style={{
              display: "flex",
              flexDirection: portrait ? "column" : "row",
              alignItems: "center",
              gap: portrait ? u * 1 : u * 3,
              fontFamily: "var(--body)",
              fontWeight: 700,
              fontSize: u * 2.3,
              color: BRAND.cream,
              marginTop: u * 1.2,
            }}
          >
            <span>{COPY.site}/loja/atacado</span>
            <span style={{ color: BRAND.muted }}>WhatsApp {COPY.whats}</span>
          </div>
        </Rise>
      </Frame>
    </AbsoluteFill>
  );
};
