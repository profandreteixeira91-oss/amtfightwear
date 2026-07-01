import { createFileRoute } from "@tanstack/react-router";

const GRAPH = "https://graph.facebook.com/v21.0";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";
const LOGO_PATH = "brand/amt-logo.jpg";

type Product = {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  image_url: string | null;
  description: string | null;
};

type PostType = "post" | "carousel" | "story" | "reel";

type PlanSlot = { hour_utc: number; type: PostType; label?: string };

// ---------- AI: copy ----------
async function generateCopy(
  apiKey: string,
  product: Product,
  tone: string,
  postType: PostType,
) {
  const formatHint =
    postType === "carousel"
      ? "Carrossel de 3 slides. Retorne 'slides' com 3 itens: cada um com 'headline' (curta, ≤ 6 palavras, para virar texto grande na imagem) e 'subline' (opcional, ≤ 8 palavras)."
      : postType === "story"
      ? "Story vertical 9:16. Retorne 'slides' com 1 item: 'headline' (≤ 5 palavras, impactante) e 'subline' (call-to-action curto tipo 'Arrasta pra cima' ou 'Compre agora')."
      : postType === "reel"
      ? "Reels vertical 9:16 estilo capa cinematográfica. Retorne 'slides' com 1 item: 'headline' (≤ 6 palavras, forte) e 'subline' (benefício ou preço)."
      : "Post quadrado 1:1. Retorne 'slides' com 1 item: 'headline' (≤ 6 palavras) e 'subline' (opcional, ≤ 8 palavras).";

  const prompt = `Você é diretor de criação da AMT Fight Wear — marca brasileira premium de kimonos, faixas e patches para Jiu-Jitsu e Judô. Está criando material PUBLICITÁRIO real para vender.

Produto foco: "${product.name}"${product.category ? ` — categoria ${product.category}` : ""}${product.price ? ` — R$ ${Number(product.price).toFixed(2)}` : ""}.
${product.description ? `Descrição: ${product.description.slice(0, 300)}` : ""}

Tom da marca: ${tone}. Público: praticantes, competidores e professores.
Formato de saída: ${formatHint}

Responda APENAS em JSON válido, sem markdown:
{
  "theme": "gancho da campanha em 1 frase",
  "caption": "legenda de Instagram 3-6 linhas, 1-2 emojis, mencione preço se houver, CTA claro (link na bio / DM / site), e finalize com 5-7 hashtags brasileiras de BJJ/Judô",
  "slides": [{ "headline": "...", "subline": "..." }]
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
  const text = json.choices[0].message.content ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI copy: no JSON in response");
  const parsed = JSON.parse(match[0]) as {
    theme: string;
    caption: string;
    slides: Array<{ headline: string; subline?: string }>;
  };
  if (!parsed.slides?.length) throw new Error("AI copy: empty slides");
  return parsed;
}

// ---------- AI: image (uses product photo + AMT logo as references) ----------
async function generateAdImage(
  apiKey: string,
  args: {
    productImageUrl: string;
    logoUrl: string;
    productName: string;
    headline: string;
    subline?: string;
    aspect: "1:1" | "9:16" | "4:5";
    slideIndex: number;
    totalSlides: number;
  },
): Promise<Uint8Array> {
  const { productImageUrl, logoUrl, productName, headline, subline, aspect, slideIndex, totalSlides } = args;

  const aspectPrompt =
    aspect === "9:16"
      ? "vertical 9:16 aspect ratio, full-bleed vertical composition, ideal for Instagram Stories/Reels"
      : aspect === "4:5"
      ? "portrait 4:5 aspect ratio, Instagram feed vertical composition"
      : "square 1:1 aspect ratio, Instagram feed composition";

  const carouselHint =
    totalSlides > 1
      ? `This is slide ${slideIndex + 1} of ${totalSlides} in a carousel — keep composition consistent with a shared design system (same palette, same typography, same logo placement).`
      : "";

  const promptText = `You are producing a REAL premium advertising creative for AMT Fight Wear (Brazilian BJJ/Judo brand).

INPUT IMAGES:
  1) The PRODUCT: "${productName}". This is the exact product being sold — you MUST feature it as the hero of the composition. Do not invent a different product, do not change its colors, patches or shape. Extract it from its background and integrate into a premium editorial scene (dojo, tatami, studio backdrop, dramatic lighting).
  2) The AMT FIGHT WEAR LOGO. Place it visibly in a top corner (small, ~10-12% width), or as a subtle watermark. Do not distort it, do not recolor it.

REQUIRED TEXT OVERLAY (typography must be bold, high-contrast, legible, sans-serif, spelled EXACTLY as given, NO extra words, NO misspellings, NO decorative language you invent):
  HEADLINE: "${headline}"
  ${subline ? `SUBLINE: "${subline}"` : ""}

Style: cinematic advertising photography, high-end sportswear campaign, deep blacks, punchy contrast, premium mood. Include a strong CTA vibe. ${aspectPrompt}. ${carouselHint}

Absolutely no: watermarks other than AMT logo, no stock-photo text, no lorem ipsum, no gibberish text, no extra characters. The only readable text in the image must be the HEADLINE and SUBLINE above.`;

  const res = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image",
      modalities: ["image", "text"],
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: productImageUrl } },
            { type: "image_url", image_url: { url: logoUrl } },
            { type: "text", text: promptText },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI image failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as {
    choices: Array<{ message: { images?: Array<{ image_url: { url: string } }> } }>;
  };
  const url = json.choices[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error("AI image: empty response");
  const b64 = url.split(",")[1] ?? url;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ---------- IG publishing ----------
type SB = Awaited<ReturnType<typeof getAdmin>>;
async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function igContainer(
  igId: string,
  token: string,
  params: Record<string, string | boolean>,
): Promise<string> {
  const body = { ...params, access_token: token };
  const r = (await fetch(`${GRAPH}/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json())) as { id?: string; error?: { message: string } };
  if (!r.id) throw new Error(r.error?.message || "IG container failed");
  return r.id;
}

async function igPublish(igId: string, token: string, creationId: string) {
  const r = (await fetch(`${GRAPH}/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: token }),
  }).then((r) => r.json())) as { id?: string; error?: { message: string } };
  if (!r.id) throw new Error(r.error?.message || "IG publish failed");
  const info = (await fetch(
    `${GRAPH}/${r.id}?fields=permalink&access_token=${token}`,
  ).then((r) => r.json())) as { permalink?: string };
  return { ig_media_id: r.id, ig_permalink: info.permalink ?? null };
}

async function publishSingle(
  igId: string,
  token: string,
  imageUrl: string,
  caption: string,
  mediaType?: "STORIES",
) {
  const params: Record<string, string | boolean> = { image_url: imageUrl, caption };
  if (mediaType) {
    params.media_type = mediaType;
    // stories do not support caption text overlay – IG ignores caption for STORIES
  }
  const cid = await igContainer(igId, token, params);
  return igPublish(igId, token, cid);
}

async function publishCarousel(
  igId: string,
  token: string,
  imageUrls: string[],
  caption: string,
) {
  const childIds: string[] = [];
  for (const url of imageUrls) {
    const cid = await igContainer(igId, token, { image_url: url, is_carousel_item: true });
    childIds.push(cid);
  }
  const parent = await igContainer(igId, token, {
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption,
  });
  return igPublish(igId, token, parent);
}

// ---------- Storage helpers ----------
async function uploadAndSign(
  supabase: SB,
  path: string,
  bytes: Uint8Array,
): Promise<string> {
  const up = await supabase.storage
    .from("ig-media")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (up.error) throw new Error(`Upload: ${up.error.message}`);
  const signed = await supabase.storage.from("ig-media").createSignedUrl(path, 60 * 60 * 6);
  if (signed.error || !signed.data?.signedUrl) throw new Error(`Signed URL: ${signed.error?.message}`);
  return signed.data.signedUrl;
}

async function getLogoSignedUrl(supabase: SB): Promise<string> {
  const signed = await supabase.storage.from("ig-media").createSignedUrl(LOGO_PATH, 60 * 60 * 6);
  if (signed.error || !signed.data?.signedUrl) {
    throw new Error(`Logo URL: ${signed.error?.message || "not found — upload logo to ig-media/brand/amt-logo.jpg"}`);
  }
  return signed.data.signedUrl;
}

// ---------- Route ----------
export const Route = createFileRoute("/api/public/hooks/auto-instagram-post")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const force = url.searchParams.get("force") === "1" || request.headers.get("x-force") === "1";
        const forcedType = url.searchParams.get("type") as PostType | null;
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return Response.json({ error: "LOVABLE_API_KEY missing" }, { status: 500 });

        const supabase = await getAdmin();

        // 1. Settings & scheduling
        const { data: settings } = await supabase
          .from("auto_post_settings")
          .select("*")
          .eq("singleton", true)
          .maybeSingle();
        if (!settings?.enabled && !force) return Response.json({ skipped: "disabled" });

        const now = new Date();
        const hourUTC = now.getUTCHours();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const plan = ((settings as any)?.daily_plan as PlanSlot[] | null) ?? [];
        const slot = plan.find((s) => s.hour_utc === hourUTC);
        const postType: PostType = forcedType ?? slot?.type ?? "post";

        if (!force && !slot) {
          return Response.json({ skipped: "not scheduled hour", hourUTC });
        }

        // Dedupe: only 1 auto post per hour slot
        if (!force) {
          const startOfHour = new Date();
          startOfHour.setUTCMinutes(0, 0, 0);
          const { count } = await supabase
            .from("scheduled_posts")
            .select("id", { count: "exact", head: true })
            .eq("source", "auto")
            .gte("created_at", startOfHour.toISOString());
          if ((count ?? 0) > 0) return Response.json({ skipped: "already posted this hour" });
        }

        // 2. IG connection
        const { data: conn } = await supabase
          .from("meta_connections")
          .select("id, page_access_token, instagram_business_account_id, user_id")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!conn?.page_access_token || !conn.instagram_business_account_id) {
          await supabase.from("auto_post_settings").update({
            last_run_at: new Date().toISOString(), last_status: "failed", last_error: "No active Meta connection",
          }).eq("singleton", true);
          return Response.json({ error: "No active Meta connection" }, { status: 400 });
        }

        // 3. Pick a product (must have image_url — we require the real product photo)
        const { data: recent } = await supabase
          .from("scheduled_posts")
          .select("product_id").eq("source", "auto").not("product_id", "is", null)
          .order("created_at", { ascending: false }).limit(30);
        const excludeIds = (recent ?? []).map((r) => r.product_id).filter(Boolean) as string[];

        let productQuery = supabase.from("products").select("id,name,category,price,image_url,description").not("image_url", "is", null);
        const cats = (settings?.categories as string[] | null) ?? [];
        if (cats.length) productQuery = productQuery.in("category", cats);
        if (excludeIds.length) productQuery = productQuery.not("id", "in", `(${excludeIds.join(",")})`);
        const { data: products } = await productQuery.limit(200);
        const pool = products ?? [];
        if (!pool.length) {
          await supabase.from("auto_post_settings").update({
            last_run_at: new Date().toISOString(), last_status: "failed", last_error: "No products with image available",
          }).eq("singleton", true);
          return Response.json({ error: "No products with image_url" }, { status: 400 });
        }
        const product = pool[Math.floor(Math.random() * pool.length)] as Product;
        if (!product.image_url) throw new Error("product.image_url null");

        // 4. Draft row
        const userId =
          conn.user_id ??
          (await supabase.from("auto_post_settings").select("updated_by").eq("singleton", true).maybeSingle()).data?.updated_by;
        const { data: draft, error: draftErr } = await supabase
          .from("scheduled_posts")
          .insert({
            user_id: userId,
            caption: "(gerando...)",
            image_url: product.image_url,
            product_id: product.id,
            status: "publishing",
            source: "auto",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            post_type: postType as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
          .select().single();
        if (draftErr) return Response.json({ error: draftErr.message }, { status: 500 });

        try {
          // 5. Copy + creatives
          const copy = await generateCopy(apiKey, product, (settings?.tone as string | null) || "motivacional publicitário", postType);
          const logoUrl = await getLogoSignedUrl(supabase);

          const aspect: "1:1" | "9:16" | "4:5" =
            postType === "story" ? "9:16" : postType === "reel" ? "9:16" : postType === "carousel" ? "1:1" : "1:1";

          const slides = postType === "carousel" ? copy.slides.slice(0, 3) : copy.slides.slice(0, 1);

          const uploadedUrls: string[] = [];
          for (let i = 0; i < slides.length; i++) {
            const s = slides[i];
            const bytes = await generateAdImage(apiKey, {
              productImageUrl: product.image_url,
              logoUrl,
              productName: product.name,
              headline: s.headline,
              subline: s.subline,
              aspect,
              slideIndex: i,
              totalSlides: slides.length,
            });
            const path = `auto/${draft.id}-${i}.jpg`;
            const signedUrl = await uploadAndSign(supabase, path, bytes);
            uploadedUrls.push(signedUrl);
          }

          // 6. Publish per type
          let result: { ig_media_id: string; ig_permalink: string | null };
          if (postType === "carousel" && uploadedUrls.length > 1) {
            result = await publishCarousel(conn.instagram_business_account_id, conn.page_access_token, uploadedUrls, copy.caption);
          } else if (postType === "story") {
            result = await publishSingle(conn.instagram_business_account_id, conn.page_access_token, uploadedUrls[0], copy.caption, "STORIES");
          } else {
            // 'post' and 'reel' (reel published as vertical feed image — real video generation requires video model integration)
            result = await publishSingle(conn.instagram_business_account_id, conn.page_access_token, uploadedUrls[0], copy.caption);
          }

          await supabase.from("scheduled_posts").update({
            caption: copy.caption,
            image_url: uploadedUrls[0],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            carousel_urls: uploadedUrls as any,
            status: "published",
            ig_media_id: result.ig_media_id,
            ig_permalink: result.ig_permalink,
            published_at: new Date().toISOString(),
          }).eq("id", draft.id);

          await supabase.from("auto_post_settings").update({
            last_run_at: new Date().toISOString(), last_status: "published", last_error: null,
          }).eq("singleton", true);

          return Response.json({
            ok: true, type: postType, product: product.name, theme: copy.theme,
            slides: slides.length, permalink: result.ig_permalink,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await supabase.from("scheduled_posts").update({ status: "failed", error: msg }).eq("id", draft.id);
          await supabase.from("auto_post_settings").update({
            last_run_at: new Date().toISOString(), last_status: "failed", last_error: msg,
          }).eq("singleton", true);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
