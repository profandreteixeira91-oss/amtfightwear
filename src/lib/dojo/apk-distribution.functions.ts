import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const APK_BUCKET = "dojo-apk";

export type ApkVersion = {
  id: string;
  version_name: string;
  build_code: number;
  file_name: string;
  file_size: number;
  release_notes: string | null;
  is_published: boolean;
  downloads: number;
  created_at: string;
};

// ------- Admin: list all versions -------
export const listApkVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ApkVersion[]> => {
    const { data, error } = await context.supabase
      .from("dojo_app_apk_versions")
      .select("id, version_name, build_code, file_name, file_size, release_notes, is_published, downloads, created_at")
      .order("build_code", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ApkVersion[];
  });

// ------- Admin: publish/unpublish -------
export const setApkPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"), published: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    if (data.published) {
      // Só uma versão publicada por dono — despublica todas as outras
      await context.supabase
        .from("dojo_app_apk_versions")
        .update({ is_published: false })
        .eq("owner_id", context.userId)
        .neq("id", data.id);
    }
    const { error } = await context.supabase
      .from("dojo_app_apk_versions")
      .update({ is_published: data.published })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ------- Admin: delete -------
export const deleteApkVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error: rErr } = await context.supabase
      .from("dojo_app_apk_versions")
      .select("file_path")
      .eq("id", data.id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!row) throw new Error("Versão não encontrada");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from(APK_BUCKET).remove([row.file_path]);
    const { error } = await context.supabase.from("dojo_app_apk_versions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ------- Admin: signed URL para o próprio dono baixar/testar -------
export const getApkSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("dojo_app_apk_versions")
      .select("file_path, file_name")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Versão não encontrada");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from(APK_BUCKET)
      .createSignedUrl(row.file_path, 60 * 10, { download: row.file_name });
    if (sErr || !signed) throw new Error(sErr?.message ?? "Falha ao gerar link");
    return { url: signed.signedUrl };
  });

// ------- Admin: URL pública configurável -------
export const setAcademyPublicUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        public_url: z
          .string()
          .trim()
          .max(200)
          .refine((v) => v === "" || /^https:\/\/[^\s/$.?#].[^\s]*$/i.test(v), "URL inválida (use https://...)"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const value = data.public_url.trim() || null;
    const { error } = await context.supabase
      .from("dojo_academy_profile")
      .update({ public_url: value })
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const, public_url: value };
  });

export const getAcademyPublicUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_academy_profile")
      .select("public_url, slug")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as { public_url: string | null; slug: string | null } | null) ?? { public_url: null, slug: null };
  });

// ------- Público: metadata da última versão publicada por slug -------
const SlugSchema = z.object({ slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/) });

export type PublicApkInfo = {
  version_name: string;
  build_code: number;
  file_size: number;
  release_notes: string | null;
  created_at: string;
} | null;

export const getPublicApkInfoBySlug = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => SlugSchema.parse(i))
  .handler(async ({ data }): Promise<PublicApkInfo> => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient(url, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input as any, { ...init, headers: h });
        },
      },
    });
    const { data: rows, error } = await client.rpc("get_latest_apk_by_slug", { _slug: data.slug });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return null;
    return {
      version_name: row.version_name,
      build_code: row.build_code,
      file_size: Number(row.file_size),
      release_notes: row.release_notes,
      created_at: row.created_at,
    };
  });
