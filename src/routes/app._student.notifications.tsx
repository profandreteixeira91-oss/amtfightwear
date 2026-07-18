import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyNotifications, markNotificationRead } from "@/lib/student/student.functions";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/app/_student/notifications")({
  head: () => ({ meta: [{ title: "Notificações — Portal do Aluno" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(getMyNotifications);
  const markFn = useServerFn(markNotificationRead);
  const { data, isLoading } = useQuery({ queryKey: ["student", "notifications"], queryFn: () => listFn({}) });

  async function markRead(id: string) {
    await markFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["student", "notifications"] });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Notificações</h1>
      {isLoading && <p className="text-sm text-neutral-500">Carregando…</p>}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-100">
          <Bell className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-3 text-sm text-neutral-500">Você está em dia. Nenhuma notificação.</p>
        </div>
      )}
      <ul className="space-y-2">
        {(data ?? []).map((n) => (
          <li
            key={n.id}
            onClick={() => !n.read_at && markRead(n.id)}
            className={`cursor-pointer rounded-2xl p-4 shadow-sm ring-1 transition ${
              n.read_at ? "bg-white ring-neutral-100" : "bg-red-50 ring-red-100"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{n.title}</div>
                {n.message && <div className="mt-0.5 text-xs text-neutral-600">{n.message}</div>}
              </div>
              <div className="shrink-0 text-[10px] uppercase tracking-wider text-neutral-400">
                {new Date(n.created_at).toLocaleDateString("pt-BR")}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
