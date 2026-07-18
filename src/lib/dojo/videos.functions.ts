import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============= HELPERS =============
export type VideoSource = "upload" | "youtube" | "vimeo" | "bunny" | "s3" | "r2" | "url";
export type VideoStatus = "draft" | "published" | "private" | "archived";
export type VideoVisibility = "public" | "exclusive";

const attachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  kind: z.enum(["pdf", "image", "link", "file"]).default("file"),
});

const accessRulesSchema = z
  .object({
    classes: z.array(z.string()).optional(),
    modalities: z.array(z.string()).optional(),
    belts: z.array(z.string()).optional(),
    graduations: z.array(z.string()).optional(),
    teachers: z.array(z.string()).optional(),
    students: z.array(z.string()).optional(),
    plans: z.array(z.string()).optional(),
    units: z.array(z.string()).optional(),
  })
  .partial();

const videoSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  subcategory_id: z.string().uuid().nullable().optional(),
  teacher_id: z.string().uuid().nullable().optional(),
  teacher_name: z.string().nullable().optional(),
  thumbnail_url: z.string().nullable().optional(),
  video_url: z.string().nullable().optional(),
  video_source: z.enum(["upload", "youtube", "vimeo", "bunny", "s3", "r2", "url"]).default("url"),
  provider_id: z.string().nullable().optional(),
  duration_seconds: z.number().int().nonnegative().nullable().optional(),
  status: z.enum(["draft", "published", "private", "archived"]).default("draft"),
  visibility: z.enum(["public", "exclusive"]).default("exclusive"),
  access_rules: accessRulesSchema.optional(),
  attachments: z.array(attachmentSchema).optional(),
  tags: z.array(z.string()).optional(),
  scheduled_at: z.string().nullable().optional(),
});

// ============= CATEGORIES =============
export const listVideoCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_video_categories")
      .select("*")
      .order("sort_order")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertVideoCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        parent_id: z.string().uuid().nullable().optional(),
        name: z.string().min(1),
        slug: z.string().nullable().optional(),
        color: z.string().nullable().optional(),
        sort_order: z.number().int().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const payload = { ...data, owner_id: context.userId };
    const { data: row, error } = data.id
      ? await context.supabase.from("dojo_video_categories").update(payload).eq("id", data.id).select().single()
      : await context.supabase.from("dojo_video_categories").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteVideoCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_video_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============= VIDEOS =============
export const listVideos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        search: z.string().optional(),
        category_id: z.string().uuid().nullable().optional(),
        subcategory_id: z.string().uuid().nullable().optional(),
        status: z.enum(["draft", "published", "private", "archived", "all"]).optional(),
        teacher_id: z.string().uuid().nullable().optional(),
        sort: z.enum(["recent", "views", "title"]).optional(),
        limit: z.number().int().positive().max(500).optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("dojo_videos")
      .select("*")
      .eq("owner_id", context.userId);
    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    if (data.category_id) query = query.eq("category_id", data.category_id);
    if (data.subcategory_id) query = query.eq("subcategory_id", data.subcategory_id);
    if (data.teacher_id) query = query.eq("teacher_id", data.teacher_id);
    if (data.search) {
      const s = data.search.trim();
      if (s) query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
    }
    if (data.sort === "views") query = query.order("views_count", { ascending: false });
    else if (data.sort === "title") query = query.order("title");
    else query = query.order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
    if (data.limit) query = query.limit(data.limit);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("dojo_videos")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const upsertVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => videoSchema.parse(i))
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const payload = {
      ...data,
      owner_id: context.userId,
      access_rules: data.access_rules ?? {},
      attachments: data.attachments ?? [],
      published_at: data.status === "published" ? now : null,
    } as any;
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    const { data: row, error } = data.id
      ? await context.supabase.from("dojo_videos").update(payload).eq("id", data.id).select().single()
      : await context.supabase.from("dojo_videos").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_videos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: src, error: e1 } = await context.supabase.from("dojo_videos").select("*").eq("id", data.id).single();
    if (e1 || !src) throw new Error(e1?.message ?? "Vídeo não encontrado");
    const { id, created_at, updated_at, views_count, likes_count, published_at, ...rest } = src as Record<string, any>;
    const clone = { ...rest, title: `${rest.title} (cópia)`, status: "draft", published_at: null };
    const { data: row, error } = await context.supabase.from("dojo_videos").insert(clone).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const archiveVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), archive: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_videos")
      .update({
        status: data.archive ? "archived" : "draft",
        archived_at: data.archive ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============= DASHBOARD =============
export const getVideosDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const owner = context.userId;
    const [videos, cats] = await Promise.all([
      context.supabase.from("dojo_videos").select("id,status,duration_seconds,views_count,title,thumbnail_url").eq("owner_id", owner),
      context.supabase.from("dojo_video_categories").select("id").eq("owner_id", owner),
    ]);
    const rows = videos.data ?? [];
    const published = rows.filter((r: any) => r.status === "published").length;
    const drafts = rows.filter((r: any) => r.status === "draft").length;
    const totalViews = rows.reduce((s: number, r: any) => s + (r.views_count ?? 0), 0);
    const totalSeconds = rows.reduce((s: number, r: any) => s + (r.duration_seconds ?? 0), 0);
    const topWatched = [...rows]
      .sort((a: any, b: any) => (b.views_count ?? 0) - (a.views_count ?? 0))
      .slice(0, 5);
    return {
      published,
      drafts,
      totalViews,
      totalHours: Math.round((totalSeconds / 3600) * 10) / 10,
      categoriesCount: (cats.data ?? []).length,
      totalVideos: rows.length,
      topWatched,
    };
  });

// ============= PROGRESS =============
export const upsertProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        video_id: z.string().uuid(),
        watched_seconds: z.number().int().nonnegative(),
        percent: z.number().min(0).max(100),
        completed: z.boolean().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: vid } = await context.supabase.from("dojo_videos").select("owner_id").eq("id", data.video_id).single();
    if (!vid) throw new Error("Vídeo não encontrado");
    const { error } = await context.supabase.from("dojo_video_progress").upsert(
      {
        video_id: data.video_id,
        user_id: context.userId,
        owner_id: (vid as any).owner_id,
        watched_seconds: data.watched_seconds,
        percent: data.percent,
        completed: data.completed ?? data.percent >= 95,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "video_id,user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const registerView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ video_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: vid } = await context.supabase.from("dojo_videos").select("owner_id,views_count").eq("id", data.video_id).single();
    if (!vid) return { ok: false };
    await context.supabase.from("dojo_video_views").insert({
      video_id: data.video_id,
      user_id: context.userId,
      owner_id: (vid as any).owner_id,
    });
    await context.supabase
      .from("dojo_videos")
      .update({ views_count: ((vid as any).views_count ?? 0) + 1 })
      .eq("id", data.video_id);
    return { ok: true };
  });

// ============= FAVORITES =============
export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ video_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("dojo_video_favorites")
      .select("video_id")
      .eq("video_id", data.video_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) {
      await context.supabase
        .from("dojo_video_favorites")
        .delete()
        .eq("video_id", data.video_id)
        .eq("user_id", context.userId);
      return { favorited: false };
    }
    const { data: vid } = await context.supabase.from("dojo_videos").select("owner_id").eq("id", data.video_id).single();
    if (!vid) throw new Error("Vídeo não encontrado");
    await context.supabase.from("dojo_video_favorites").insert({
      video_id: data.video_id,
      user_id: context.userId,
      owner_id: (vid as any).owner_id,
    });
    return { favorited: true };
  });

export const listFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_video_favorites")
      .select("video_id, dojo_videos(*)")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => r.dojo_videos).filter(Boolean);
  });

// ============= COMMENTS =============
export const listComments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ video_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("dojo_video_comments")
      .select("*")
      .eq("video_id", data.video_id)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        video_id: z.string().uuid(),
        body: z.string().min(1).max(2000),
        parent_id: z.string().uuid().nullable().optional(),
        author_name: z.string().nullable().optional(),
        author_avatar: z.string().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: vid } = await context.supabase.from("dojo_videos").select("owner_id").eq("id", data.video_id).single();
    if (!vid) throw new Error("Vídeo não encontrado");
    const { data: row, error } = await context.supabase
      .from("dojo_video_comments")
      .insert({
        video_id: data.video_id,
        user_id: context.userId,
        owner_id: (vid as any).owner_id,
        body: data.body,
        parent_id: data.parent_id ?? null,
        author_name: data.author_name ?? null,
        author_avatar: data.author_avatar ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_video_comments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const pinComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), pinned: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_video_comments").update({ pinned: data.pinned }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
