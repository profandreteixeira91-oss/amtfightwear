import { createFileRoute } from "@tanstack/react-router";
import { checkInternalHookAuth } from "@/lib/security/hook-auth";

const GRAPH = "https://graph.facebook.com/v21.0";

async function publish(igId: string, token: string, caption: string, imageUrl: string) {
  const c = await fetch(`${GRAPH}/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
  }).then((r) => r.json()) as { id?: string; error?: { message: string } };
  if (!c.id) throw new Error(c.error?.message || "container failed");

  const p = await fetch(`${GRAPH}/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: c.id, access_token: token }),
  }).then((r) => r.json()) as { id?: string; error?: { message: string } };
  if (!p.id) throw new Error(p.error?.message || "publish failed");

  const info = await fetch(`${GRAPH}/${p.id}?fields=permalink&access_token=${token}`).then((r) => r.json()) as { permalink?: string };
  return { ig_media_id: p.id, ig_permalink: info.permalink ?? null };
}

export const Route = createFileRoute("/api/public/hooks/publish-scheduled-posts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = checkInternalHookAuth(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: due, error } = await supabaseAdmin
          .from("scheduled_posts")
          .select("id, user_id, caption, image_url")
          .eq("status", "scheduled")
          .lte("scheduled_for", new Date().toISOString())
          .limit(20);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        if (!due?.length) return Response.json({ processed: 0 });

        const { data: conn } = await supabaseAdmin
          .from("meta_connections")
          .select("page_access_token, instagram_business_account_id")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!conn?.page_access_token || !conn.instagram_business_account_id) {
          return Response.json({ error: "No active Meta connection" }, { status: 400 });
        }

        let ok = 0;
        let fail = 0;
        for (const post of due) {
          await supabaseAdmin.from("scheduled_posts").update({ status: "publishing" }).eq("id", post.id);
          try {
            const res = await publish(conn.instagram_business_account_id, conn.page_access_token, post.caption, post.image_url);
            await supabaseAdmin.from("scheduled_posts").update({
              status: "published",
              ig_media_id: res.ig_media_id,
              ig_permalink: res.ig_permalink,
              published_at: new Date().toISOString(),
            }).eq("id", post.id);
            ok++;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await supabaseAdmin.from("scheduled_posts").update({ status: "failed", error: msg }).eq("id", post.id);
            fail++;
          }
        }
        return Response.json({ processed: due.length, ok, fail });
      },
    },
  },
});
