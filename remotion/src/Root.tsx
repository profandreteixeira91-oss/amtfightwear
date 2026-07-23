import { Composition } from "remotion";
import { NarratedVideo, TOTAL_FRAMES } from "./NarratedVideo";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="main"
    component={NarratedVideo}
    durationInFrames={TOTAL_FRAMES}
    fps={30}
    width={1920}
    height={1080}
  />
);
