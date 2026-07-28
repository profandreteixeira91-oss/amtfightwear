import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Bell, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  getStudentNotificationPrefs,
  saveStudentNotificationPrefs,
  NOTIFICATION_CATEGORY_META,
  DEFAULT_NOTIFICATION_CATEGORIES,
  type NotificationCategoryKey,
} from "@/lib/student-app/notification-prefs.functions";

export const Route = createFileRoute("/dojo/app/student-notifications-config")({
  head: () => ({
    meta: [
      { title: "Notificações do App do Aluno — AMT Dojo Manager" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentNotificationsConfigPage,
});

const GROUPS = ["Aulas & Presença", "Financeiro", "Comunicação", "Desempenho"] as const;

function StudentNotificationsConfigPage() {
  const getFn = useServerFn(getStudentNotificationPrefs);
  const saveFn = useServerFn(saveStudentNotificationPrefs);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dojo", "student-notif-prefs"],
    queryFn: () => getFn({}),
  });

  const [state, setState] = useState<Record<NotificationCategoryKey, boolean>>(DEFAULT_NOTIFICATION_CATEGORIES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.categories) setState(data.categories);
  }, [data?.categories]);

  function toggle(k: NotificationCategoryKey, v: boolean) {
    setState((s) => ({ ...s, [k]: v }));
  }

  function setAll(v: boolean) {
    const next = { ...state };
    for (const k of Object.keys(next) as NotificationCategoryKey[]) next[k] = v;
    setState(next);
  }

  async function save() {
    setSaving(true);
    try {
      await saveFn({ data: { categories: state } });
      toast.success("Preferências salvas");
      await refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dojo-theme min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-red-950/40">
      <div className="mx-auto max-w-4xl px-4 pt-5 md:pt-7 pb-16">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-neutral-950 via-neutral-900 to-red-950/50 p-5 text-white shadow-[0_20px_60px_-30px_rgba(220,38,38,0.55)] md:p-7">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-red-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white ring-1 ring-white/20 shadow-[0_8px_24px_-8px_rgba(220,38,38,0.9)]">
                <Bell className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <Link to="/dojo/app/student-app-qr" className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-red-300/80 hover:text-red-200">
                  <ArrowLeft className="h-3 w-3" /> App do Aluno
                </Link>
                <h1 className="mt-1 truncate text-xl font-semibold tracking-tight md:text-2xl">
                  Notificações do App do Aluno
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-neutral-300">
                  Escolha quais avisos push serão enviados para o celular dos seus alunos.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setAll(true)}
                className="h-9 border-red-500/30 bg-white/5 text-white hover:bg-white/10 hover:text-white text-xs"
              >
                Ativar tudo
              </Button>
              <Button
                variant="outline"
                onClick={() => setAll(false)}
                className="h-9 border-red-500/30 bg-white/5 text-white hover:bg-white/10 hover:text-white text-xs"
              >
                Desativar tudo
              </Button>
            </div>
          </div>
        </div>

        {/* Groups */}
        <div className="mt-6 space-y-4">
          {GROUPS.map((group) => {
            const items = NOTIFICATION_CATEGORY_META.filter((c) => c.group === group);
            if (items.length === 0) return null;
            return (
              <section
                key={group}
                className="rounded-2xl border border-red-500/15 bg-neutral-950/60 p-4 md:p-5 text-white shadow-[0_10px_30px_-20px_rgba(220,38,38,0.6)]"
              >
                <h2 className="text-sm font-semibold uppercase tracking-wider text-red-300/80">{group}</h2>
                <ul className="mt-3 divide-y divide-white/5">
                  {items.map((item) => (
                    <li key={item.key} className="flex items-start justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-neutral-100">{item.label}</div>
                        <div className="mt-0.5 text-xs text-neutral-400">{item.description}</div>
                      </div>
                      <Switch
                        checked={!!state[item.key]}
                        onCheckedChange={(v) => toggle(item.key, !!v)}
                        disabled={isLoading}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <div className="sticky bottom-4 mt-6 flex justify-end">
          <Button
            onClick={save}
            disabled={saving || isLoading}
            className="h-11 bg-gradient-to-br from-red-600 to-red-800 text-white shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)] hover:from-red-500 hover:to-red-700"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando…" : "Salvar preferências"}
          </Button>
        </div>

        <p className="mt-4 text-[11px] text-neutral-500">
          As alterações valem para todos os alunos da sua academia. Os alunos ainda precisam ter as notificações ativadas
          no dispositivo deles para receber os avisos.
        </p>
      </div>
    </div>
  );
}
