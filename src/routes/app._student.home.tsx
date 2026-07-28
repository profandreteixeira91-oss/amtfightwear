import { formatDegree, degreeSuffix, degreeUnit, formatBeltName } from "@/lib/dojo/degree-label";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyHome } from "@/lib/student/student.functions";
import { getStudentAppConfig, getActiveAppNews } from "@/lib/student-app/config.functions";
import { listMyAnnouncements } from "@/lib/student/announcements.functions";
import { DEFAULT_CONFIG, type HomeBlock, type FeatureKey } from "@/lib/student-app/schema";
import * as Icons from "lucide-react";
import { ChevronRight, Megaphone, Pin, Star, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/app/_student/home")({
  head: () => ({ meta: [{ title: "Início — Portal do Aluno" }] }),
  component: HomePage,
});

const SHORTCUT_META: Record<string, { label: string; icon: keyof typeof Icons; to: string; feature?: FeatureKey }> = {
  checkin: { label: "Check-in", icon: "QrCode", to: "/app/checkin", feature: "checkin" },
  agenda: { label: "Agenda", icon: "CalendarDays", to: "/app/agenda", feature: "agenda" },
  videos: { label: "Vídeos", icon: "Film", to: "/app/videos", feature: "videos" },
  graduations: { label: "Graduações", icon: "Award", to: "/app/graduations", feature: "graduations" },
  certificates: { label: "Certificados", icon: "FileBadge", to: "/app/certificates", feature: "certificates" },
  finance: { label: "Financeiro", icon: "Wallet", to: "/app/finance", feature: "finance" },
  competitions: { label: "Competições", icon: "Trophy", to: "/app/competitions", feature: "competitions" },
  profile: { label: "Meu Perfil", icon: "User", to: "/app/profile", feature: "profile" },
  documents: { label: "Documentos", icon: "FileText", to: "/app/documents", feature: "documents" },
  ranking: { label: "Ranking", icon: "Trophy", to: "/app/ranking", feature: "ranking" },
  card: { label: "Carteirinha", icon: "IdCard", to: "/app/card" },

};

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function HomePage() {
  const homeFn = useServerFn(getMyHome);
  const configFn = useServerFn(getStudentAppConfig);
  const newsFn = useServerFn(getActiveAppNews);
  const annFn = useServerFn(listMyAnnouncements);
  const { data: homeData, isLoading } = useQuery({ queryKey: ["student", "home"], queryFn: () => homeFn({}) });
  const { data: cfgData } = useQuery({ queryKey: ["student", "app-config"], queryFn: () => configFn({}), staleTime: 30_000 });
  const { data: news } = useQuery({ queryKey: ["student", "app-news"], queryFn: () => newsFn({}) });
  const { data: annData } = useQuery({
    queryKey: ["student", "announcements", "home"],
    queryFn: () => annFn({ data: { filter: "all" as any } }),
    staleTime: 30_000,
  });

  const config = cfgData?.config ?? DEFAULT_CONFIG;
  const student = homeData?.student;
  const belt = homeData?.belt;
  const openInvoices = homeData?.openInvoices ?? [];
  const announcements = annData?.items ?? [];

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5 lg:max-w-5xl lg:grid-cols-3 lg:items-start">
      {config.home_blocks.filter((b) => b.visible !== false).map((block) => {
        const spanAll = block.type === "welcome" || block.type === "banner" || block.type === "open_invoices";
        return (
          <div key={block.id} className="contents">
            <div className={spanAll ? "lg:col-span-3" : block.type === "shortcuts" ? "lg:col-span-2" : "lg:col-span-1"}>
              <BlockRenderer
                block={block}
                config={config}
                student={student}
                belt={belt}
                openInvoices={openInvoices}
                lastCheckin={homeData?.lastCheckin}
                news={news ?? []}
                isLoading={isLoading}
              />
            </div>
            {block.type === "welcome" && (
              <div className="lg:col-span-3">
                <AnnouncementsWidget items={announcements} />
              </div>
            )}
          </div>

        );
      })}
      {!config.home_blocks.some((b) => b.type === "welcome" && b.visible !== false) && (
        <div className="lg:col-span-3">
          <AnnouncementsWidget items={announcements} />
        </div>
      )}
    </div>
  );
}


function AnnouncementsWidget({ items }: { items: any[] }) {
  const sorted = [...items].sort((a, b) => {
    const score = (x: any) => (x.pinned ? 4 : 0) + (x.featured ? 2 : 0) + (!x.is_read ? 1 : 0) + (x.priority === "urgent" ? 3 : 0);
    return score(b) - score(a);
  });
  const top = sorted.slice(0, 4);
  const unread = items.filter((i) => !i.is_read).length;
  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          <Megaphone className="h-3.5 w-3.5" /> Quadro de Avisos
          {unread > 0 && (
            <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span>
          )}
        </h2>
        <Link to="/app/announcements" className="text-[11px] font-medium" style={{ color: "var(--sa-primary)" }}>
          Ver todos
        </Link>
      </div>
      {top.length === 0 ? (
        <div
          className="rounded-2xl p-4 text-center text-xs text-neutral-500 shadow-sm ring-1 ring-neutral-100"
          style={{ background: "var(--sa-card, #fff)" }}
        >
          Nenhum aviso disponível no momento.
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {top.map((a) => (
            <li key={a.id}>
              <Link
                to="/app/announcements"
                search={{ open: a.id } as any}
                className="flex items-start gap-3 rounded-2xl p-3 shadow-sm ring-1 ring-neutral-100 transition hover:ring-neutral-200"
                style={{ background: "var(--sa-card, #fff)" }}
              >
                {a.cover_image ? (
                  <img src={a.cover_image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div
                    className="grid h-14 w-14 shrink-0 place-items-center rounded-xl"
                    style={{ background: a.color ? `${a.color}20` : "#f5f5f5", color: a.color ?? "#666" }}
                  >
                    <Megaphone className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1">
                    {!a.is_read && <span className="h-2 w-2 rounded-full bg-red-500" />}
                    {a.pinned && <Pin className="h-3 w-3 text-neutral-500" />}
                    {a.featured && <Star className="h-3 w-3 text-yellow-500" />}
                    {a.priority === "urgent" && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-red-700 ring-1 ring-red-200">
                        <AlertTriangle className="h-2.5 w-2.5" /> Urgente
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-1 break-words text-sm font-semibold leading-tight ${a.is_read ? "text-neutral-600" : ""}`}
                    style={{ color: a.is_read ? undefined : "var(--sa-title)" }}
                  >
                    {a.title}
                  </p>
                  {a.summary && <p className="mt-0.5 line-clamp-3 break-words text-xs text-neutral-500 leading-normal">{a.summary}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

    </section>
  );
}


function BlockRenderer({
  block,
  config,
  student,
  belt,
  openInvoices,
  lastCheckin,
  news,
  isLoading,
}: {
  block: HomeBlock;
  config: typeof DEFAULT_CONFIG;
  student: any;
  belt: any;
  openInvoices: any[];
  lastCheckin: any;
  news: any[];
  isLoading: boolean;
}) {
  switch (block.type) {
    case "welcome":
      return (
        <section
          className="overflow-hidden rounded-2xl p-5 shadow-sm ring-1 ring-neutral-100"
          style={{ background: "var(--sa-card, #ffffff)" }}
        >
          <div className="flex items-center gap-4">
            {student?.photo_url ? (
              <img src={student.photo_url} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-white shadow" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-full bg-neutral-100 text-lg font-bold text-neutral-400">
                {student?.full_name?.[0] ?? "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold" style={{ color: "var(--sa-title)" }}>
                {student?.full_name ?? (isLoading ? "…" : "—")}
              </div>
              {belt && (
                <div className="mt-1">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                    style={{ background: belt.color_hex }}
                  >
                    {formatBeltName(belt.name, (belt as any)?.modality)}

                    {degreeSuffix(student?.current_degree, (belt as any)?.modality, " · ", belt?.name)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Info label="Último check-in" value={fmtDate(lastCheckin?.checked_in_at)} />
            <Info
              label="Faturas abertas"
              value={openInvoices.length ? `${openInvoices.length} pend.` : "Em dia"}
              tone={openInvoices.length ? "warn" : "ok"}
            />
          </div>
        </section>
      );

    case "banner": {
      const banners = news.filter((n) => n.kind === "banner");
      if (banners.length === 0) return null;
      const b = banners[0];
      return (
        <a
          href={b.cta_link ?? "#"}
          target={b.cta_link ? "_blank" : undefined}
          rel="noreferrer"
          className="block overflow-hidden rounded-2xl shadow-sm ring-1 ring-neutral-100"
        >
          {b.image_url ? (
            <img src={b.image_url} alt={b.title} className="h-36 w-full object-cover" />
          ) : (
            <div className="h-36 w-full" style={{ background: "var(--sa-primary)" }} />
          )}
          <div className="p-3" style={{ background: "var(--sa-card)" }}>
            <div className="text-sm font-semibold" style={{ color: "var(--sa-title)" }}>{b.title}</div>
            {b.body && <div className="mt-0.5 text-xs text-neutral-500 line-clamp-2">{b.body}</div>}
          </div>
        </a>
      );
    }

    case "open_invoices":
      if (openInvoices.length === 0 || config.features.finance === false) return null;
      return (
        <Link to="/app/finance" className="block">
          <section className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-amber-900">Você tem cobranças em aberto</div>
                <div className="mt-0.5 text-xs text-amber-800">
                  Próximo vencimento em {new Date(openInvoices[0].due_date).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-amber-700" />
            </div>
          </section>
        </Link>
      );

    case "shortcuts": {
      const rawKeys = block.items ?? Object.keys(SHORTCUT_META);
      // Garante que "Documentos" e "Ranking" apareçam sempre que o feature estiver
      // ativo, mesmo em configurações salvas antes de os atalhos existirem.
      const withDocs = rawKeys.includes("documents") ? rawKeys : [...rawKeys, "documents"];
      const keys = withDocs.includes("ranking") ? withDocs : [...withDocs, "ranking"];
      const items = keys
        .map((k) => ({ key: k, meta: SHORTCUT_META[k] }))
        .filter((x) => x.meta && (!x.meta.feature || config.features[x.meta.feature] !== false));
      if (items.length === 0) return null;
      return (
        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            {block.title ?? "Acesso rápido"}
          </h2>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-4">
            {items.map(({ key, meta }) => {
              const Icon = Icons[meta.icon] as React.ComponentType<{ className?: string }>;
              return (
                <Link
                  key={key}
                  to={meta.to}
                  className="group flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-center shadow-sm ring-1 ring-neutral-100 transition active:scale-95"
                  style={{ background: "var(--sa-card)" }}
                >
                  <span
                    className="grid h-11 w-11 place-items-center rounded-xl text-white transition-transform group-hover:scale-105"
                    style={{ background: "var(--sa-button, var(--sa-primary, #dc2626))" }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-medium leading-tight text-neutral-700">{meta.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      );
    }

    case "news": {
      const list = news.filter((n) => n.kind !== "banner").slice(0, 5);
      if (list.length === 0 || config.features.news === false) return null;
      return (
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {block.title ?? "Novidades"}
            </h2>
            <Link to="/app/news" className="text-[11px] font-medium" style={{ color: "var(--sa-primary)" }}>
              Ver todas
            </Link>
          </div>
          <ul className="space-y-2">
            {list.map((n) => (
              <li
                key={n.id}
                className="flex gap-3 rounded-2xl p-3 shadow-sm ring-1 ring-neutral-100"
                style={{ background: "var(--sa-card)" }}
              >
                {n.image_url && <img src={n.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold" style={{ color: "var(--sa-title)" }}>{n.title}</div>
                  {n.body && <div className="mt-0.5 text-xs text-neutral-500 line-clamp-2">{n.body}</div>}
                  {n.cta_link && (
                    <a href={n.cta_link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-medium" style={{ color: "var(--sa-primary)" }}>
                      {n.cta_label ?? "Ver mais"}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      );
    }

    case "graduation":
      if (!belt) return null;
      return (
        <Link to="/app/graduations" className="block">
          <section className="rounded-2xl p-4 shadow-sm ring-1 ring-neutral-100" style={{ background: "var(--sa-card)" }}>
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Sua faixa</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block h-3 w-8 rounded-sm" style={{ background: belt.color_hex }} />
              <span className="text-sm font-semibold" style={{ color: "var(--sa-title)" }}>{formatBeltName(belt.name, (belt as any)?.modality)}</span>
            </div>
          </section>
        </Link>
      );

    default:
      return null;
  }
}

function Info({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${tone === "warn" ? "text-amber-700" : tone === "ok" ? "text-emerald-700" : "text-neutral-900"}`}>
        {value}
      </div>
    </div>
  );
}
