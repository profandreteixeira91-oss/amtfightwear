import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeConfig, DEFAULT_CONFIG, type StudentAppConfig } from "./schema";

// ============================================================
// Admin (owner da academia): gerenciar rascunho e publicar
// ============================================================

export const adminGetStudentAppConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("dojo_student_app_config")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      return {
        version: 0,
        config: DEFAULT_CONFIG,
        draft: DEFAULT_CONFIG,
        has_unpublished_changes: false,
        published_at: null as string | null,
        updated_at: null as string | null,
      };
    }
    return {
      version: data.version,
      config: normalizeConfig(data.config),
      draft: normalizeConfig(data.draft ?? data.config),
      has_unpublished_changes: !!data.has_unpublished_changes,
      published_at: data.published_at,
      updated_at: data.updated_at,
    };
  });

export const adminSaveDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { draft: StudentAppConfig }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const draft = normalizeConfig(data.draft);
    const { data: existing } = await supabase
      .from("dojo_student_app_config")
      .select("owner_id, config, version")
      .eq("owner_id", userId)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase.from("dojo_student_app_config").insert({
        owner_id: userId,
        version: 0,
        config: DEFAULT_CONFIG,
        draft,
        has_unpublished_changes: true,
      });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("dojo_student_app_config")
        .update({ draft, has_unpublished_changes: true })
        .eq("owner_id", userId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminPublishConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { label?: string | null }) => input ?? { label: null })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("dojo_student_app_config")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!existing) throw new Error("Nada para publicar");

    const next = normalizeConfig(existing.draft);
    const nextVersion = (existing.version ?? 0) + 1;

    const { error: e1 } = await supabase
      .from("dojo_student_app_config")
      .update({
        version: nextVersion,
        config: next,
        draft: next,
        has_unpublished_changes: false,
        published_at: new Date().toISOString(),
        published_by: userId,
      })
      .eq("owner_id", userId);
    if (e1) throw new Error(e1.message);

    const { error: e2 } = await supabase.from("dojo_student_app_versions").insert({
      owner_id: userId,
      version: nextVersion,
      label: data.label ?? null,
      config: next,
      author_id: userId,
    });
    if (e2) throw new Error(e2.message);

    return { ok: true, version: nextVersion };
  });

export const adminListAppVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("dojo_student_app_versions")
      .select("id, version, label, created_at, author_id")
      .eq("owner_id", userId)
      .order("version", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminRestoreAppVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { version: number }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: v } = await supabase
      .from("dojo_student_app_versions")
      .select("config")
      .eq("owner_id", userId)
      .eq("version", data.version)
      .maybeSingle();
    if (!v) throw new Error("Versão não encontrada");
    const cfg = normalizeConfig(v.config);
    const { error } = await supabase
      .from("dojo_student_app_config")
      .update({ draft: cfg, has_unpublished_changes: true })
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// Notícias / Banners
// ============================================================

export const adminListAppNews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("dojo_student_app_news")
      .select("*")
      .eq("owner_id", userId)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

type NewsInput = {
  id?: string | null;
  kind: "news" | "banner" | "announcement" | "event" | "promo";
  title: string;
  body?: string | null;
  image_url?: string | null;
  cta_label?: string | null;
  cta_link?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  priority?: number;
  audience?: string;
  active?: boolean;
};

export const adminUpsertAppNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: NewsInput) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      owner_id: userId,
      kind: data.kind,
      title: data.title,
      body: data.body ?? null,
      image_url: data.image_url ?? null,
      cta_label: data.cta_label ?? null,
      cta_link: data.cta_link ?? null,
      starts_at: data.starts_at ?? null,
      ends_at: data.ends_at ?? null,
      priority: data.priority ?? 0,
      audience: data.audience ?? "all",
      active: data.active ?? true,
    };
    if (data.id) {
      const { error } = await supabase
        .from("dojo_student_app_news")
        .update(payload)
        .eq("id", data.id)
        .eq("owner_id", userId);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabase
      .from("dojo_student_app_news")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const adminDeleteAppNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("dojo_student_app_news")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// Aluno: consome config publicada + notícias ativas
// ============================================================

export const getStudentAppConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("dojo_student_app_config")
      .select("version, config, published_at")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      return { version: 0, config: DEFAULT_CONFIG, published_at: null as string | null };
    }
    return { version: data.version, config: normalizeConfig(data.config), published_at: data.published_at };
  });

export const getActiveAppNews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("dojo_student_app_news")
      .select("*")
      .eq("active", true)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
