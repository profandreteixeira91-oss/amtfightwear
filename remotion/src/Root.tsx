import React from "react";
import { Composition } from "remotion";
import { AdVideo, AD_DURATION } from "./AdVideo";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ad-horizontal" component={AdVideo} durationInFrames={AD_DURATION} fps={30} width={1920} height={1080} />
    <Composition id="ad-vertical" component={AdVideo} durationInFrames={AD_DURATION} fps={30} width={1080} height={1920} />
    <Composition id="ad-square" component={AdVideo} durationInFrames={AD_DURATION} fps={30} width={1080} height={1080} />
  </>
);
