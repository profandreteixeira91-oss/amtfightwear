import { createFileRoute } from "@tanstack/react-router";
import { checkInternalHookAuth } from "@/lib/security/hook-auth";
import { syncCampaignInsightsInternal } from "@/lib/ads/ads.functions";

export const Route = createFileRoute("/api/public/hooks/sync-ads-insights")({
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
      .select("id,user_id,meta_campaign_id,ads_account_id,status")
      .not("meta_campaign_id", "is", null)
      .in("status", ["active", "paused"]);
    if (error) throw new Error(error.message);

    let synced = 0;
    let failed = 0;
    const errors: Array<{ campaign_id: string; error: string }> = [];

    for (const c of campaigns ?? []) {
      try {
        const { data: acc } = await supabaseAdmin
          .from("ads_accounts")
          .select("meta_connection:meta_connections(page_access_token)")
          .eq("id", c.ads_account_id!)
          .single();
        const token = (acc as { meta_connection: { page_access_token: string } | null } | null)
          ?.meta_connection?.page_access_token;
        if (!token) {
          failed++;
          errors.push({ campaign_id: c.id, error: "sem token" });
          continue;
        }
        const r = await syncCampaignInsightsInternal(supabaseAdmin, c, token);
        synced += r.synced;
      } catch (e) {
        failed++;
        errors.push({ campaign_id: c.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return Response.json({
      ok: true,
      campaigns: campaigns?.length ?? 0,
      rows_synced: synced,
      failed,
      errors: errors.slice(0, 10),
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
