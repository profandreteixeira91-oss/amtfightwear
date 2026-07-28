import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStudentAuth } from "@/integrations/supabase/student-auth-middleware";

const uuid = z.string().regex(/^[0-9a-fA-F-]{32,36}$/);

async function currentStudent(supabase: any) {
  const { data } = await supabase.rpc("get_my_student_id");
  return (data as string | null) ?? null;
}

export const listMyAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireStudentAuth])
  .inputValidator((i: unknown) =>
    z.object({
      q: z.string().optional(),
      category_id: z.string().optional(),
      priority: z.enum(["all", "low", "normal", "high", "urgent"]).default("all").optional(),
      filter: z.enum(["all", "unread", "read", "featured"]).default("all").optional(),
    }).partial().parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const studentId = await currentStudent(context.supabase);

    // Fallback: quando o usuário logado NÃO é aluno (ex.: o próprio dono
    // testando o app do aluno), ainda listamos os avisos publicados do
    // owner_id = auth.uid(), para que o Quadro de Avisos apareça.
    if (!studentId) {
      let q = context.supabase
        .from("dojo_announcements")
        .select("*, category:dojo_announcement_categories(id, name, color, icon)")
        .eq("owner_id", context.userId)
        .eq("status", "published")
        .lte("publish_at", new Date().toISOString())
        .order("pinned", { ascending: false })
        .order("priority", { ascending: false })
        .order("publish_at", { ascending: false });
      if (data.q) q = q.ilike("title", `%${data.q}%`);
      if (data.category_id) q = q.eq("category_id", data.category_id);
      if (data.priority && data.priority !== "all") q = q.eq("priority", data.priority);
      const { data: rows } = await q;
      const nowIso = new Date().toISOString();
      let items = (rows ?? [])
        .filter((r: any) => !r.expires_at || r.expires_at > nowIso)
        .map((r: any) => ({ ...r, is_read: false, is_liked: false }));
      if (data.filter === "featured") items = items.filter((r: any) => r.featured || r.pinned);
      return { items, student_id: null, categoryCount: items.length };
    }

    // Get all owner-scoped published announcements the RLS allows
    let q = context.supabase
      .from("dojo_announcements")
      .select("*, category:dojo_announcement_categories(id, name, color, icon)")
      .order("pinned", { ascending: false })
      .order("priority", { ascending: false })
      .order("publish_at", { ascending: false });
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    if (data.category_id) q = q.eq("category_id", data.category_id);
    if (data.priority && data.priority !== "all") q = q.eq("priority", data.priority);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Filter by targeting via SECURITY DEFINER function
    const visibleIds = new Set<string>();
    const ids = (rows ?? []).map((r: any) => r.id);
    if (ids.length > 0) {
      await Promise.all(
        ids.map(async (id) => {
          const { data: ok } = await context.supabase.rpc("dojo_announcement_visible_to_student", {
            _ann: id,
            _student: studentId,
          });
          if (ok === true) visibleIds.add(id);
        }),
      );
    }
    const visible = (rows ?? []).filter((r: any) => visibleIds.has(r.id));

    const [reads, likes] = await Promise.all([
      context.supabase.from("dojo_announcement_reads").select("announcement_id").eq("student_id", studentId),
      context.supabase.from("dojo_announcement_likes").select("announcement_id").eq("student_id", studentId),
    ]);
    const readSet = new Set((reads.data ?? []).map((r: any) => r.announcement_id));
    const likeSet = new Set((likes.data ?? []).map((r: any) => r.announcement_id));

    let items = visible.map((r: any) => ({
      ...r,
      is_read: readSet.has(r.id),
      is_liked: likeSet.has(r.id),
    }));
    if (data.filter === "unread") items = items.filter((r) => !r.is_read);
    else if (data.filter === "read") items = items.filter((r) => r.is_read);
    else if (data.filter === "featured") items = items.filter((r) => r.featured || r.pinned);

    return { items, student_id: studentId, categoryCount: items.length };
  });

export const getMyAnnouncement = createServerFn({ method: "GET" })
  .middleware([requireStudentAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const studentId = await currentStudent(context.supabase);

    // Fallback admin/owner (sem student): retorna só o aviso, sem comentários/likes.
    if (!studentId) {
      const { data: ann, error } = await context.supabase
        .from("dojo_announcements")
        .select("*, category:dojo_announcement_categories(id, name, color, icon)")
        .eq("id", data.id)
        .eq("owner_id", context.userId)
        .single();
      if (error) throw new Error(error.message);
      return {
        announcement: ann,
        comments: [],
        like_count: 0,
        liked: false,
        read: false,
        read_at: null,
        student_id: null,
      };
    }

    const [ann, comments, myLike, myRead, likeCount] = await Promise.all([
      context.supabase.from("dojo_announcements")
        .select("*, category:dojo_announcement_categories(id, name, color, icon)")
        .eq("id", data.id).single(),
      context.supabase.from("dojo_announcement_comments")
        .select("*, student:dojo_students(id, full_name, photo_url)")
        .eq("announcement_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("dojo_announcement_likes").select("id").eq("announcement_id", data.id).eq("student_id", studentId).maybeSingle(),
      context.supabase.from("dojo_announcement_reads").select("id, read_at").eq("announcement_id", data.id).eq("student_id", studentId).maybeSingle(),
      context.supabase.from("dojo_announcement_likes").select("id", { count: "exact", head: true }).eq("announcement_id", data.id),
    ]);
    if (ann.error) throw new Error(ann.error.message);

    // view_count: fire-and-forget para não travar a resposta
    context.supabase.from("dojo_announcements")
      .update({ view_count: (ann.data.view_count ?? 0) + 1 })
      .eq("id", data.id)
      .then(() => {}, () => {});

    return {
      announcement: ann.data,
      comments: comments.data ?? [],
      like_count: likeCount.count ?? 0,
      liked: !!myLike.data,
      read: !!myRead.data,
      read_at: myRead.data?.read_at ?? null,
      student_id: studentId,
    };
  });


export const confirmRead = createServerFn({ method: "POST" })
  .middleware([requireStudentAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, device: z.string().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const studentId = await currentStudent(context.supabase);
    if (!studentId) throw new Error("Aluno não encontrado");
    const { data: student } = await context.supabase.from("dojo_students").select("owner_id").eq("id", studentId).single();
    if (!student) throw new Error("Aluno não encontrado");
    const { error } = await context.supabase
      .from("dojo_announcement_reads")
      .upsert(
        { announcement_id: data.id, student_id: studentId, owner_id: student.owner_id, device: data.device ?? null },
        { onConflict: "announcement_id,student_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleLike = createServerFn({ method: "POST" })
  .middleware([requireStudentAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const studentId = await currentStudent(context.supabase);
    if (!studentId) throw new Error("Aluno não encontrado");
    const { data: existing } = await context.supabase
      .from("dojo_announcement_likes")
      .select("id")
      .eq("announcement_id", data.id)
      .eq("student_id", studentId)
      .maybeSingle();
    if (existing) {
      await context.supabase.from("dojo_announcement_likes").delete().eq("id", existing.id);
      return { liked: false };
    }
    const { data: student } = await context.supabase.from("dojo_students").select("owner_id").eq("id", studentId).single();
    if (!student) throw new Error("Aluno não encontrado");
    const { error } = await context.supabase.from("dojo_announcement_likes").insert({
      announcement_id: data.id,
      student_id: studentId,
      owner_id: student.owner_id,
    });
    if (error) throw new Error(error.message);
    return { liked: true };
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireStudentAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: uuid, comment: z.string().trim().min(1).max(1000) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const studentId = await currentStudent(context.supabase);
    if (!studentId) throw new Error("Aluno não encontrado");
    const { data: student } = await context.supabase.from("dojo_students").select("owner_id").eq("id", studentId).single();
    if (!student) throw new Error("Aluno não encontrado");
    const { data: row, error } = await context.supabase
      .from("dojo_announcement_comments")
      .insert({
        announcement_id: data.id,
        student_id: studentId,
        owner_id: student.owner_id,
        comment: data.comment,
      })
      .select("*, student:dojo_students(id, full_name, photo_url)")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMyComment = createServerFn({ method: "POST" })
  .middleware([requireStudentAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_announcement_comments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
