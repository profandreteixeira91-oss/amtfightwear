import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BRAND } from "../brand";
import { Backdrop, Body, Eyebrow, Frame, Headline, Red, useUnit } from "../kit";

const proofs = [
  { k: "Fabricação própria", v: "Sem intermediário no preço" },
  { k: "Bordado da academia", v: "Identidade do seu dojo" },
  { k: "Envio para todo o Brasil", v: "Frete calculado na hora" },
  { k: "Parcelamento em 10x", v: "Pedidos acima de R$ 1.000" },
];

const Row: React.FC<{ k: string; v: string; delay: number }> = ({ k, v, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useUnit();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        opacity: s,
        transform: `translateX(${interpolate(s, [0, 1], [-u * 4, 0])}px)`,
        display: "flex",
        alignItems: "baseline",
        gap: u * 2,
        borderBottom: `${u * 0.15}px solid rgba(247,242,240,0.12)`,
        paddingBottom: u * 1.6,
      }}
    >
      <span style={{ color: BRAND.red, fontFamily: "var(--display)", fontSize: u * 3 }}>/</span>
      <span
        style={{
          fontFamily: "var(--display)",
          textTransform: "uppercase",
          fontSize: u * 3.4,
          color: BRAND.cream,
          lineHeight: 1,
        }}
      >
        {k}
      </span>
      <span style={{ fontFamily: "var(--body)", fontSize: u * 1.9, color: BRAND.muted }}>{v}</span>
    </div>
  );
};

export const SceneProof: React.FC = () => {
  const { u, portrait } = useUnit();
  return (
    <AbsoluteFill>
      <Backdrop image="customshop-rashguard.jpg" />
      <Frame>
        <Eyebrow delay={2}>Por que as academias trocam de fornecedor</Eyebrow>
        <Headline delay={8} size={portrait ? 7 : 6}>
          Qualidade de <Red>competição</Red>, margem de atacado
        </Headline>
        <div style={{ display: "flex", flexDirection: "column", gap: u * 1.8, width: "100%", marginTop: u * 1.4 }}>
          {proofs.map((p, i) => (
            <Row key={p.k} k={p.k} v={p.v} delay={20 + i * 8} />
          ))}
        </div>
        <Body delay={62} size={2.2}>
          Já produzimos para dezenas de academias de Jiu-Jitsu, Judô e Muay Thai.
        </Body>
      </Frame>
    </AbsoluteFill>
  );
};
