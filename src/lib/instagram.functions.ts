import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GRAPH = "https://graph.facebook.com/v21.0";

type ConnRow = {
  id: string;
  page_access_token: string;
  instagram_business_account_id: string | null;
  instagram_username: string | null;
  token_expires_at: string | null;
};

// Minimal Supabase-like shape needed here
type SB = {
  from: (t: string) => {
    select: (s: string) => {
      eq: (a: string, b: string) => {
        order: (o: string, opt: { ascending: boolean }) => {
          limit: (n: number) => { maybeSingle: () => Promise<{ data: ConnRow | null; error: { message: string } | null }> };
        };
      };
    };
  };
};

async function getActiveConnection(supabase: SB): Promise<ConnRow> {
  const { data, error } = await supabase
    .from("meta_connections")
    .select("id, page_access_token, instagram_business_account_id, instagram_username, token_expires_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Nenhuma conexão Meta ativa. Conecte em Conexões e APIs.");
  if (!data.instagram_business_account_id) throw new Error("Conta Instagram Business não vinculada à Página.");
  return data;
}

async function publishToInstagram(igId: string, token: string, caption: string, imageUrl: string) {
  const createRes = await fetch(`${GRAPH}/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
  });
  const createJson = (await createRes.json()) as { id?: string; error?: { message: string } };
  if (!createRes.ok || !createJson.id) throw new Error(createJson.error?.message || "Falha ao criar container de mídia");

  const publishRes = await fetch(`${GRAPH}/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: createJson.id, access_token: token }),
  });
  const publishJson = (await publishRes.json()) as { id?: string; error?: { message: string } };
  if (!publishRes.ok || !publishJson.id) throw new Error(publishJson.error?.message || "Falha ao publicar no Instagram");

  const info = (await fetch(`${GRAPH}/${publishJson.id}?fields=permalink&access_token=${token}`).then((r) => r.json())) as { permalink?: string };
  return { ig_media_id: publishJson.id, ig_permalink: info.permalink ?? null };
}

const CreateInput = z.object({
  caption: z.string().min(1).max(2200),
  imageUrl: z.string().url(),
  productId: z.string().uuid().nullable().optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
  publishNow: z.boolean().optional(),
});

export const createInstagramPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateInput.parse(i))
  .handler(async ({ data, context }) => {
    const status = data.publishNow ? "publishing" : data.scheduledFor ? "scheduled" : "draft";
    const { data: row, error } = await context.supabase
      .from("scheduled_posts")
      .insert({
        user_id: context.userId,
        caption: data.caption,
        image_url: data.imageUrl,
        product_id: data.productId ?? null,
        scheduled_for: data.scheduledFor ?? null,
        status,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (data.publishNow) {
      try {
        const conn = await getActiveConnection(context.supabase as unknown as SB);
        const res = await publishToInstagram(conn.instagram_business_account_id!, conn.page_access_token, data.caption, data.imageUrl);
        await context.supabase
          .from("scheduled_posts")
          .update({ status: "published", ig_media_id: res.ig_media_id, ig_permalink: res.ig_permalink, published_at: new Date().toISOString() })
          .eq("id", row.id);
        return { ...row, status: "published", ...res };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await context.supabase.from("scheduled_posts").update({ status: "failed", error: msg }).eq("id", row.id);
        throw new Error(msg);
      }
    }
    return row;
  });

export const listInstagramPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("scheduled_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const cancelInstagramPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("scheduled_posts")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("status", "scheduled");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rescheduleInstagramPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      scheduledFor: z.string().datetime().nullable(),
      caption: z.string().min(1).max(2200).optional(),
      imageUrl: z.string().url().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.caption !== undefined) patch.caption = data.caption;
    if (data.imageUrl !== undefined) patch.image_url = data.imageUrl;
    if (data.scheduledFor !== undefined) {
      patch.scheduled_for = data.scheduledFor;
      patch.status = data.scheduledFor ? "scheduled" : "draft";
    }
    const { data: row, error } = await context.supabase
      .from("scheduled_posts")
      .update(patch)
      .eq("id", data.id)
      .in("status", ["draft", "scheduled", "failed", "cancelled"])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteInstagramPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("scheduled_posts")
      .delete()
      .eq("id", data.id)
      .in("status", ["draft", "cancelled", "failed"]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
