import { createFileRoute } from "@tanstack/react-router";
import { checkInternalHookAuth } from "@/lib/security/hook-auth";

const GRAPH = "https://graph.facebook.com/v21.0";

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

// Content angles — rotated so the feed is variado (nunca "só produto X").
type ContentAngle =
  | "motivational"        // frase de guerra / mentalidade vencedora
  | "brand_story"         // apresentação da marca / valores / bastidores
  | "product_line"        // apresentação de uma LINHA (Adulto, Kids, Judô, Faixas, Patches)
  | "product_spotlight"   // 1 produto em destaque
  | "athlete_lifestyle"   // atleta / treino / dojo / rotina
  | "community";          // família do Jiu-Jitsu, respeito, pertencimento

type PlanSlot = { hour_utc: number; type: PostType; label?: string };

// ============================================================================
// BRAND IDENTITY BRIEF — reused em TODA geração (copy + arte).
// Etapas 2, 5, 9, 10, 11 do briefing do cliente.
// ============================================================================
const BRAND_BRIEF = `
MARCA: AMT Fight Wear — kimonos, faixas e patches premium para Jiu-Jitsu e Judô (Brasil).

POSICIONAMENTO
- Público: praticantes, competidores, professores e famílias do Jiu-Jitsu/Judô (17-45 anos, também kids).
- Estilo de vida: treino pesado, disciplina, dojo, família da arte suave, competição.
- Objetivo do cliente: performance real no tatame + orgulho de vestir a marca fora dele.
- Valores: alta performance, qualidade premium, resistência, conforto, exclusividade, atitude, mentalidade vencedora, disciplina, treino pesado, respeito, superação, comunidade.
- Personalidade: forte, técnica, respeitosa, brasileira, direta, sem frescura fitness-wellness.

COMUNICAÇÃO transmite: força, disciplina, performance, superação, lifestyle marcial, treinamento, competição, pertencimento.

TOM DE VOZ (Etapa 4)
- Legenda média: 3-6 linhas. Frases curtas, impacto, ritmo.
- 1 a 3 emojis MÁXIMO (🥋 🔥 🖤 ⚔️ 🤍). Nada de emoji-spam.
- 5-8 hashtags brasileiras de BJJ/Judô no fim. Misture nicho + amplas: #jiujitsu #jiujitsubrasileiro #bjj #judo #artesuave #kimono #faixapreta #tatame #amtfightwear.
- CTA claro (link na bio / DM / site www.amtfightwear.com.br). Nunca terminar sem CTA.

GANCHOS (Etapa 5) — sempre criar VARIAÇÕES novas, nunca repetir literalmente:
"Novo lançamento.", "Você pediu.", "Chegou.", "A evolução continua.", "Treine como um campeão.",
"Quem vive o Jiu-Jitsu entende.", "Performance sem limites.", "Mais resistência. Mais conforto. Mais mobilidade.",
"Faixa não define. Atitude sim.", "O tatame não perdoa. O kimono também não.", "Nascido pra treino pesado.",
"Feito pra quem não desiste.". Invente novos no mesmo espírito.

COPYWRITING (Etapa 9): use AIDA, PAS, storytelling curto, marketing esportivo/emocional, autoridade, prova social, comunidade, urgência quando fizer sentido. Nunca clichê corporativo.

IDENTIDADE PERMANENTE (Etapa 10): toda peça transmite alta performance, premium, resistência, conforto, exclusividade, atitude, mentalidade vencedora, disciplina, treino pesado, competição, família do Jiu-Jitsu, luta, respeito, superação.

REGRAS DE MARCA (não negociáveis):
- NUNCA privilegiar uma única cor de faixa (branca, azul, roxa, marrom, preta). Rotacionar. Preferir composições neutras/pretas quando não houver produto específico.
- NUNCA gerar posts repetitivos "só sobre 1 produto". Varie o ângulo (motivacional, marca, linha, atleta, comunidade, produto).
- Textos SEM erros de português. Nada de "engrish" ou gibberish em imagem.
`.trim();

// Etapa 11 — Direção de arte reutilizada.
const ART_DIRECTION = `
DIREÇÃO DE ARTE (obrigatória em toda arte):
- Estilo: fotografia publicitária premium de sportswear marcial, cinematográfica, editorial.
- Paleta AMT: preto profundo #0A0A0A, off-white #F5F1E8, cinza carvão #1F1F1F, dourado desaturado #B08D57 usado com moderação. Vermelho sangue #7A1A1A somente como acento. NUNCA um post inteiro dominado por uma cor de faixa.
- Iluminação: chiaroscuro forte, key light lateral dura, sombras densas, rim light. Mood dojo/estúdio.
- Contraste alto, blacks esmagados, highlights controlados. Grão fílmico sutil.
- Composição: regra dos terços, muito respiro negativo, hierarquia clara (imagem > headline > subline > logo).
- Enquadramento: close editorial ou wide dramático, nunca chapado/e-commerce.
- Profundidade: bokeh sutil no fundo, primeiro plano nítido.
- Texturas: tecido do kimono, tatame, corda de ringue, concreto, aço escovado.
- Tipografia: sans-serif condensada, bold/black, uppercase, tracking apertado. Legível a 20% de zoom. SEM serifas decorativas, SEM script.
- Elementos gráficos: linhas finas geométricas, cantos chanfrados, faixas diagonais discretas, molduras minimalistas. NUNCA emojis, badges cartunescos, gradientes arco-íris, glitters.
- Logo AMT: canto superior, ~10-12% de largura, monocromático branco ou dourado. Nunca distorcido.
- Efeitos: leve granulação, halação sutil em highlights, vinheta discreta. NÃO usar filtros vintage/sépia.
- Alta resolução, nítida, pronta para feed do Instagram.
`.trim();

// Estrutura de carrossel (Etapa 6): 7 slides — Título, Problema, Solução, Benefícios, Prova, Produto, CTA.
const CAROUSEL_STRUCTURE = `
ESTRUTURA DE CARROSSEL (7 slides — siga a ordem):
  Slide 1: HOOK / título forte (≤6 palavras).
  Slide 2: PROBLEMA (dor do praticante — kimono rasga, encolhe, incomoda, faixa desbota).
  Slide 3: SOLUÇÃO (o que a AMT resolve).
  Slide 4: BENEFÍCIOS (3 bullets curtos: resistência, conforto, mobilidade — varie).
  Slide 5: PROVA (atletas, dojos parceiros, materiais, testes, "milhares treinam com AMT").
  Slide 6: PRODUTO (destaque visual + preço se houver).
  Slide 7: CTA (compre no site www.amtfightwear.com.br / link na bio).
`.trim();

// ---------- AI: copy ----------
async function generateCopy(
  _apiKey: string,
  angle: ContentAngle,
  product: Product | null,
  tone: string,
  postType: PostType,
) {
  const nSlides = postType === "carousel" ? 7 : 1;

  const formatHint =
    postType === "carousel"
      ? `Carrossel de 7 slides no formato quadrado 1:1. ${CAROUSEL_STRUCTURE}\nRetorne 'slides' com 7 itens. Cada um: 'headline' (≤ 6 palavras, VIRA texto grande na imagem) e 'subline' (≤ 10 palavras, opcional).`
      : postType === "story"
      ? "Story vertical 9:16. Retorne 'slides' com 1 item: 'headline' (≤ 5 palavras, impactante) e 'subline' (CTA curto: 'Arrasta pra cima', 'Compre agora', 'Link na bio')."
      : postType === "reel"
      ? "Capa de Reels vertical 9:16, cinematográfica. Retorne 'slides' com 1 item: 'headline' (≤ 6 palavras, forte, gera curiosidade) e 'subline' (benefício ou CTA)."
      : "Post quadrado 1:1. Retorne 'slides' com 1 item: 'headline' (≤ 6 palavras) e 'subline' (≤ 10 palavras, opcional).";

  const angleBrief: Record<ContentAngle, string> = {
    motivational:
      "Post MOTIVACIONAL puro. Foco em mentalidade, disciplina, superação, mindset de faixa preta. NÃO empurrar produto específico. Fundo de dojo, atleta, tatame, sombra dramática. Headline curta tipo mantra.",
    brand_story:
      "Post de APRESENTAÇÃO DA MARCA agregando valor. Fale de origem, propósito, qualidade obsessiva, comunidade AMT, quem somos. Sem preço, sem produto específico — a marca é a estrela.",
    product_line:
      "Post apresentando uma LINHA da AMT (Kimonos Adulto, Kids, Judô, Faixas, Patches) — NUNCA um único produto. Fale da linha como sistema, quem serve, o que resolve.",
    product_spotlight: product
      ? `Post com PRODUTO em destaque: "${product.name}"${product.category ? ` (${product.category})` : ""}${product.price ? ` — R$ ${Number(product.price).toFixed(2)}` : ""}. ${product.description ? "Descrição do catálogo: " + product.description.slice(0, 300) : ""} O produto é herói da composição.`
      : "Sem produto disponível — trate como brand_story.",
    athlete_lifestyle:
      "Post estilo ATLETA / LIFESTYLE. Cena de treino, dojo, bastidor, rotina de competidor. Emocional. Sem foco em SKU.",
    community:
      "Post sobre COMUNIDADE / FAMÍLIA DO JIU-JITSU. Respeito, hierarquia, mestres e alunos, pertencimento. Coletivo, não individual.",
  };

  const prompt = `${BRAND_BRIEF}

TAREFA: gerar o conteúdo (copy + microtextos das artes) para UMA publicação no Instagram da AMT Fight Wear.

ÂNGULO DESTE POST: ${angle.toUpperCase()}
${angleBrief[angle]}

Tom desejado: ${tone}.
FORMATO: ${postType.toUpperCase()}
${formatHint}

Responda APENAS com JSON válido, sem markdown, sem comentários:
{
  "theme": "resumo do gancho em 1 frase",
  "art_prompt_extra": "1-2 frases descrevendo a cena/composição/mood específicos DESTA arte (será somado à direção de arte da marca). Nunca cite cores de faixa específicas dominando toda a arte.",
  "caption": "Legenda pronta para Instagram: 3-6 linhas, 1-3 emojis no máximo, tom brasileiro forte, aplicar copywriting (AIDA/PAS/prova/urgência quando cabível), SEMPRE terminar com CTA (link na bio / www.amtfightwear.com.br) e 5-8 hashtags relevantes no fim.",
  "slides": [ ${Array.from({ length: nSlides }, () => `{ "headline": "...", "subline": "..." }`).join(", ")} ]
}`;

  const { openrouterChat } = await import("@/lib/ai-gateway.server");
  const text = await openrouterChat({
    messages: [{ role: "user", content: prompt }],
    json: true,
  });
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Gemini copy: no JSON in response");
  const parsed = JSON.parse(match[0]) as {
    theme: string;
    art_prompt_extra?: string;
    caption: string;
    slides: Array<{ headline: string; subline?: string }>;
  };
  if (!parsed.slides?.length) throw new Error("Gemini copy: empty slides");
  return parsed;
}

// ---------- AI: image (OpenAI gpt-image-1 via /v1/images/edits) ----------
async function fetchAsBlob(url: string): Promise<Blob> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Falha ao baixar imagem de referência: ${r.status}`);
  const mime = r.headers.get("content-type")?.split(";")[0] || "image/png";
  const buf = await r.arrayBuffer();
  return new Blob([buf], { type: mime });
}

async function generateAdImage(
  apiKey: string,
  args: {
    angle: ContentAngle;
    productImageUrl: string | null;
    logoUrl: string;
    productName: string | null;
    headline: string;
    subline?: string;
    aspect: "1:1" | "9:16" | "4:5";
    slideIndex: number;
    totalSlides: number;
    artExtra: string;
  },
): Promise<Uint8Array> {
  const { angle, productImageUrl, logoUrl, productName, headline, subline, aspect, slideIndex, totalSlides, artExtra } = args;

  const aspectPrompt =
    aspect === "9:16"
      ? "vertical 9:16 full-bleed composition, Instagram Stories/Reels frame"
      : aspect === "4:5"
      ? "portrait 4:5 Instagram feed frame"
      : "square 1:1 Instagram feed frame";

  const carouselHint =
    totalSlides > 1
      ? `Slide ${slideIndex + 1} of ${totalSlides} — MUST share the same visual system with the other slides (identical palette, typography, logo placement, treatment). Consistency > novelty.`
      : "";

  const productBlock = productImageUrl
    ? `INPUT IMAGE #1 — THE REAL PRODUCT: "${productName ?? ""}". Extract it faithfully (do not change its cut, patches, colors) and integrate as hero of the scene.`
    : "No product image provided — do NOT invent a fake product. Compose a strong editorial scene (dojo, tatami, athlete silhouette, textured backdrop) with typography as the main visual.";

  const productRule =
    angle === "product_spotlight" || angle === "product_line"
      ? "The product must be visible and premium-styled."
      : "Do NOT force a product into the scene. Prioritize mood, athlete presence, typography and dojo textures.";

  const promptText = `${BRAND_BRIEF}

${ART_DIRECTION}

CONTEXT: single Instagram creative for AMT Fight Wear.
CONTENT ANGLE: ${angle}. ${productRule}
${artExtra ? "SCENE INTENT: " + artExtra : ""}

${productBlock}
INPUT IMAGE ${productImageUrl ? "#2" : "#1"} — AMT LOGO: place small (~10-12% width) in a top corner, monochrome white or muted gold. Never distorted, never recolored rainbow.

TEXT OVERLAY (must be spelled EXACTLY, no extra words, no misspellings, no lorem ipsum, no gibberish, no watermarks besides AMT logo):
  HEADLINE: "${headline}"
  ${subline ? `SUBLINE: "${subline}"` : ""}

Frame: ${aspectPrompt}. ${carouselHint}

HARD RULES:
- The ONLY readable text in the image is the HEADLINE and SUBLINE above.
- NEVER dominate the composition with a single belt color (white/blue/purple/brown/black belt). Rotate, prefer neutral/black moods.
- High resolution, sharp, publish-ready.`;

  // gpt-image-1 sizes: 1024x1024, 1024x1536, 1536x1024.
  const size =
    aspect === "9:16" || aspect === "4:5" ? "1024x1536" : "1024x1024";

  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("prompt", promptText);
  form.append("size", size);
  form.append("n", "1");

  if (productImageUrl) {
    const productBlob = await fetchAsBlob(productImageUrl);
    form.append("image[]", productBlob, "product.png");
  }
  const logoBlob = await fetchAsBlob(logoUrl);
  form.append("image[]", logoBlob, "logo.png");

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`OpenAI image failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as {
    data?: Array<{ b64_json?: string }>;
  };
  const b64 = json.data?.[0]?.b64_json ?? "";
  if (!b64) throw new Error("OpenAI image: empty response");
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

// Poll container status until FINISHED. Obrigatório para STORIES / CAROUSEL / REELS.
async function waitForContainer(token: string, containerId: string, maxMs = 60_000): Promise<void> {
  const started = Date.now();
  let delay = 1500;
  while (Date.now() - started < maxMs) {
    const r = (await fetch(
      `${GRAPH}/${containerId}?fields=status_code,status&access_token=${token}`,
    ).then((r) => r.json())) as { status_code?: string; status?: string; error?: { message: string } };
    if (r.error) throw new Error(`Container status: ${r.error.message}`);
    if (r.status_code === "FINISHED") return;
    if (r.status_code === "ERROR" || r.status_code === "EXPIRED") {
      throw new Error(`Container ${r.status_code}: ${r.status ?? ""}`);
    }
    await new Promise((res) => setTimeout(res, delay));
    delay = Math.min(delay + 500, 4000);
  }
  throw new Error("Container timeout waiting for FINISHED");
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
  if (mediaType) params.media_type = mediaType;
  const cid = await igContainer(igId, token, params);
  if (mediaType === "STORIES") await waitForContainer(token, cid);
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
  for (const cid of childIds) await waitForContainer(token, cid);
  const parent = await igContainer(igId, token, {
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption,
  });
  await waitForContainer(token, parent);
  return igPublish(igId, token, parent);
}

// ---------- Storage helpers ----------
async function uploadAndSign(supabase: SB, path: string, bytes: Uint8Array): Promise<string> {
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

// ---------- Angle rotation ----------
async function pickAngle(supabase: SB, postType: PostType): Promise<ContentAngle> {
  // Distribuição-alvo por tipo (variar o feed).
  const pool: ContentAngle[] =
    postType === "carousel"
      ? ["product_line", "product_spotlight", "brand_story"] // carrosséis funcionam bem com estrutura de venda
      : postType === "story"
      ? ["motivational", "athlete_lifestyle", "community", "product_spotlight"]
      : postType === "reel"
      ? ["motivational", "athlete_lifestyle", "product_line"]
      : ["motivational", "brand_story", "product_line", "product_spotlight", "athlete_lifestyle", "community"];

  // Evita repetir o mesmo ângulo dos últimos 5 posts.
  const { data: recent } = await supabase
    .from("scheduled_posts")
    .select("theme")
    .eq("source", "auto")
    .order("created_at", { ascending: false })
    .limit(5);
  const recentThemes = new Set((recent ?? []).map((r) => (r as { theme?: string }).theme).filter(Boolean));
  const fresh = pool.filter((a) => !recentThemes.has(a));
  const finalPool = fresh.length ? fresh : pool;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

// ---------- Route ----------
export const Route = createFileRoute("/api/public/hooks/auto-instagram-post")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = checkInternalHookAuth(request);
        if (denied) return denied;

        const url = new URL(request.url);
        const force = url.searchParams.get("force") === "1" || request.headers.get("x-force") === "1";
        const forcedType = url.searchParams.get("type") as PostType | null;
        const forcedAngle = url.searchParams.get("angle") as ContentAngle | null;
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return Response.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });


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

        if (!force && !slot) return Response.json({ skipped: "not scheduled hour", hourUTC });

        // Dedupe: 1 auto post por slot/hora
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

        // 3. Escolha do ângulo (variação garantida)
        const angle: ContentAngle = forcedAngle ?? (await pickAngle(supabase, postType));

        // 4. Produto: obrigatório para spotlight/line; opcional/nenhum para os outros
        let product: Product | null = null;
        const needsProduct = angle === "product_spotlight" || angle === "product_line";
        if (needsProduct) {
          const { data: recent } = await supabase
            .from("scheduled_posts")
            .select("product_id").eq("source", "auto").not("product_id", "is", null)
            .order("created_at", { ascending: false }).limit(30);
          const excludeIds = (recent ?? []).map((r) => r.product_id).filter(Boolean) as string[];
          let q = supabase.from("products").select("id,name,category,price,image_url,description").not("image_url", "is", null);
          const cats = (settings?.categories as string[] | null) ?? [];
          if (cats.length) q = q.in("category", cats);
          if (excludeIds.length) q = q.not("id", "in", `(${excludeIds.join(",")})`);
          const { data: products } = await q.limit(200);
          const pool = products ?? [];
          if (pool.length) product = pool[Math.floor(Math.random() * pool.length)] as Product;
        }

        // 5. Draft row
        const userId =
          conn.user_id ??
          (await supabase.from("auto_post_settings").select("updated_by").eq("singleton", true).maybeSingle()).data?.updated_by;
        const { data: draft, error: draftErr } = await supabase
          .from("scheduled_posts")
          .insert({
            user_id: userId,
            caption: "(gerando...)",
            image_url: product?.image_url ?? "",
            product_id: product?.id ?? null,
            theme: angle,
            status: "publishing",
            source: "auto",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            post_type: postType as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
          .select().single();
        if (draftErr) return Response.json({ error: draftErr.message }, { status: 500 });

        try {
          // 6. Copy + creatives
          const copy = await generateCopy(
            apiKey,
            angle,
            product,
            (settings?.tone as string | null) || "forte, direto, brasileiro, marcial",
            postType,
          );
          const logoUrl = await getLogoSignedUrl(supabase);

          // REEL sem vídeo não é publicável pela Graph API (exige video_url).
          // Para não travar o piloto automático, publicamos como post de feed 4:5 (vertical, cinematográfico).
          const effectiveType: PostType = postType === "reel" ? "post" : postType;

          const aspect: "1:1" | "9:16" | "4:5" =
            effectiveType === "story" ? "9:16" : postType === "reel" ? "4:5" : "1:1";

          const slides =
            effectiveType === "carousel" ? copy.slides.slice(0, 7) : copy.slides.slice(0, 1);

          const uploadedUrls: string[] = [];
          for (let i = 0; i < slides.length; i++) {
            const s = slides[i];
            const bytes = await generateAdImage(apiKey, {
              angle,
              productImageUrl: product?.image_url ?? null,
              logoUrl,
              productName: product?.name ?? null,
              headline: s.headline,
              subline: s.subline,
              aspect,
              slideIndex: i,
              totalSlides: slides.length,
              artExtra: copy.art_prompt_extra ?? "",
            });
            const path = `auto/${draft.id}-${i}.jpg`;
            const signedUrl = await uploadAndSign(supabase, path, bytes);
            uploadedUrls.push(signedUrl);
          }

          // 7. Publish
          let result: { ig_media_id: string; ig_permalink: string | null };
          if (effectiveType === "carousel" && uploadedUrls.length > 1) {
            result = await publishCarousel(conn.instagram_business_account_id, conn.page_access_token, uploadedUrls, copy.caption);
          } else if (effectiveType === "story") {
            result = await publishSingle(conn.instagram_business_account_id, conn.page_access_token, uploadedUrls[0], copy.caption, "STORIES");
          } else {
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
            ok: true,
            type: postType,
            angle,
            product: product?.name ?? null,
            theme: copy.theme,
            slides: slides.length,
            permalink: result.ig_permalink,
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
