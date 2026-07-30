import { createFileRoute } from "@tanstack/react-router";
import { checkInternalHookAuth } from "@/lib/security/hook-auth";

const GRAPH = "https://graph.facebook.com/v21.0";

export const Route = createFileRoute("/api/public/hooks/ig-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = checkInternalHookAuth(request);
        if (denied) return denied;

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
              `${GRAPH}/${conn.instagram_business_account_id}?fields=id,username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count&access_token=${conn.page_access_token}`,
            );
            const profile = (await profRes.json()) as {
              id?: string; username?: string; name?: string; biography?: string; website?: string;
              profile_picture_url?: string; followers_count?: number; follows_count?: number;
              media_count?: number; error?: { message: string };
            };
            if (!profRes.ok || !profile.id) throw new Error(profile.error?.message || "profile fetch failed");

            const { data: acc } = await (supabaseAdmin as any).from("ig_accounts").upsert({
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
              account_type: null,
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
              await (supabaseAdmin as any).from("ig_media_cache").upsert(items.map((m) => ({
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

            // ============ CONVERSATIONS + MESSAGES ============
            let convCount = 0;
            let msgCount = 0;
            try {
              const cRes = await fetch(
                `${GRAPH}/${conn.instagram_business_account_id}/conversations?platform=instagram&fields=id,updated_time,participants,messages.limit(25){id,from,to,message,created_time}&limit=50&access_token=${conn.page_access_token}`,
              );
              const cJson = (await cRes.json()) as {
                data?: Array<{
                  id: string;
                  updated_time?: string;
                  participants?: { data?: Array<{ id: string; username?: string; name?: string }> };
                  messages?: { data?: Array<{ id: string; from?: { id: string; username?: string }; message?: string; created_time?: string }> };
                }>;
                error?: { message: string };
              };
              if (!cRes.ok) throw new Error(cJson.error?.message || "conversations fetch failed");

              const businessIgsid = profile.id;
              for (const conv of cJson.data ?? []) {
                const other = (conv.participants?.data ?? []).find((p) => p.id !== businessIgsid);
                if (!other) continue;
                const updated = conv.updated_time ?? new Date().toISOString();
                const windowExpires = new Date(new Date(updated).getTime() + 7 * 86400000).toISOString();
                const msgs = conv.messages?.data ?? [];
                const lastMsg = msgs[0];

                const { data: convRow } = await (supabaseAdmin as any)
                  .from("ig_conversations")
                  .upsert({
                    user_id: conn.user_id,
                    ig_account_id: acc?.id ?? null,
                    channel: "instagram",
                    participant_igsid: other.id,
                    participant_username: other.username ?? null,
                    participant_name: other.name ?? null,
                    last_message_at: updated,
                    last_message_preview: lastMsg?.message?.slice(0, 120) ?? null,
                    window_expires_at: windowExpires,
                    status: "em_atendimento",
                  }, { onConflict: "user_id,channel,participant_igsid" })
                  .select("id")
                  .single();

                if (convRow && msgs.length) {
                  await (supabaseAdmin as any).from("ig_messages").upsert(msgs.map((m) => ({
                    user_id: conn.user_id,
                    conversation_id: convRow.id,
                    mid: m.id,
                    direction: m.from?.id === businessIgsid ? "out" : "in",
                    text: m.message ?? null,
                    sent_at: m.created_time ?? new Date().toISOString(),
                  })), { onConflict: "conversation_id,mid" });
                  msgCount += msgs.length;
                }
                convCount++;
              }
            } catch (e) {
              // conversations failure shouldn't kill profile+media sync
              await (supabaseAdmin as any).from("ig_sync_log").insert({
                user_id: conn.user_id, ig_account_id: acc?.id ?? null,
                sync_type: "conversations", status: "error",
                error: e instanceof Error ? e.message : String(e),
              });
            }

            // ============ COMMENTS (last 25 media) ============
            let commentCount = 0;
            try {
              for (const m of items.slice(0, 25)) {
                const coRes = await fetch(
                  `${GRAPH}/${m.id}/comments?fields=id,from,text,parent_id,timestamp&limit=25&access_token=${conn.page_access_token}`,
                );
                const coJson = (await coRes.json()) as {
                  data?: Array<{ id: string; from?: { id: string; username?: string }; text?: string; parent_id?: string; timestamp?: string }>;
                };
                const comments = coJson.data ?? [];
                if (comments.length) {
                  await (supabaseAdmin as any).from("ig_comments").upsert(comments.map((c) => ({
                    user_id: conn.user_id,
                    ig_account_id: acc?.id ?? null,
                    media_id: m.id as string,
                    comment_id: c.id,
                    from_id: c.from?.id ?? null,
                    from_username: c.from?.username ?? null,
                    text: c.text ?? null,
                    parent_id: c.parent_id ?? null,
                  })), { onConflict: "user_id,comment_id" });
                  commentCount += comments.length;
                }
              }
            } catch (e) {
              await (supabaseAdmin as any).from("ig_sync_log").insert({
                user_id: conn.user_id, ig_account_id: acc?.id ?? null,
                sync_type: "comments", status: "error",
                error: e instanceof Error ? e.message : String(e),
              });
            }

            await (supabaseAdmin as any).from("ig_sync_log").insert({
              user_id: conn.user_id, ig_account_id: acc?.id ?? null,
              sync_type: "full", status: "success",
              items_count: 1 + items.length + convCount + msgCount + commentCount,
              duration_ms: Date.now() - t0,
            });
            results.push({ user: conn.user_id, ok: true });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await (supabaseAdmin as any).from("ig_sync_log").insert({
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
