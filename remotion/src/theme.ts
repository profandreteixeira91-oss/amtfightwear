import { loadFont } from "@remotion/google-fonts/Inter";

// Landing page uses Inter for both display and body (see .dojo-theme in styles.css)
const inter = loadFont("normal", {
  weights: ["300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

export const sans = inter.fontFamily;
export const display = inter.fontFamily;

// Palette mirrors the landing (.dojo-theme in src/styles.css)
export const colors = {
  bg: "#ffffff",
  bgSoft: "#fafafa",
  surface: "#ffffff",
  surface2: "#f4f4f5",
  ink: "#0a0a0a",
  ink2: "#262626",
  inkDim: "#737373",
  border: "#e2e2e2",
  borderStrong: "#c7c7c7",
  ruby: "#dc2626",
  rubyHover: "#b91c1c",
  rubyDeep: "#991b1b",
  rubySoft: "#fef2f2",
};
