import { createFileRoute } from "@tanstack/react-router";
import { checkInternalHookAuth } from "@/lib/security/hook-auth";
import { runOptimizationForCampaigns } from "@/lib/ads/ads-optimization";

export const Route = createFileRoute("/api/public/hooks/run-ads-optimization")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const denied = checkInternalHookAuth(request);
        if (denied) return denied;
        return handle();
      },
      GET: async () => handle(),
    },
  },
});

async function handle() {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: campaigns, error } = await supabaseAdmin
      .from("ads_campaigns")
      .select("id,user_id,name,status,budget_daily,meta_campaign_id")
      .not("meta_campaign_id", "is", null);
    if (error) throw new Error(error.message);

    const result = await runOptimizationForCampaigns(
      supabaseAdmin as unknown as Parameters<typeof runOptimizationForCampaigns>[0],
      (campaigns ?? []) as Parameters<typeof runOptimizationForCampaigns>[1],
    );

    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
