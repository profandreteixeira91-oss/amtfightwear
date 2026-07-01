import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const REDIRECT_URI = "https://marketing.amtfightwear.com.br/api/public/meta/callback";
const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
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
