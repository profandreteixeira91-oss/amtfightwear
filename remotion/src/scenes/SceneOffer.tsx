import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { BRAND, COPY } from "../brand";
import { Backdrop, Body, Eyebrow, Frame, Headline, Red, Rise, useUnit } from "../kit";

const OfferBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useUnit();
  const s = spring({ frame: frame - 16, fps, config: { damping: 12, stiffness: 170 } });
  const scale = interpolate(s, [0, 1], [0.72, 1]);
  const pulse = 1 + Math.sin(frame / 9) * 0.012;
  return (
    <div
      style={{
        transform: `scale(${scale * pulse}) rotate(-2deg)`,
        opacity: s,
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        padding: `${u * 2.4}px ${u * 4.4}px`,
        background: `linear-gradient(140deg, ${BRAND.red} 0%, #8E1616 100%)`,
        border: `${u * 0.3}px solid rgba(247,242,240,0.35)`,
        boxShadow: `0 ${u * 2}px ${u * 5}px rgba(220,38,38,0.35)`,
      }}
    >
      <span
        style={{
          fontFamily: "var(--display)",
          fontSize: u * 14,
          lineHeight: 0.9,
          color: BRAND.cream,
        }}
      >
        -{COPY.discount}
      </span>
      <span
        style={{
          fontFamily: "var(--body)",
          fontWeight: 800,
          fontSize: u * 2,
          letterSpacing: u * 0.28,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.9)",
        }}
      >
        no atacado
      </span>
    </div>
  );
};

export const SceneOffer: React.FC = () => {
  const { portrait } = useUnit();
  return (
    <AbsoluteFill>
      <Backdrop image="customshop-kimono.jpg" />
      <Frame align="center">
        <Eyebrow delay={2}>Oferta para donos de academia</Eyebrow>
        <OfferBadge />
        <Headline delay={30} size={portrait ? 6.4 : 5.8}>
          A partir de <Red>{COPY.minQty}</Red>
        </Headline>
        <Body delay={40} size={2.5}>
          Monte o pedido da sua academia em minutos e veja o desconto aplicado na hora, item por
          item.
        </Body>
      </Frame>
    </AbsoluteFill>
  );
};
