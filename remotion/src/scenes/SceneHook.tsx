import React from "react";
import { AbsoluteFill } from "remotion";
import { Backdrop, Body, Eyebrow, Frame, Headline, LogoBar, Red, useUnit } from "../kit";

export const SceneHook: React.FC = () => {
  const { portrait } = useUnit();
  return (
    <AbsoluteFill>
      <Backdrop image="loja-hero-banner.jpg" />
      <LogoBar />
      <Frame>
        <Eyebrow delay={4}>Atacado para academias</Eyebrow>
        <Headline delay={12} size={portrait ? 10 : 9}>
          Vista sua equipe
          <br />
          com preço
          <br />
          <Red>de fábrica</Red>
        </Headline>
        <Body delay={26}>
          Kimonos, faixas e rashguards produzidos na nossa confecção — sem intermediário, sem
          revenda, direto para o seu dojo.
        </Body>
      </Frame>
    </AbsoluteFill>
  );
};
