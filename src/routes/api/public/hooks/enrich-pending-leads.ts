/**
 * Cron horário — enriquecimento automático de leads pendentes.
 * Percorre `prospect_enrichment_jobs` com status='pending' e roda o
 * mesmo motor de `enrichLead`, respeitando um limite por rodada.
 */
import { createFileRoute } from "@tanstack/react-router";
import { checkInternalHookAuth } from "@/lib/security/hook-auth";

const PER_USER_LIMIT = 15;

export const Route = createFileRoute("/api/public/hooks/enrich-pending-leads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = checkInternalHookAuth(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { enrichCompanyCore } = await import("@/lib/prospect/prospect-engine.server");

        const { data: jobs, error } = await supabaseAdmin
          .from("prospect_enrichment_jobs")
          .select("id, owner_id, company_id")
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(200);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        if (!jobs?.length) return Response.json({ processed: 0 });

        // Agrupar por owner e limitar por usuário
        const byOwner = new Map<string, Array<{ company_id: string }>>();
        for (const j of jobs as Array<{ owner_id: string; company_id: string }>) {
          const list = byOwner.get(j.owner_id) ?? [];
          if (list.length < PER_USER_LIMIT) list.push({ company_id: j.company_id });
          byOwner.set(j.owner_id, list);
        }

        let ok = 0, failed = 0, notFound = 0, total = 0;
        for (const [ownerId, list] of byOwner) {
          for (const { company_id } of list) {
            total++;
            try {
              const r = await enrichCompanyCore(
                supabaseAdmin as unknown as { from: (t: string) => any },
                ownerId,
                company_id,
              );
              if (r.foundRequired) ok++; else notFound++;
            } catch { failed++; }
          }
          await supabaseAdmin.from("prospect_logs").insert({
            owner_id: ownerId, source: "enrichment", action: "auto_cron",
            message: `Auto-enriquecimento: ${list.length} leads processados`,
            metadata: { limit: PER_USER_LIMIT },
          });
        }

        return Response.json({ processed: total, ok, notFound, failed });
      },
    },
  },
});
