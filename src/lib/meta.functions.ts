import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const REDIRECT_URI = "https://amtfightwear.com.br/api/public/meta/callback";
const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "pages_messaging",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_messages",
  "instagram_manage_comments",
  "instagram_manage_insights",
  "business_management",
].join(",");

export const getMetaAuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const appId = process.env.META_APP_ID;
    if (!appId) throw new Error("META_APP_ID não configurado");

    const state = crypto.randomUUID();
    const { error } = await context.supabase
      .from("meta_oauth_states")
      .insert({ state, user_id: context.userId });
    if (error) throw new Error(`Erro ao criar state: ${error.message}`);

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: REDIRECT_URI,
      state,
      scope: SCOPES,
      response_type: "code",
    });
    return { url: `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}` };
  });

export const getMetaConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("meta_connections")
      .select("id, page_id, page_name, page_picture_url, instagram_username, instagram_business_account_id, token_expires_at, status, last_sync_at, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const disconnectMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("meta_connections")
      .update({ status: "revoked" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const GRAPH = "https://graph.facebook.com/v21.0";

type IGMedia = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
};

export const getMetaOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: conn, error } = await context.supabase
      .from("meta_connections")
      .select("page_id, page_name, page_picture_url, page_access_token, instagram_business_account_id, instagram_username")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!conn?.page_access_token) return null;

    const token = conn.page_access_token;
    const igId = conn.instagram_business_account_id;

    const [pageRes, igRes, mediaRes] = await Promise.all([
      fetch(`${GRAPH}/${conn.page_id}?fields=fan_count,followers_count,name,picture{url}&access_token=${token}`),
      igId ? fetch(`${GRAPH}/${igId}?fields=followers_count,follows_count,media_count,name,profile_picture_url&access_token=${token}`) : Promise.resolve(null),
      igId ? fetch(`${GRAPH}/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=9&access_token=${token}`) : Promise.resolve(null),
    ]);

    const page = (await pageRes.json()) as { fan_count?: number; followers_count?: number; name?: string; picture?: { data?: { url: string } }; error?: { message: string } };
    const ig = igRes ? ((await igRes.json()) as { followers_count?: number; follows_count?: number; media_count?: number; name?: string; profile_picture_url?: string; error?: { message: string } }) : null;
    const mediaJson = mediaRes ? ((await mediaRes.json()) as { data?: IGMedia[]; error?: { message: string } }) : null;

    return {
      page: {
        id: conn.page_id,
        name: conn.page_name,
        picture: conn.page_picture_url,
        fans: page.fan_count ?? page.followers_count ?? 0,
      },
      instagram: ig && !ig.error && igId ? {
        id: igId,
        username: conn.instagram_username,
        followers: ig.followers_count ?? 0,
        following: ig.follows_count ?? 0,
        posts: ig.media_count ?? 0,
        picture: ig.profile_picture_url,
      } : null,
      media: (mediaJson?.data ?? []).map((m) => ({
        id: m.id,
        caption: m.caption ?? "",
        type: m.media_type,
        url: m.media_type === "VIDEO" ? m.thumbnail_url ?? m.media_url ?? "" : m.media_url ?? "",
        permalink: m.permalink,
        timestamp: m.timestamp,
        likes: m.like_count ?? 0,
        comments: m.comments_count ?? 0,
      })),
      errors: {
        page: page.error?.message,
        ig: ig?.error?.message,
        media: mediaJson?.error?.message,
      },
    };
  });
