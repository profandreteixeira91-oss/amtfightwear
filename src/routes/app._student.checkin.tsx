import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAttendance, selfCheckin, getMyStudent } from "@/lib/student/student.functions";
import { getMyCheckinMethods } from "@/lib/dojo/checkin.functions";
import { CheckCircle2, QrCode, History, MapPin, Fingerprint, ScanLine, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

const searchSchema = z.object({
  auto: z.enum(["fixed_qr"]).optional(),
});

export const Route = createFileRoute("/app/_student/checkin")({
  head: () => ({ meta: [{ title: "Check-in — Portal do Aluno" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: CheckinPage,
});

type Method = "app" | "pin" | "qr" | "fixed_qr" | "photo";

function CheckinPage() {
  const qc = useQueryClient();
  const search = useSearch({ from: "/app/_student/checkin" });
  const listFn = useServerFn(getMyAttendance);
  const meFn = useServerFn(getMyStudent);
  const methodsFn = useServerFn(getMyCheckinMethods);
  const checkinFn = useServerFn(selfCheckin);

  const { data: me } = useQuery({ queryKey: ["student", "me"], queryFn: () => meFn({}) });
  const { data: methods } = useQuery({ queryKey: ["student", "checkin-methods"], queryFn: () => methodsFn() });
  const { data: history, isLoading } = useQuery({ queryKey: ["student", "attendance"], queryFn: () => listFn({}) });
  const [submitting, setSubmitting] = useState<Method | null>(null);

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

  async function doCheckin(method: Method) {
    if (submitting) return;
    setSubmitting(method);
    try {
      let payload: any = { method };
      if (method === "app") {
        const pos = await getPosition();
        if (!pos) {
          toast.error("Não foi possível obter sua localização", {
            description: "Ative o GPS e permita o acesso à localização no navegador.",
          });
          setSubmitting(null);
          return;
        }
        payload = {
          method: "app",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
      }
      await checkinFn({ data: payload });
      toast.success("Check-in registrado!");
      qc.invalidateQueries({ queryKey: ["student"] });
    } catch (e) {
      toast.error("Falha no check-in", { description: (e as Error).message });
    } finally {
      setSubmitting(null);
    }
  }

  // Auto check-in ao abrir via QR fixo da academia
  const autoTriggered = useMemo(() => ({ done: false }), []);
  useEffect(() => {
    if (search.auto === "fixed_qr" && !autoTriggered.done && methods?.allowFixedQr) {
      autoTriggered.done = true;
      doCheckin("fixed_qr");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.auto, methods?.allowFixedQr]);

  const last = history?.[0];
  const total30 = (history ?? []).filter((a) => Date.now() - new Date(a.checked_in_at).getTime() < 30 * 86400000).length;

  // Check-in por foto é exclusivo do dono do dojo (feito pelo professor durante a aula),
  // por isso não aparece como opção no app do aluno.
  const options: { key: Method; enabled: boolean; icon: any; title: string; desc: string }[] = [
    { key: "app", enabled: !!methods?.allowGps, icon: MapPin, title: "Check-in por GPS", desc: methods?.geoRequired ? "Valida sua localização junto à academia" : "Registre a partir do app" },
    { key: "fixed_qr", enabled: !!methods?.allowFixedQr, icon: ScanLine, title: "QR Code da academia", desc: "Aponte a câmera para o QR fixo impresso no dojo" },
    { key: "pin", enabled: !!methods?.allowPin, icon: Fingerprint, title: "Meu PIN", desc: "Use o PIN abaixo no kiosk da academia" },
    { key: "qr", enabled: !!methods?.allowQr, icon: QrCode, title: "Meu QR pessoal", desc: "Mostre seu QR no kiosk da academia" },
  ];
  const enabled = options.filter((o) => o.enabled);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Check-in</h1>

      <section className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-neutral-100">
        <QrCode className="mx-auto h-9 w-9 text-neutral-300" />
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Seu PIN pessoal</p>
        <p className="text-3xl font-bold tabular-nums tracking-widest">{me?.checkin_pin ?? "——————"}</p>
        <p className="mt-1 text-[11px] text-neutral-500">Use no kiosk da academia se o dono do dojo tiver ativado essa opção.</p>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Escolha como registrar sua presença
        </h2>
        <div className="space-y-2">
          {enabled.length === 0 && (
            <div className="rounded-2xl bg-white p-4 text-center text-sm text-neutral-500 shadow-sm ring-1 ring-neutral-100">
              Nenhum método de check-in habilitado. Fale com o dono da academia.
            </div>
          )}
          {enabled.map((opt) => (
            <button
              key={opt.key}
              onClick={() => doCheckin(opt.key)}
              disabled={submitting !== null}
              className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-neutral-100 transition active:scale-[0.99] disabled:opacity-60"
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ background: "var(--sa-primary, #dc2626)" }}
              >
                {submitting === opt.key ? <Loader2 className="h-5 w-5 animate-spin" /> : <opt.icon className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-neutral-900">{opt.title}</div>
                <div className="truncate text-[11px] text-neutral-500">
                  {opt.desc}
                </div>
              </div>
              <CheckCircle2 className="h-4 w-4 text-neutral-300" />
            </button>
          ))}
        </div>
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
