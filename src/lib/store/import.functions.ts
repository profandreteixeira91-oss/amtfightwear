import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function parsePriceBR(s: string | number | null | undefined): number | null {
  if (s == null) return null;
  if (typeof s === "number") return s;
  const clean = s.replace(/[^\d,.\-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function firecrawl<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY não configurada");
  const res = await fetch(`${FIRECRAWL_V2}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Firecrawl ${path} [${res.status}]: ${t}`);
  }
  return res.json();
}

export const startCatalogImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: job, error } = await context.supabase
      .from("store_import_jobs")
      .insert({
        source: "amtfightwear.com.br",
        status: "running",
        started_by: context.userId,
      })
      .select()
      .single();
    if (error || !job) throw new Error(error?.message ?? "Erro ao criar job");

    // Kick off in background — don't await
    void runImport(job.id).catch(async (e) => {
      console.error("[import] erro", e);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("store_import_jobs").update({
        status: "failed",
        error_message: e instanceof Error ? e.message : String(e),
      }).eq("id", job.id);
    });

    return { job_id: job.id };
  });

export const getImportJob = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: job } = await context.supabase.from("store_import_jobs").select("*").eq("id", data.id).maybeSingle();
    return job;
  });

async function runImport(jobId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const appendLog = async (msg: string, extra?: Record<string, unknown>) => {
    const { data: cur } = await supabaseAdmin.from("store_import_jobs").select("log").eq("id", jobId).maybeSingle();
    const arr = (cur?.log as unknown[] | null) ?? [];
    arr.push({ t: new Date().toISOString(), msg, ...extra });
    await supabaseAdmin.from("store_import_jobs").update({ log: arr.slice(-200) as never }).eq("id", jobId);
  };

  await appendLog("Iniciando mapeamento do site amtfightwear.com.br");

  // 1) Map site
  type MapResp = { links?: string[]; data?: { links?: string[] } };
  const mapRes = await firecrawl<MapResp>("/map", {
    url: "https://www.amtfightwear.com.br",
    limit: 300,
    includeSubdomains: false,
  });
  const allLinks = mapRes.links ?? mapRes.data?.links ?? [];
  // Product URLs on nuvemshop follow /produto/ or /*-p{id} patterns. Also filter categorias.
  const productUrls = allLinks
    .filter((u) => /amtfightwear\.com\.br/.test(u))
    .filter((u) => /produto|-p\d+|\/kimono|\/rashguard|\/faixa|\/short|\/camiseta/i.test(u))
    .filter((u) => !/carrinho|checkout|conta|login|cadastro|politica|termo|blog/i.test(u))
    .slice(0, 60);

  await appendLog(`Mapeado. ${productUrls.length} URLs candidatas`, { total: productUrls.length });
  await supabaseAdmin.from("store_import_jobs").update({ total_urls: productUrls.length }).eq("id", jobId);

  let succeeded = 0;
  let failed = 0;
  let processed = 0;
  const categoryCache = new Map<string, string>();

  async function ensureCategory(name: string): Promise<string> {
    const slug = slugify(name);
    if (categoryCache.has(slug)) return categoryCache.get(slug)!;
    const { data: existing } = await supabaseAdmin.from("store_categories").select("id").eq("slug", slug).maybeSingle();
    if (existing) {
      categoryCache.set(slug, existing.id);
      return existing.id;
    }
    const { data: created } = await supabaseAdmin
      .from("store_categories")
      .insert({ slug, name, active: true })
      .select("id")
      .single();
    categoryCache.set(slug, created!.id);
    return created!.id;
  }

  for (const url of productUrls) {
    processed++;
    try {
      type ScrapeResp = {
        data?: {
          markdown?: string;
          metadata?: { title?: string; description?: string; ogImage?: string; sourceURL?: string };
          json?: { name?: string; price?: string | number; description?: string; images?: string[]; category?: string; sizes?: string[] };
        };
        markdown?: string;
        metadata?: { title?: string; description?: string; ogImage?: string; sourceURL?: string };
        json?: { name?: string; price?: string | number; description?: string; images?: string[]; category?: string; sizes?: string[] };
      };
      const scraped = await firecrawl<ScrapeResp>("/scrape", {
        url,
        formats: [
          "markdown",
          {
            type: "json",
            prompt:
              "Extraia dados de produto de e-commerce: name (nome do produto), price (preço em BRL, número ou string), description (descrição completa), images (array de URLs de imagens do produto), category (categoria principal, ex: Kimonos, Rashguards, Faixas, Shorts, Camisetas, Acessórios), sizes (array de tamanhos disponíveis, ex: A0, A1, P, M, G).",
          },
        ],
        onlyMainContent: true,
      });

      const payload = scraped.data ?? scraped;
      const json = payload.json ?? {};
      const meta = payload.metadata ?? {};

      const name = (json.name ?? meta.title ?? "").trim();
      if (!name || name.length < 3) {
        failed++;
        await appendLog(`Ignorado (sem nome): ${url}`);
        continue;
      }
      const price = parsePriceBR(json.price ?? null);
      if (price == null) {
        failed++;
        await appendLog(`Ignorado (sem preço): ${name}`);
        continue;
      }

      const categoryName = (json.category ?? "Geral").trim();
      const categoryId = await ensureCategory(categoryName);

      const slug = slugify(name);
      const images = (json.images ?? []).filter((u) => typeof u === "string" && /^https?:\/\//.test(u));
      const primaryImage = images[0] ?? meta.ogImage ?? null;

      // Upsert product by source_url
      const productPatch = {
        name,
        slug,
        price,
        stock: 10,
        status: "active",
        category_id: categoryId,
        image_url: primaryImage,
        short_description: (json.description ?? meta.description ?? "").slice(0, 300),
        description: json.description ?? meta.description ?? null,
        description_html: null,
        source_url: url,
        featured: false,
      };

      const { data: existing } = await supabaseAdmin.from("products").select("id").eq("source_url", url).maybeSingle();
      let productId: string;
      if (existing) {
        productId = existing.id;
        await supabaseAdmin.from("products").update(productPatch).eq("id", productId);
      } else {
        const { data: created, error: ce } = await supabaseAdmin.from("products").insert(productPatch).select("id").single();
        if (ce || !created) throw new Error(ce?.message ?? "insert falhou");
        productId = created.id;
      }

      // Images
      await supabaseAdmin.from("store_product_images").delete().eq("product_id", productId);
      if (images.length > 0) {
        await supabaseAdmin.from("store_product_images").insert(
          images.slice(0, 8).map((u, i) => ({
            product_id: productId,
            url: u,
            sort_order: i,
            is_primary: i === 0,
          })),
        );
      }

      // Variants (sizes)
      const sizes = (json.sizes ?? []).filter((s) => typeof s === "string" && s.length < 20);
      if (sizes.length > 0) {
        await supabaseAdmin.from("store_product_variants").delete().eq("product_id", productId);
        await supabaseAdmin.from("store_product_variants").insert(
          sizes.map((size, i) => ({
            product_id: productId,
            size,
            price,
            stock: 5,
            sort_order: i,
            active: true,
          })),
        );
      }

      succeeded++;
      await appendLog(`✓ ${name}`);
    } catch (e) {
      failed++;
      await appendLog(`✗ ${url}: ${e instanceof Error ? e.message : String(e)}`);
    }

    await supabaseAdmin.from("store_import_jobs").update({ processed, succeeded, failed }).eq("id", jobId);
  }

  await supabaseAdmin.from("store_import_jobs").update({ status: "completed" }).eq("id", jobId);
  await appendLog(`Importação concluída: ${succeeded} sucesso, ${failed} falhas`);
}
