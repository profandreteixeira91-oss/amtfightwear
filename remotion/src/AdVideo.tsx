import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { fade } from "@remotion/transitions/fade";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Anton";
import { loadFont as loadBody } from "@remotion/google-fonts/Barlow";
import { BRAND } from "./brand";
import { SceneHook } from "./scenes/SceneHook";
import { SceneOffer } from "./scenes/SceneOffer";
import { SceneProducts } from "./scenes/SceneProducts";
import { SceneProof } from "./scenes/SceneProof";
import { SceneCta } from "./scenes/SceneCta";

const display = loadDisplay("normal", { weights: ["400"], subsets: ["latin"] });
const body = loadBody("normal", { weights: ["500", "700", "800"], subsets: ["latin"] });

export const SCENE = 105;
export const TRANSITION = 15;
export const AD_DURATION = SCENE * 5 - TRANSITION * 4; // 465

const timing = springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION });

export const AdVideo: React.FC = () => {
  return (
    <AbsoluteFill
      style={
        {
          backgroundColor: BRAND.bg,
          "--display": display.fontFamily,
          "--body": body.fontFamily,
        } as React.CSSProperties
      }
    >
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <SceneHook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <SceneOffer />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <SceneProducts />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <SceneProof />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <SceneCta />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
