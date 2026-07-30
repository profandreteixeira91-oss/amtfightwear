import { createFileRoute } from "@tanstack/react-router";
import { checkInternalHookAuth } from "@/lib/security/hook-auth";
import { decideScale, embedText, type ScaleCampaign } from "@/lib/ads/ads-scale";

export const Route = createFileRoute("/api/public/hooks/scale-winners")({
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
      .select(
        "id,user_id,name,status,budget_daily,meta_campaign_id,meta_adset_id,ads_account_id",
      )
      .eq("status", "active")
      .not("meta_campaign_id", "is", null);
    if (error) throw new Error(error.message);

    let scaled = 0;
    let paused = 0;
    let embedded = 0;

    for (const c of (campaigns ?? []) as ScaleCampaign[]) {
      // insights
      const { data: insights } = await supabaseAdmin
        .from("ads_insights")
        .select("date,spend,impressions,clicks,conversions,revenue,ctr,cpa,roas")
        .eq("campaign_id", c.id);

      // last scale timestamp
      const { data: lastScale } = await supabaseAdmin
        .from("ads_scale_history")
        .select("created_at")
        .eq("campaign_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const decision = decideScale(
        c,
        (insights ?? []) as Parameters<typeof decideScale>[1],
        lastScale?.created_at ?? null,
      );
      if (!decision) continue;

      // Get meta token
      let metaResponse: unknown = null;
      if (c.ads_account_id) {
        const { data: acct } = await supabaseAdmin
          .from("ads_accounts")
          .select("act_id,meta_connection:meta_connections(page_access_token)")
          .eq("id", c.ads_account_id)
          .single();
        const token = (
          acct as { meta_connection: { page_access_token: string } | null } | null
        )?.meta_connection?.page_access_token;

        if (token && c.meta_adset_id) {
          try {
            if (decision.action === "pause") {
              const r = await fetch(
                `https://graph.facebook.com/v21.0/${c.meta_campaign_id}?access_token=${encodeURIComponent(token)}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "PAUSED" }),
                },
              );
              metaResponse = await r.json();
              await supabaseAdmin
                .from("ads_campaigns")
                .update({ status: "paused" })
                .eq("id", c.id);
              paused += 1;
            } else {
              const cents = Math.max(500, Math.round(decision.new_budget * 100));
              const r = await fetch(
                `https://graph.facebook.com/v21.0/${c.meta_adset_id}?access_token=${encodeURIComponent(token)}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ daily_budget: String(cents) }),
                },
              );
              metaResponse = await r.json();
              await supabaseAdmin
                .from("ads_campaigns")
                .update({ budget_daily: decision.new_budget })
                .eq("id", c.id);
              scaled += 1;
            }
          } catch (e) {
            metaResponse = { error: e instanceof Error ? e.message : String(e) };
          }
        }
      }

      await supabaseAdmin.from("ads_scale_history").insert({
        user_id: c.user_id,
        campaign_id: c.id,
        action: decision.action,
        previous_budget: decision.previous_budget,
        new_budget: decision.new_budget,
        scale_pct: decision.scale_pct,
        reason: decision.reason,
        roas_at_action: decision.metrics.roas,
        ctr_at_action: decision.metrics.ctr,
        cpa_at_action: decision.metrics.cpa,
        auto_applied: true,
        meta_response: (metaResponse ?? null) as never,
      });

      // If we scaled up a winner, embed its creative for future learning
      if (decision.action === "scale_up") {
        try {
          const { data: copy } = await supabaseAdmin
            .from("ads_copies")
            .select("id,headline,primary_text,description")
            .eq("campaign_id", c.id)
            .limit(1)
            .maybeSingle();
          const { data: creative } = await supabaseAdmin
            .from("ads_creatives")
            .select("id,prompt,image_url")
            .eq("campaign_id", c.id)
            .limit(1)
            .maybeSingle();

          const content = [
            copy?.headline,
            copy?.primary_text,
            copy?.description,
            creative?.prompt,
          ]
            .filter(Boolean)
            .join(" \n ");
          if (content.trim().length > 10) {
            const vec = await embedText(content);
            await supabaseAdmin.from("ads_creative_embeddings").insert({
              user_id: c.user_id,
              campaign_id: c.id,
              creative_id: creative?.id ?? null,
              copy_id: copy?.id ?? null,
              content,
              embedding: vec as unknown as string,
              performance_score: decision.metrics.roas,
              roas: decision.metrics.roas,
              ctr: decision.metrics.ctr,
              cpa: decision.metrics.cpa,
              spend: decision.metrics.spend,
              metadata: { source: "auto_scale", conversions: decision.metrics.conversions },
            });
            if (copy?.id) {
              await supabaseAdmin
                .from("ads_copies")
                .update({ is_winner: true, winner_score: decision.metrics.roas })
                .eq("id", copy.id);
            }
            if (creative?.id) {
              await supabaseAdmin
                .from("ads_creatives")
                .update({ is_winner: true, winner_score: decision.metrics.roas })
                .eq("id", creative.id);
            }
            embedded += 1;
          }
        } catch (e) {
          console.error("embed winner failed:", e);
        }
      }
    }

    return Response.json({ ok: true, scaled, paused, embedded, evaluated: campaigns?.length ?? 0 });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
