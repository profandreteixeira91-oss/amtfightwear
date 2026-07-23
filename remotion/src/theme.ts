import { loadFont as loadDisplay } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadSans } from "@remotion/google-fonts/Inter";

export const display = loadDisplay("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const sans = loadSans("normal", { weights: ["300", "400", "500", "700", "900"], subsets: ["latin"] }).fontFamily;

export const colors = {
  bg: "#0A0304",
  bgSoft: "#180608",
  ink: "#F5E9EA",
  inkDim: "#8A6266",
  ruby: "#E11D2A",
  rubyGlow: "#FF3B4A",
  rubyDeep: "#7A0A12",
  gold: "#D4A24C",
};
