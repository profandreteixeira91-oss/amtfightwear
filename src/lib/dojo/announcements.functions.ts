import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().regex(/^[0-9a-fA-F-]{32,36}$/);

// ============ CATEGORIES ============
const categorySchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(80),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  sort_order: z.number().int().optional(),
});

export const listAnnouncementCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_announcement_categories")
      .select("*")
      .order("sort_order")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertAnnouncementCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => categorySchema.parse(i))
  .handler(async ({ data, context }) => {
    const payload = {
      name: data.name,
      color: data.color ?? "#dc2626",
      icon: data.icon ?? "Megaphone",
      sort_order: data.sort_order ?? 0,
      owner_id: context.userId,
    };
    const { data: row, error } = data.id
      ? await context.supabase.from("dojo_announcement_categories").update(payload).eq("id", data.id).select().single()
      : await context.supabase.from("dojo_announcement_categories").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAnnouncementCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_announcement_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ ANNOUNCEMENTS ============
const targetSchema = z.object({
  target_type: z.enum(["all", "class", "unit", "belt", "status", "student"]),
  target_id: z.string().nullable().optional(),
});

const announcementSchema = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().max(300).nullable().optional(),
  summary: z.string().max(500).nullable().optional(),
  content: z.string().default(""),
  cover_image: z.string().url().nullable().optional().or(z.literal("")),
  gallery: z.array(z.string()).default([]),
  attachments: z.array(z.object({ name: z.string(), url: z.string(), kind: z.string().optional() })).default([]),
  video_url: z.string().url().nullable().optional().or(z.literal("")),
  category_id: uuid.nullable().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  author_name: z.string().nullable().optional(),
  status: z.enum(["draft", "scheduled", "published", "archived"]).default("draft"),
  featured: z.boolean().default(false),
  pinned: z.boolean().default(false),
  allow_comments: z.boolean().default(true),
  allow_likes: z.boolean().default(true),
  require_read_confirmation: z.boolean().default(false),
  send_notification: z.boolean().default(true),
  publish_at: z.string().optional(),
  expires_at: z.string().nullable().optional(),
  target_scope: z.enum(["all", "custom"]).default("all"),
  targets: z.array(targetSchema).default([]),
});

function normalize(input: z.infer<typeof announcementSchema>) {
  const { id, targets, ...rest } = input;
  return {
    id,
    targets,
    payload: {
      ...rest,
      cover_image: rest.cover_image || null,
      video_url: rest.video_url || null,
      publish_at: rest.publish_at || new Date().toISOString(),
      expires_at: rest.expires_at || null,
    },
  };
}

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      q: z.string().optional(),
      status: z.enum(["all", "draft", "scheduled", "published", "archived"]).default("all"),
      priority: z.enum(["all", "low", "normal", "high", "urgent"]).default("all"),
      category_id: z.string().nullable().optional(),
    }).partial().parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("dojo_announcements")
      .select("*, category:dojo_announcement_categories(id, name, color, icon), targets:dojo_announcement_targets(id, target_type, target_id)")
      .order("pinned", { ascending: false })
      .order("publish_at", { ascending: false });
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.priority && data.priority !== "all") q = q.eq("priority", data.priority);
    if (data.category_id) q = q.eq("category_id", data.category_id);
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getAnnouncement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("dojo_announcements")
      .select("*, category:dojo_announcement_categories(id, name, color, icon), targets:dojo_announcement_targets(id, target_type, target_id)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

async function notifyStudentsForAnnouncement(supabase: any, ownerId: string, row: any) {
  if (!row || row.status !== "published" || !row.send_notification) return;
  try {
    const { data: students } = await supabase
      .from("dojo_students")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("status", "active");
    const ids = (students ?? []).map((s: any) => s.id);
    const visibleStudents: string[] = [];
    for (const sid of ids) {
      const { data: ok } = await supabase.rpc("dojo_announcement_visible_to_student", {
        _ann: row.id,
        _student: sid,
      });
      if (ok === true) visibleStudents.push(sid);
    }
    if (visibleStudents.length === 0) return;

    const notifRows = visibleStudents.map((sid) => ({
      owner_id: ownerId,
      student_id: sid,
      type: "announcement",
      title: row.title,
      message: row.summary || row.subtitle || "Novo aviso publicado",
      link: `/app/announcements/${row.id}`,
    }));
    await supabase.from("dojo_student_notifications").insert(notifRows);

    try {
      const { sendPushToStudent } = await import("@/lib/push/push.server");
      const results = await Promise.allSettled(
        visibleStudents.map((sid) =>
          sendPushToStudent(sid, {
            title: `📣 ${row.title}`,
            body: row.summary || row.subtitle || "Novo aviso publicado no quadro de avisos",
            url: `/app/announcements/${row.id}`,
            tag: `announcement-${row.id}`,
            data: { announcementId: row.id, type: "announcement" },
          }, "announcement"),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected");
      console.log(
        `[announcements] push disparado para ${visibleStudents.length} alunos (${failed.length} falhas)`,
      );
      failed.forEach((f: any) => console.warn("[announcements] push rejeitado:", f.reason?.message ?? f.reason));
    } catch (e) {
      console.error("[announcements] push send failed", e);
    }
  } catch (e) {
    console.error("[announcements] notify failed", e);
  }
}

export const saveAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => announcementSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { id, targets, payload } = normalize(data);

    // Detecta transição de status para não notificar duas vezes o mesmo aviso.
    let previousStatus: string | null = null;
    if (id) {
      const { data: prev } = await context.supabase
        .from("dojo_announcements")
        .select("status")
        .eq("id", id)
        .maybeSingle();
      previousStatus = (prev as any)?.status ?? null;
    }

    const record = { ...payload, owner_id: context.userId, created_by: context.userId };
    const { data: row, error } = id
      ? await context.supabase.from("dojo_announcements").update(record).eq("id", id).select().single()
      : await context.supabase.from("dojo_announcements").insert(record).select().single();
    if (error) throw new Error(error.message);

    await context.supabase.from("dojo_announcement_targets").delete().eq("announcement_id", row.id);
    if (payload.target_scope === "custom" && targets.length > 0) {
      const rows = targets.map((t) => ({
        announcement_id: row.id,
        owner_id: context.userId,
        target_type: t.target_type,
        target_id: t.target_id ?? null,
      }));
      const { error: e2 } = await context.supabase.from("dojo_announcement_targets").insert(rows);
      if (e2) throw new Error(e2.message);
    }

    // Notifica quando publica pela primeira vez ou quando republica após rascunho/arquivado.
    const becamePublished = row.status === "published" && previousStatus !== "published";
    if (becamePublished) {
      await notifyStudentsForAnnouncement(context.supabase, context.userId, row);
    }
    return row;
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setAnnouncementStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: uuid, status: z.enum(["draft", "scheduled", "published", "archived"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    // Consulta status anterior para saber se estamos transicionando para "published".
    const { data: prev } = await context.supabase
      .from("dojo_announcements")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    const previousStatus = (prev as any)?.status ?? null;

    const { data: row, error } = await context.supabase
      .from("dojo_announcements")
      .update({ status: data.status })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (data.status === "published" && previousStatus !== "published") {
      await notifyStudentsForAnnouncement(context.supabase, context.userId, row);
    }
    return { ok: true };
  });


// ============ STATS ============
export const announcementStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date().toISOString();
    const [total, active, scheduled, expired, featured, latest, views, likes, reads] = await Promise.all([
      context.supabase.from("dojo_announcements").select("id", { count: "exact", head: true }),
      context.supabase.from("dojo_announcements").select("id", { count: "exact", head: true })
        .eq("status", "published").lte("publish_at", now).or(`expires_at.is.null,expires_at.gt.${now}`),
      context.supabase.from("dojo_announcements").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
      context.supabase.from("dojo_announcements").select("id", { count: "exact", head: true })
        .eq("status", "published").lt("expires_at", now),
      context.supabase.from("dojo_announcements").select("id", { count: "exact", head: true }).eq("featured", true),
      context.supabase.from("dojo_announcements").select("id, title, publish_at").order("publish_at", { ascending: false }).limit(1).maybeSingle(),
      context.supabase.from("dojo_announcements").select("view_count"),
      context.supabase.from("dojo_announcement_likes").select("id", { count: "exact", head: true }),
      context.supabase.from("dojo_announcement_reads").select("id", { count: "exact", head: true }),
    ]);
    const totalViews = (views.data ?? []).reduce((s: number, r: any) => s + (r.view_count || 0), 0);
    return {
      total: total.count ?? 0,
      active: active.count ?? 0,
      scheduled: scheduled.count ?? 0,
      expired: expired.count ?? 0,
      featured: featured.count ?? 0,
      latest: latest.data ?? null,
      totalViews,
      totalLikes: likes.count ?? 0,
      totalReads: reads.count ?? 0,
    };
  });

// ============ READ REPORT ============
export const readReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const [reads, students] = await Promise.all([
      context.supabase.from("dojo_announcement_reads").select("*, student:dojo_students(id, full_name, photo_url)").eq("announcement_id", data.id),
      context.supabase.from("dojo_students").select("id, full_name, photo_url, status").eq("status", "active"),
    ]);
    if (reads.error) throw new Error(reads.error.message);
    if (students.error) throw new Error(students.error.message);
    const readIds = new Set((reads.data ?? []).map((r: any) => r.student_id));
    const pending = (students.data ?? []).filter((s: any) => !readIds.has(s.id));
    const totalActive = (students.data ?? []).length;
    return {
      reads: reads.data ?? [],
      pending,
      percent: totalActive ? Math.round(((reads.data?.length ?? 0) / totalActive) * 100) : 0,
    };
  });

// ============ TARGET OPTIONS (dropdown data) ============
export const targetOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [classes, units, belts, students] = await Promise.all([
      context.supabase.from("dojo_classes").select("id, name").order("name"),
      context.supabase.from("dojo_units").select("id, name").order("name"),
      context.supabase.from("dojo_belts").select("id, name, color").order("order_index" as any, { ascending: true } as any),
      context.supabase.from("dojo_students").select("id, full_name").order("full_name").limit(500),
    ]);
    return {
      classes: classes.data ?? [],
      units: units.data ?? [],
      belts: belts.data ?? [],
      students: students.data ?? [],
    };
  });
