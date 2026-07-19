// Endpoint chamado pelo pg_cron a cada 6h para acionar a coleta.
// Autentica via header `apikey` (Supabase anon key), padrão da plataforma.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/competitions-ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Import dinâmico para manter o server-only fora do bundle client
        const mod = await import("@/lib/dojo/competitions/ingest.functions");
        const result = await (mod.runCompetitionIngest as unknown as (i: { data: object }) => Promise<unknown>)({ data: {} });
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
