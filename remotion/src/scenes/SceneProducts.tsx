import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { BRAND } from "../brand";
import { Backdrop, Body, Eyebrow, Frame, Headline, Red, useUnit } from "../kit";

const items = [
  { img: "customshop-kimono.jpg", label: "Kimonos" },
  { img: "customshop-faixa.jpg", label: "Faixas" },
  { img: "customshop-rashguard.jpg", label: "Rashguards" },
];

const Card: React.FC<{ img: string; label: string; delay: number }> = ({ img, label, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useUnit();
  const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 160 } });
  const drift = Math.sin((frame + delay * 3) / 26) * u * 0.5;
  return (
    <div
      style={{
        flex: 1,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [u * 5, 0]) + drift}px)`,
        border: `${u * 0.2}px solid rgba(247,242,240,0.14)`,
        background: BRAND.bgSoft,
        overflow: "hidden",
      }}
    >
      <div style={{ height: "76%", overflow: "hidden" }}>
        <Img src={staticFile(`images/${img}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div
        style={{
          height: "24%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--body)",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: u * 0.24,
          fontSize: u * 1.9,
          color: BRAND.cream,
          borderTop: `${u * 0.2}px solid ${BRAND.red}`,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const SceneProducts: React.FC = () => {
  const { u, portrait } = useUnit();
  return (
    <AbsoluteFill>
      <Backdrop />
      <Frame>
        <Eyebrow delay={2}>Linha completa</Eyebrow>
        <Headline delay={8} size={portrait ? 7.4 : 6.4}>
          Tudo que o seu <Red>tatame</Red> precisa
        </Headline>
        <div
          style={{
            display: "flex",
            gap: u * 2,
            width: "100%",
            height: portrait ? u * 46 : u * 40,
            marginTop: u * 1.5,
          }}
        >
          {items.map((it, i) => (
            <Card key={it.label} img={it.img} label={it.label} delay={18 + i * 7} />
          ))}
        </div>
        <Body delay={46} size={2.3}>
          Bordado com o logo da sua academia, numeração do infantil ao A5 e tecido testado no treino
          pesado.
        </Body>
      </Frame>
    </AbsoluteFill>
  );
};
