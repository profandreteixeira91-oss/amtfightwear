import { Composition } from "remotion";
import { NarratedVideo, TOTAL_FRAMES } from "./NarratedVideo";
import { NarratedVideoVertical, TOTAL_FRAMES_VERTICAL } from "./NarratedVideoVertical";
import { NarratedVideoSquare, TOTAL_FRAMES_SQUARE } from "./NarratedVideoSquare";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="main" component={NarratedVideo} durationInFrames={TOTAL_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="vertical" component={NarratedVideoVertical} durationInFrames={TOTAL_FRAMES_VERTICAL} fps={30} width={1080} height={1920} />
    <Composition id="square" component={NarratedVideoSquare} durationInFrames={TOTAL_FRAMES_SQUARE} fps={30} width={1080} height={1080} />
  </>
);
