import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

const GRAPH = "https://graph.facebook.com/v21.0";
const VERIFY_TOKEN = "amt_meta_webhook_2026";

function cors(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Hub-Signature-256",
  };
}

export const Route = createFileRoute("/api/public/meta/webhook")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        return new Response(null, {
          status: 204,
          headers: cors(request.headers.get("origin") ?? "*"),
        });
      },

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
          return new Response(challenge, {
            status: 200,
            headers: { "Content-Type": "text/plain", ...cors() },
          });
        }

        return new Response("Forbidden", {
          status: 403,
          headers: cors(),
        });
      },

      POST: async ({ request }) => {
        const appSecret = process.env["META_APP_SECRET"];
        if (!appSecret) {
          return new Response(JSON.stringify({ error: "META_APP_SECRET não configurado" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...cors() },
          });
        }

        const signature = request.headers.get("x-hub-signature-256") ?? "";
        const body = await request.text();

        const expected = createHmac("sha256", appSecret).update(body).digest("hex");
        const sigBuf = Buffer.from(signature.replace(/^sha256=/, ""));
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
          return new Response(JSON.stringify({ error: "Assinatura inválida" }), {
            status: 401,
            headers: { "Content-Type": "application/json", ...cors() },
          });
        }

        let payload: unknown;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response(JSON.stringify({ error: "JSON inválido" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...cors() },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const accessToken = process.env["META_ADS_ACCESS_TOKEN"];

        const entries = ((payload as any)?.entry ?? []) as Array<{
          id?: string;
          changes?: Array<{ field?: string; value?: any }>;
        }>;

        const results: string[] = [];

        for (const entry of entries) {
          for (const change of entry.changes ?? []) {
            const field = change.field;
            const value = change.value ?? {};

            if (field === "leadgen" && accessToken) {
              const leadId = value.leadgen_id;
              const pageId = value.page_id;
              const formId = value.form_id;
              const adId = value.ad_id;

              if (!leadId) continue;

              try {
                const leadRes = await fetch(
                  `${GRAPH}/${leadId}?access_token=${accessToken}`,
                );
                const leadJson = (await leadRes.json()) as {
                  id?: string;
                  created_time?: string;
                  field_data?: Array<{ name: string; values: string[] }>;
                  error?: { message: string };
                };

                if (leadJson.error) {
                  results.push(`lead ${leadId}: ${leadJson.error.message}`);
                  continue;
                }

                const fields = new Map<string, string>();
                for (const f of leadJson.field_data ?? []) {
                  fields.set(f.name.toLowerCase(), f.values?.[0] ?? "");
                }

                const fullName = fields.get("full_name") ?? fields.get("name") ?? "Lead Meta";
                const email = fields.get("email") ?? "";
                const phone = fields.get("phone_number") ?? fields.get("phone") ?? "";
                const city = fields.get("city") ?? "";

                const { error: insertErr } = await supabaseAdmin.from("leads").insert({
                  name: fullName,
                  email: email || null,
                  phone: phone || null,
                  city: city || null,
                  source: `Meta Lead Ads${formId ? ` (form: ${formId})` : ""}${adId ? ` | ad: ${adId}` : ""}`,
                  status: "Novo",
                  lead_type: "Meta Lead Ads",
                });

                if (insertErr) {
                  results.push(`lead ${leadId}: insert error ${insertErr.message}`);
                } else {
                  results.push(`lead ${leadId}: saved`);
                }
              } catch (err) {
                results.push(`lead ${leadId}: ${err instanceof Error ? err.message : String(err)}`);
              }
            }

            if (field === "ads_management" || field === "campaign") {
              const campaignId = value.campaign_id;
              const adsetId = value.adset_id;
              const adId = value.ad_id;
              const status = value.status;

              if (campaignId) {
                const { error: updErr } = await supabaseAdmin
                  .from("ads_campaigns")
                  .update({
                    status: status ? String(status).toLowerCase() : undefined,
                    last_sync_at: new Date().toISOString(),
                  })
                  .eq("meta_campaign_id", String(campaignId));
                if (updErr) {
                  results.push(`campaign ${campaignId}: ${updErr.message}`);
                } else {
                  results.push(`campaign ${campaignId}: synced`);
                }
              }

              if (adsetId && !campaignId) {
                const { error: updErr } = await supabaseAdmin
                  .from("ads_campaigns")
                  .update({ last_sync_at: new Date().toISOString() })
                  .eq("meta_adset_id", String(adsetId));
                if (updErr) results.push(`adset ${adsetId}: ${updErr.message}`);
                else results.push(`adset ${adsetId}: synced`);
              }

              if (adId && !campaignId && !adsetId) {
                const { error: updErr } = await supabaseAdmin
                  .from("ads_campaigns")
                  .update({ last_sync_at: new Date().toISOString() })
                  .eq("meta_ad_id", String(adId));
                if (updErr) results.push(`ad ${adId}: ${updErr.message}`);
                else results.push(`ad ${adId}: synced`);
              }
            }
          }
        }

        return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...cors() },
        });
      },
    },
  },
});
