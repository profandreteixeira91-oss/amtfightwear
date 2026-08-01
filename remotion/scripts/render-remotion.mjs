import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2] ?? "render";

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (config) => config,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

const targets = [
  { id: "ad-horizontal", out: "/mnt/documents/amt-atacado-horizontal-16x9.mp4" },
  { id: "ad-vertical", out: "/mnt/documents/amt-atacado-vertical-9x16.mp4" },
  { id: "ad-square", out: "/mnt/documents/amt-atacado-quadrado-1x1.mp4" },
];

for (const t of targets) {
  const composition = await selectComposition({ serveUrl: bundled, id: t.id, puppeteerInstance: browser });
  if (mode === "stills") {
    for (const frame of [40, 150, 260, 370, 450]) {
      await renderStill({
        composition,
        serveUrl: bundled,
        output: `/tmp/browser/still-${t.id}-${frame}.png`,
        frame,
        puppeteerInstance: browser,
        overwrite: true,
      });
    }
    console.log("stills done", t.id);
    if (t.id === "ad-horizontal" && process.argv[3] === "one") break;
    continue;
  }
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    crf: 20,
    outputLocation: t.out,
    puppeteerInstance: browser,
    muted: true,
    concurrency: 2,
  });
  console.log("rendered", t.out);
}

await browser.close({ silent: false });
