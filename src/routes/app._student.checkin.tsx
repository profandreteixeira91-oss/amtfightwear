import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAttendance, selfCheckin, getMyStudent } from "@/lib/student/student.functions";
import { CheckCircle2, QrCode, History } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/app/_student/checkin")({
  head: () => ({ meta: [{ title: "Check-in — Portal do Aluno" }] }),
  component: CheckinPage,
});

function CheckinPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(getMyAttendance);
  const meFn = useServerFn(getMyStudent);
  const checkinFn = useServerFn(selfCheckin);

  const { data: me } = useQuery({ queryKey: ["student", "me"], queryFn: () => meFn({}) });
  const { data: history, isLoading } = useQuery({ queryKey: ["student", "attendance"], queryFn: () => listFn({}) });
  const [submitting, setSubmitting] = useState(false);

  async function getPosition(): Promise<GeolocationPosition | null> {
    if (typeof navigator === "undefined" || !navigator.geolocation) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  }

  async function onCheckin() {
    setSubmitting(true);
    try {
      const pos = await getPosition();
      if (!pos) {
        toast.error("Não foi possível obter sua localização", {
          description: "Ative o GPS e permita o acesso à localização no navegador.",
        });
        setSubmitting(false);
        return;
      }
      await checkinFn({
        data: {
          method: "app",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        },
      });
      toast.success("Check-in registrado!");
      qc.invalidateQueries({ queryKey: ["student"] });
    } catch (e) {
      toast.error("Falha no check-in", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  const last = history?.[0];
  const total30 = (history ?? []).filter((a) => Date.now() - new Date(a.checked_in_at).getTime() < 30 * 86400000).length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Check-in</h1>

      <section className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-neutral-100">
        <QrCode className="mx-auto h-10 w-10 text-neutral-300" />
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Seu PIN</p>
        <p className="text-3xl font-bold tabular-nums tracking-widest">{me?.checkin_pin ?? "——————"}</p>
        <button
          onClick={onCheckin}
          disabled={submitting}
          className="mt-5 w-full rounded-xl py-3.5 text-base font-semibold text-white shadow-md transition active:scale-[0.99] disabled:opacity-60"
          style={{ background: "var(--sa-primary, #dc2626)" }}
        >
          {submitting ? "Enviando…" : "Registrar check-in agora"}
        </button>
        <p className="mt-2 text-[11px] text-neutral-500">Se sua academia exigir, use o PIN acima no kiosk.</p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Últ. presença" value={last ? new Date(last.checked_in_at).toLocaleDateString("pt-BR") : "—"} />
        <Stat label="Presenças (30d)" value={String(total30)} />
      </div>

      <section>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          <History className="h-3.5 w-3.5" /> Histórico
        </h2>
        {isLoading && <p className="text-sm text-neutral-500">Carregando…</p>}
        <ul className="space-y-1.5">
          {(history ?? []).slice(0, 30).map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-neutral-100">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <div className="text-sm">
                  {new Date(a.checked_in_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", weekday: "short" })}
                </div>
              </div>
              <div className="text-[11px] uppercase tracking-wider text-neutral-400">{a.method}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-neutral-100">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</div>
      <div className="mt-0.5 text-lg font-bold">{value}</div>
    </div>
  );
}
