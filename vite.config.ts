// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "path";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

const mode = process.env.NODE_ENV ?? "development";

// Existing VITE_* env injection for client code.
const env = loadEnv(mode, process.cwd(), "VITE_");

// Load all env vars into process.env for server-side code (server routes,
// server functions). Required for SUPABASE_SERVICE_ROLE_KEY and LOVABLE_API_KEY.
const serverEnv = loadEnv(mode, process.cwd(), "");
Object.assign(process.env, serverEnv);

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: Object.fromEntries(
      Object.entries(env).map(([key, value]) => [
        `import.meta.env.${key}`,
        JSON.stringify(value),
      ]),
    ),
    resolve: {
      alias: {
        // React Email's htmlparser2 needs entities v4.5.0; v7+ removed ./lib/decode.js.
        // Force every entities import to the hoisted v4.5.0 copy.
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(__dirname, "node_modules/entities"),
      },
    },
  },
});

