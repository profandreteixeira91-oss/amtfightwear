// Endpoint chamado pelo pg_cron a cada 6h para acionar a coleta.
// Autentica via checkInternalHookAuth (CRON_SECRET ou apikey do projeto).

import { createFileRoute } from "@tanstack/react-router";
import { checkInternalHookAuth } from "@/lib/security/hook-auth";

export const Route = createFileRoute("/api/public/hooks/competitions-ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = checkInternalHookAuth(request);
        if (denied) return denied;

        // Import dinâmico para manter o server-only fora do bundle client
        const mod = await import("@/lib/dojo/competitions/ingest.functions");
        // runIngest direto: a server function exige login do dono da plataforma.
        const result = await mod.runIngest({});
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
