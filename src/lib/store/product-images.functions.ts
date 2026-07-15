import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "product-images";
const BATCH_SIZE = 25;

function extFromContentType(ct: string | null, url: string): string {
  if (ct?.includes("webp")) return "webp";
  if (ct?.includes("png")) return "png";
  if (ct?.includes("gif")) return "gif";
  if (ct?.includes("jpeg") || ct?.includes("jpg")) return "jpg";
  const u = url.toLowerCase().split("?")[0];
  const m = u.match(/\.(jpe?g|png|webp|gif|avif)$/i);
  return m ? m[1].replace("jpeg", "jpg") : "jpg";
}

/** Returns counts of migrated vs pending product images. */
export const getProductImageStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count: total } = await supabaseAdmin
      .from("store_product_images")
      .select("id", { count: "exact", head: true });

    const { count: migrated } = await supabaseAdmin
      .from("store_product_images")
      .select("id", { count: "exact", head: true })
      .like("url", "%/storage/v1/object/public/product-images/%");

    const { count: pending } = await supabaseAdmin
      .from("store_product_images")
      .select("id", { count: "exact", head: true })
      .not("url", "like", "%/storage/v1/object/public/product-images/%");

    // sanity: keep supabase referenced (RLS-check)
    await supabase.from("store_product_images").select("id", { head: true, count: "estimated" }).limit(1);

    return {
      total: total ?? 0,
      migrated: migrated ?? 0,
      pending: pending ?? 0,
    };
  });

const migrateInput = z.object({ limit: z.number().int().min(1).max(50).optional() });

/** Migrates a batch of external image URLs to Storage. Idempotent / re-entrant. */
export const migrateProductImagesBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => migrateInput.parse(v))
  .handler(async ({ data }) => {
    const limit = data.limit ?? BATCH_SIZE;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("store_product_images")
      .select("id, product_id, url")
      .not("url", "like", "%/storage/v1/object/public/product-images/%")
      .limit(limit);
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) {
      return { processed: 0, ok: 0, failed: 0, results: [] as Array<{ id: string; ok: boolean; error?: string }> };
    }

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];
    let ok = 0;
    let failed = 0;

    // Try fetching the URL. If Tiendanube's resized variant (e.g. "-1024-0.webp")
    // returns 403, fall back to the original by stripping the size suffix and
    // trying common extensions.
    async function fetchImage(originalUrl: string): Promise<{ buf: ArrayBuffer; contentType: string; ext: string }> {
      const attempts: string[] = [originalUrl];
      const m = originalUrl.match(/^(.*?)-\d+-\d+\.(webp|jpe?g|png|gif|avif)(\?.*)?$/i);
      if (m) {
        const base = m[1];
        for (const ext of ["png", "jpg", "jpeg", "webp"]) {
          const candidate = `${base}.${ext}`;
          if (!attempts.includes(candidate)) attempts.push(candidate);
        }
      }
      let lastErr = "";
      for (const u of attempts) {
        const r = await fetch(u, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; LovableImageMigrator/1.0)",
            "Accept": "image/webp,image/avif,image/*,*/*;q=0.8",
          },
        });
        if (r.ok) {
          const ct = r.headers.get("content-type") ?? "image/jpeg";
          return { buf: await r.arrayBuffer(), contentType: ct, ext: extFromContentType(ct, u) };
        }
        lastErr = `fetch ${r.status}`;
      }
      throw new Error(lastErr || "fetch failed");
    }

    for (const row of rows) {
      try {
        if (!row.url || !/^https?:\/\//i.test(row.url)) {
          throw new Error("URL inválida");
        }
        const { buf, contentType, ext } = await fetchImage(row.url);
        const path = `${row.product_id}/${row.id}.${ext}`;

        const { error: upErr } = await supabaseAdmin.storage
          .from(BUCKET)
          .upload(path, buf, { contentType, upsert: true });
        if (upErr) throw new Error(upErr.message);


        const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
        const newUrl = pub.publicUrl;

        const { error: updErr } = await supabaseAdmin
          .from("store_product_images")
          .update({ url: newUrl })
          .eq("id", row.id);
        if (updErr) throw new Error(updErr.message);

        // Also update products.image_url if it matches the old URL
        await supabaseAdmin
          .from("products")
          .update({ image_url: newUrl })
          .eq("id", row.product_id)
          .eq("image_url", row.url);

        ok++;
        results.push({ id: row.id, ok: true });
      } catch (err) {
        failed++;
        results.push({
          id: row.id,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { processed: rows.length, ok, failed, results };
  });
