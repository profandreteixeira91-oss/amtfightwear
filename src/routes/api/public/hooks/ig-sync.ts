import { createFileRoute } from "@tanstack/react-router";

const GRAPH = "https://graph.facebook.com/v21.0";

export const Route = createFileRoute("/api/public/hooks/ig-sync")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // For each active meta_connection: sync profile + recent media
        const { data: connections } = await supabaseAdmin
          .from("meta_connections")
          .select("id, user_id, page_access_token, instagram_business_account_id, instagram_username")
          .eq("status", "active");

        const results: Array<{ user: string; ok: boolean; error?: string }> = [];

        for (const conn of connections ?? []) {
          if (!conn.instagram_business_account_id) continue;
          const t0 = Date.now();
          try {
            const profRes = await fetch(
              `${GRAPH}/${conn.instagram_business_account_id}?fields=id,username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count,account_type&access_token=${conn.page_access_token}`,
            );
            const profile = (await profRes.json()) as {
              id?: string; username?: string; name?: string; biography?: string; website?: string;
              profile_picture_url?: string; followers_count?: number; follows_count?: number;
              media_count?: number; account_type?: string; error?: { message: string };
            };
            if (!profRes.ok || !profile.id) throw new Error(profile.error?.message || "profile fetch failed");

            const { data: acc } = await supabaseAdmin.from("ig_accounts").upsert({
              user_id: conn.user_id,
              connection_id: conn.id,
              ig_user_id: profile.id,
              username: profile.username ?? null,
              name: profile.name ?? null,
              biography: profile.biography ?? null,
              website: profile.website ?? null,
              profile_picture_url: profile.profile_picture_url ?? null,
              followers_count: profile.followers_count ?? 0,
              follows_count: profile.follows_count ?? 0,
              media_count: profile.media_count ?? 0,
              account_type: profile.account_type ?? null,
              status: "connected",
              last_synced_at: new Date().toISOString(),
            }, { onConflict: "user_id,ig_user_id" }).select("id").single();

            // Sync recent media
            const mRes = await fetch(
              `${GRAPH}/${conn.instagram_business_account_id}/media?fields=id,media_type,caption,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count&limit=25&access_token=${conn.page_access_token}`,
            );
            const mJson = (await mRes.json()) as { data?: Array<{ id: string;[k: string]: unknown }> };
            const items = mJson.data ?? [];
            if (items.length) {
              await supabaseAdmin.from("ig_media_cache").upsert(items.map((m) => ({
                user_id: conn.user_id,
                ig_account_id: acc?.id ?? null,
                media_id: m.id,
                media_type: (m.media_type as string) ?? null,
                caption: (m.caption as string) ?? null,
                permalink: (m.permalink as string) ?? null,
                thumbnail_url: (m.thumbnail_url as string) ?? null,
                media_url: (m.media_url as string) ?? null,
                timestamp: (m.timestamp as string) ?? null,
                like_count: (m.like_count as number) ?? 0,
                comments_count: (m.comments_count as number) ?? 0,
                synced_at: new Date().toISOString(),
              })), { onConflict: "user_id,media_id" });
            }

            await supabaseAdmin.from("ig_sync_log").insert({
              user_id: conn.user_id, ig_account_id: acc?.id ?? null,
              sync_type: "full", status: "success", items_count: 1 + items.length, duration_ms: Date.now() - t0,
            });
            results.push({ user: conn.user_id, ok: true });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await supabaseAdmin.from("ig_sync_log").insert({
              user_id: conn.user_id, sync_type: "full", status: "error", error: msg, duration_ms: Date.now() - t0,
            });
            results.push({ user: conn.user_id, ok: false, error: msg });
          }
        }
        return Response.json({ ok: true, processed: results.length, results });
      },
    },
  },
});
