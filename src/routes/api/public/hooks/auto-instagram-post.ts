import { createFileRoute } from "@tanstack/react-router";

const GRAPH = "https://graph.facebook.com/v21.0";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";

type Product = { id: string; name: string; category: string | null; price: number; image_url: string | null; description: string | null };

async function generateCopy(apiKey: string, product: Product, tone: string) {
  const prompt = `Você é copywriter da AMT Fight Wear, marca brasileira premium de Jiu-Jitsu e Judô.
Produto em destaque: "${product.name}"${product.category ? ` (${product.category})` : ""}${product.price ? ` — R$ ${Number(product.price).toFixed(2)}` : ""}.
Tom: ${tone}. Público: praticantes e professores de artes marciais.

Responda APENAS em JSON válido:
{
  "theme": "tema/gancho da postagem em 1 frase",
  "caption": "legenda de Instagram 3-5 linhas com 1-2 emojis e 5 hashtags no final",
  "image_prompt": "prompt em inglês, ultra detalhado, para gerar imagem quadrada 1:1 fotorrealista do produto em cenário de dojo/tatame com iluminação cinematográfica premium, sem texto sobre a imagem"
}`;

  const res = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`AI copy failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  const text = json.choices[0].message.content;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI copy: no JSON in response");
  return JSON.parse(match[0]) as { theme: string; caption: string; image_prompt: string };
}

async function generateImage(apiKey: string, prompt: string): Promise<Uint8Array> {
  const res = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) throw new Error(`AI image failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as {
    choices: Array<{ message: { images?: Array<{ image_url: { url: string } }> } }>;
  };
  const url = json.choices[0].message.images?.[0]?.image_url?.url;
  if (!url) throw new Error("AI image: empty response");
  // Data URL: data:image/png;base64,....
  const b64 = url.split(",")[1] ?? url;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function publishIG(igId: string, token: string, caption: string, imageUrl: string) {
  const c = (await fetch(`${GRAPH}/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
  }).then((r) => r.json())) as { id?: string; error?: { message: string } };
  if (!c.id) throw new Error(c.error?.message || "IG container failed");

  const p = (await fetch(`${GRAPH}/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: c.id, access_token: token }),
  }).then((r) => r.json())) as { id?: string; error?: { message: string } };
  if (!p.id) throw new Error(p.error?.message || "IG publish failed");

  const info = (await fetch(`${GRAPH}/${p.id}?fields=permalink&access_token=${token}`).then((r) => r.json())) as { permalink?: string };
  return { ig_media_id: p.id, ig_permalink: info.permalink ?? null };
}

export const Route = createFileRoute("/api/public/hooks/auto-instagram-post")({
  server: {
    handlers: {
      POST: async () => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return Response.json({ error: "LOVABLE_API_KEY missing" }, { status: 500 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Check settings & schedule
        const { data: settings } = await supabaseAdmin
          .from("auto_post_settings")
          .select("*")
          .eq("singleton", true)
          .maybeSingle();
        if (!settings?.enabled) return Response.json({ skipped: "disabled" });

        const hourUTC = new Date().getUTCHours();
        const hours = (settings.schedule_hours_utc as number[]) ?? [];
        if (!hours.includes(hourUTC)) return Response.json({ skipped: "not scheduled hour", hourUTC });

        // Dedupe: only 1 auto post per hour slot
        const startOfHour = new Date();
        startOfHour.setUTCMinutes(0, 0, 0);
        const { count } = await supabaseAdmin
          .from("scheduled_posts")
          .select("id", { count: "exact", head: true })
          .eq("source", "auto")
          .gte("created_at", startOfHour.toISOString());
        if ((count ?? 0) > 0) return Response.json({ skipped: "already posted this hour" });

        // 2. Get IG connection
        const { data: conn } = await supabaseAdmin
          .from("meta_connections")
          .select("id, page_access_token, instagram_business_account_id, user_id")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!conn?.page_access_token || !conn.instagram_business_account_id) {
          await supabaseAdmin.from("auto_post_settings").update({ last_run_at: new Date().toISOString(), last_status: "failed", last_error: "No active Meta connection" }).eq("singleton", true);
          return Response.json({ error: "No active Meta connection" }, { status: 400 });
        }

        // 3. Pick a product (avoid last 20 used in auto posts)
        const { data: recent } = await supabaseAdmin
          .from("scheduled_posts").select("product_id").eq("source", "auto").not("product_id", "is", null).order("created_at", { ascending: false }).limit(20);
        const excludeIds = (recent ?? []).map((r) => r.product_id).filter(Boolean) as string[];

        let productQuery = supabaseAdmin.from("products").select("id,name,category,price,image_url,description");
        const cats = (settings.categories as string[]) ?? [];
        if (cats.length) productQuery = productQuery.in("category", cats);
        if (excludeIds.length) productQuery = productQuery.not("id", "in", `(${excludeIds.join(",")})`);
        const { data: products } = await productQuery.limit(200);
        const pool = products ?? [];
        if (!pool.length) {
          await supabaseAdmin.from("auto_post_settings").update({ last_run_at: new Date().toISOString(), last_status: "failed", last_error: "No products available" }).eq("singleton", true);
          return Response.json({ error: "No products" }, { status: 400 });
        }
        const product = pool[Math.floor(Math.random() * pool.length)] as Product;

        // 4. Create draft row
        const userId = conn.user_id ?? (await supabaseAdmin.from("auto_post_settings").select("updated_by").eq("singleton", true).maybeSingle()).data?.updated_by;
        const { data: draft, error: draftErr } = await supabaseAdmin
          .from("scheduled_posts")
          .insert({ user_id: userId, caption: "(gerando...)", image_url: product.image_url ?? "pending", product_id: product.id, status: "publishing", source: "auto" })
          .select().single();
        if (draftErr) return Response.json({ error: draftErr.message }, { status: 500 });

        try {
          // 5. Generate copy & image
          const copy = await generateCopy(apiKey, product, (settings.tone as string) || "motivacional");
          const imageBytes = await generateImage(apiKey, copy.image_prompt);

          // 6. Upload to storage
          const path = `auto/${draft.id}.jpg`;
          const upload = await supabaseAdmin.storage.from("ig-media").upload(path, imageBytes, { contentType: "image/jpeg", upsert: true });
          if (upload.error) throw new Error(`Upload: ${upload.error.message}`);
          const signed = await supabaseAdmin.storage.from("ig-media").createSignedUrl(path, 60 * 60);
          if (signed.error || !signed.data?.signedUrl) throw new Error(`Signed URL: ${signed.error?.message}`);

          // 7. Publish
          const result = await publishIG(conn.instagram_business_account_id, conn.page_access_token, copy.caption, signed.data.signedUrl);

          await supabaseAdmin.from("scheduled_posts").update({
            caption: copy.caption,
            image_url: signed.data.signedUrl,
            status: "published",
            ig_media_id: result.ig_media_id,
            ig_permalink: result.ig_permalink,
            published_at: new Date().toISOString(),
          }).eq("id", draft.id);

          await supabaseAdmin.from("auto_post_settings").update({ last_run_at: new Date().toISOString(), last_status: "published", last_error: null }).eq("singleton", true);

          return Response.json({ ok: true, product: product.name, theme: copy.theme, permalink: result.ig_permalink });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await supabaseAdmin.from("scheduled_posts").update({ status: "failed", error: msg }).eq("id", draft.id);
          await supabaseAdmin.from("auto_post_settings").update({ last_run_at: new Date().toISOString(), last_status: "failed", last_error: msg }).eq("singleton", true);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
