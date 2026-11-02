// Configuração explícita do Vite (substitui @lovable.dev/vite-tanstack-config).
// Reproduz o que aquele preset fazia fora do sandbox da Lovable: Tailwind,
// paths do tsconfig, TanStack Start, Nitro (Cloudflare Workers) só no build,
// React, injeção das VITE_* e alias "@".
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command, mode }) => {
  // Existing VITE_* env injection for client code.
  const env = loadEnv(mode, process.cwd(), "VITE_");

  // Load all env vars into process.env for server-side code (server routes,
  // server functions). Required for SUPABASE_SERVICE_ROLE_KEY and other secrets.
  const serverEnv = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, serverEnv);

  return {
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
        // nitro/vite builds from this
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
      }),
      ...(command === "build" ? [nitro({ defaultPreset: "cloudflare-module" })] : []),
      viteReact(),
    ],
    define: Object.fromEntries(
      Object.entries(env).map(([key, value]) => [
        `import.meta.env.${key}`,
        JSON.stringify(value),
      ]),
    ),
    css: { transformer: "lightningcss" },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        // React Email's htmlparser2 needs entities v4.5.0; v7+ removed ./lib/decode.js.
        // Only the ./lib/*.js paths are forced to the hoisted v4.5.0 copy: a bare
        // "entities" alias would also catch "entities/decode" from htmlparser2 v10
        // (which ships its own entities v7) and break the dependency optimizer.
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
      // Mesmo comportamento do preset anterior: não descarta requisições durante a
      // reotimização de dependências (evita duas cópias do React no dev).
      ignoreOutdatedRequests: true,
    },
    server: { host: "::", port: 8080 },
  };
});
