import { formatDegree, degreeSuffix, degreeUnit } from "@/lib/dojo/degree-label";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { qrToDataURL } from "@/lib/qrcode-lazy";
import { QrCode, Hash, Award, Calendar, IdCard, MapPin } from "lucide-react";
import { getMyDigitalCard } from "@/lib/student/student.functions";
import { getStudentAppConfig } from "@/lib/student-app/config.functions";
import { DEFAULT_CONFIG } from "@/lib/student-app/schema";

export const Route = createFileRoute("/app/_student/card")({
  head: () => ({ meta: [{ title: "Carteirinha Digital — Portal do Aluno" }] }),
  component: DigitalCardPage,
});

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function DigitalCardPage() {
  const cardFn = useServerFn(getMyDigitalCard);
  const cfgFn = useServerFn(getStudentAppConfig);

  const { data, isLoading } = useQuery({ queryKey: ["student", "digital-card"], queryFn: () => cardFn({}) });
  const { data: cfgData } = useQuery({ queryKey: ["student", "app-config"], queryFn: () => cfgFn({}), staleTime: 30_000 });

  const config = cfgData?.config ?? DEFAULT_CONFIG;
  const dc = config.digital_card;

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const flipRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const token = data?.student?.qr_token;
    if (!token) return setQrUrl(null);
    qrToDataURL(token, {
      width: 512,
      margin: 1,
      color: { dark: "#0a0a0a", light: "#ffffff" },
    }).then(setQrUrl);
  }, [data?.student?.qr_token]);

  if (isLoading || !data) {
    return <div className="p-6 text-sm text-neutral-500">Carregando carteirinha…</div>;
  }

  const s = data.student;
  const beltName = data.belt?.name ?? "Sem faixa";
  const beltColor = data.belt?.color_hex ?? "#000000";
  const beltStripe = data.belt?.stripe_hex ?? null;
  const academyName = data.academy?.trade_name || data.academy?.legal_name || "Academia";
  const logoUrl = data.academy?.logo_url ?? config.appearance.logo_url;

  const bg =
    dc.background_style === "image" && dc.background_url
      ? { backgroundImage: `url(${dc.background_url})`, backgroundSize: "cover", backgroundPosition: "center" }
      : dc.background_style === "solid"
        ? { background: dc.background_color }
        : { background: `linear-gradient(135deg, ${dc.background_color}, ${dc.accent_color})` };

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <IdCard className="h-5 w-5" /> Carteirinha Digital
      </h1>

      <div
        ref={flipRef}
        onClick={() => setFlipped((f) => !f)}
        className="relative mx-auto aspect-[1.586] w-full max-w-md cursor-pointer select-none overflow-hidden rounded-2xl text-white shadow-2xl"
        style={{ ...bg, color: dc.text_color, perspective: "1000px" }}
      >
        {dc.background_style === "image" && <div className="absolute inset-0 bg-black/50" />}

        {/* Frente */}
        <div
          className={`absolute inset-0 flex flex-col justify-between p-5 transition-opacity duration-300 ${flipped ? "opacity-0" : "opacity-100"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{dc.title}</div>
              {dc.subtitle && <div className="text-[11px] opacity-70">{dc.subtitle}</div>}
            </div>
            {dc.show_academy_logo && logoUrl && (
              <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-md bg-white/95 object-contain p-0.5" />
            )}
          </div>

          <div className="flex items-end gap-3">
            {dc.show_photo && (
              <div
                className="h-24 w-20 shrink-0 overflow-hidden rounded-lg ring-2"
                style={{ borderColor: dc.accent_color, boxShadow: `0 0 0 2px ${dc.accent_color}` }}
              >
                {s.photo_url ? (
                  <img src={s.photo_url} alt={s.full_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-white/10 text-2xl font-bold">
                    {s.full_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-[10px] uppercase tracking-wider opacity-70">Aluno</div>
              <div className="text-base font-bold leading-tight">{s.full_name}</div>
              {dc.show_belt && (
                <div className="flex items-center gap-2">
                  <BeltBadge color={beltColor} stripe={beltStripe} />
                  <span className="text-[11px]">
                    {beltName} {s.current_degree ? `· ${s.current_degree}º ${degreeUnit((s as any).belt?.modality ?? (data as any).belt?.modality)}` : ""}
                  </span>
                </div>
              )}
              {dc.show_unit_name && (data.unit?.name || data.academy) && (
                <div className="flex items-center gap-1 text-[10px] opacity-80">
                  <MapPin className="h-3 w-3" /> {data.unit?.name ?? academyName}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="space-y-0.5">
              {dc.show_registration_number && (
                <Meta label="Matrícula" value={data.registration_number} icon={<Hash className="h-3 w-3" />} />
              )}
              {dc.show_enrollment_date && (
                <Meta label="Desde" value={fmtDate(data.enrollment_date)} icon={<Calendar className="h-3 w-3" />} />
              )}
              {dc.show_pin && s.checkin_pin && (
                <Meta label="PIN" value={s.checkin_pin} icon={<Award className="h-3 w-3" />} mono />
              )}
            </div>
            {dc.show_qr && qrUrl && (
              <div className="rounded-md bg-white p-1.5">
                <img src={qrUrl} alt="QR Code" className="h-20 w-20" />
              </div>
            )}
          </div>
        </div>

        {/* Verso */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center transition-opacity duration-300 ${flipped ? "opacity-100" : "opacity-0"}`}
        >
          <div className="text-xs font-semibold uppercase tracking-widest opacity-80">{academyName}</div>
          {dc.show_qr && qrUrl && (
            <div className="rounded-lg bg-white p-3">
              <img src={qrUrl} alt="QR Code" className="h-40 w-40" />
            </div>
          )}
          {dc.show_pin && s.checkin_pin && (
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-70">PIN de check-in</div>
              <div className="font-mono text-3xl font-bold tracking-widest">{s.checkin_pin}</div>
            </div>
          )}
          {dc.footer_text && <div className="mt-1 text-[10px] opacity-70">{dc.footer_text}</div>}
        </div>
      </div>

      <p className="text-center text-[11px] text-neutral-500">Toque na carteirinha para virar</p>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          <QrCode className="h-3.5 w-3.5" /> Como usar
        </div>
        <ul className="space-y-1.5 text-sm text-neutral-700">
          <li>• Apresente o QR Code na recepção ou no kiosk para registrar sua presença.</li>
          <li>• Use o PIN de 6 dígitos se não puder mostrar o QR Code.</li>
          <li>• Sua carteirinha é pessoal e intransferível.</li>
        </ul>
      </div>
    </div>
  );
}

function Meta({ label, value, icon, mono }: { label: string; value: string; icon?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      {icon && <span className="opacity-70">{icon}</span>}
      <span className="opacity-70">{label}:</span>
      <span className={mono ? "font-mono font-bold tracking-wider" : "font-semibold"}>{value}</span>
    </div>
  );
}

function BeltBadge({ color, stripe }: { color: string; stripe: string | null }) {
  return (
    <span
      className="inline-block h-3 w-8 rounded-sm ring-1 ring-white/40"
      style={{
        background: stripe ? `linear-gradient(90deg, ${color} 70%, ${stripe} 70%)` : color,
      }}
    />
  );
}
