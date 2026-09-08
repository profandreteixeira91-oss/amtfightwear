// Server-only: notifica os alunos de uma turma quando a grade de horários muda.
// Invariantes:
// - Nunca lança: falha de notificação não pode reverter a alteração da grade.
// - Envia registro in-app (dojo_student_notifications) + Web Push por aluno.

type ScheduleChangeKind = "updated" | "deleted" | "cancelled";

const TITLES: Record<ScheduleChangeKind, string> = {
  updated: "Grade de horários atualizada",
  deleted: "Turma removida da grade",
  cancelled: "Aula cancelada",
};

export async function notifyScheduleChange(
  supabase: any,
  args: {
    ownerId: string;
    classId: string;
    kind: ScheduleChangeKind;
    detail?: string;
  },
): Promise<void> {
  try {
    const { data: cls } = await supabase
      .from("dojo_classes")
      .select("name")
      .eq("id", args.classId)
      .maybeSingle();
    const className = (cls as any)?.name ?? "sua turma";

    const { data: links } = await supabase
      .from("dojo_class_students")
      .select("student_id")
      .eq("class_id", args.classId);
    const studentIds = Array.from(
      new Set(((links ?? []) as any[]).map((l) => l.student_id).filter(Boolean)),
    ) as string[];
    if (studentIds.length === 0) return;

    const title = TITLES[args.kind];
    const body =
      args.detail ??
      (args.kind === "deleted"
        ? `${className} não faz mais parte da grade.`
        : args.kind === "cancelled"
          ? `${className}: aula cancelada.`
          : `${className} teve horários alterados. Confira a nova grade.`);

    await supabase.from("dojo_student_notifications").insert(
      studentIds.map((sid) => ({
        owner_id: args.ownerId,
        student_id: sid,
        type: "schedule_change",
        title,
        message: body,
        link: "/app/schedule",
      })),
    );

    const { sendPushToStudent } = await import("@/lib/push/push.server");
    await Promise.allSettled(
      studentIds.map((sid) =>
        sendPushToStudent(
          sid,
          {
            title: `🗓️ ${title}`,
            body,
            url: "/app/schedule",
            tag: `schedule-${args.classId}`,
            data: { classId: args.classId, kind: args.kind },
          },
          "schedule_change",
        ),
      ),
    );
  } catch (err: any) {
    console.warn("[schedule-notify] falhou:", err?.message ?? err);
  }
}
