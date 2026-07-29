import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Compass,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
  Star,
  Trophy,
  MonitorPlay,
  Pencil,
  Target,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  TUTORIAL_CATEGORIES,
  trackMinutes,
  type TutorialTrack,
} from "@/lib/dojo/tutorial/tracks";
import { listAllTracks, listFavorites, toggleFavorite } from "@/lib/dojo/tutorial/custom-tracks";
import { useTutorial } from "@/components/dojo/tutorial/TutorialProvider";

export const Route = createFileRoute("/dojo/app/tutorial")({
  head: () => ({
    meta: [
      { title: "Tutorial guiado | AMT Dojo Manager" },
      {
        name: "description",
        content:
          "Central de treinamento do AMT Dojo Manager: tutoriais interativos que guiam você passo a passo dentro do sistema.",
      },
      { property: "og:title", content: "Tutorial guiado | AMT Dojo Manager" },
      {
        property: "og:description",
        content: "Aprenda a usar cada módulo do Dojo Manager com passo a passo interativo e guiado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TutorialPage,
});

type StatusFilter = "Todos" | "Concluídos" | "Em andamento" | "Não iniciados" | "Favoritos";

const STATUS_FILTERS: StatusFilter[] = [
  "Todos",
  "Concluídos",
  "Em andamento",
  "Não iniciados",
  "Favoritos",
];

function TutorialPage() {
  const { start, progress } = useTutorial();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("Todos");
  const [status, setStatus] = useState<StatusFilter>("Todos");
  const [demo, setDemo] = useState(false);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [favs, setFavs] = useState<string[]>([]);

  useEffect(() => {
    setFavs(listFavorites());
    const onChange = () => {
      setFavs(listFavorites());
      setCatalogVersion((v) => v + 1);
    };
    window.addEventListener("dojo-tutorial-catalog", onChange);
    return () => window.removeEventListener("dojo-tutorial-catalog", onChange);
  }, []);

  const tracks = useMemo(() => listAllTracks(), [catalogVersion]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tracks.filter((t) => {
      if (cat !== "Todos" && t.category !== cat) return false;
      const st = progress[t.id]?.status;
      if (status === "Concluídos" && st !== "completed") return false;
      if (status === "Em andamento" && st !== "in_progress") return false;
      if (status === "Não iniciados" && st) return false;
      if (status === "Favoritos" && !favs.includes(t.id)) return false;
      if (!needle) return true;
      const hay = `${t.title} ${t.question} ${t.category} ${t.steps
        .map((s) => `${s.title ?? ""} ${s.text} ${s.objective ?? ""}`)
        .join(" ")}`.toLowerCase();
      return needle.split(/\s+/).some((w) => hay.includes(w));
    });
  }, [cat, favs, progress, q, status, tracks]);

  const completed = tracks.filter((t) => progress[t.id]?.status === "completed").length;
  const inProgress = tracks.filter((t) => progress[t.id]?.status === "in_progress").length;
  const pct = tracks.length ? Math.round((completed / tracks.length) * 100) : 0;
  const modules = new Set(
    tracks.filter((t) => progress[t.id]?.status === "completed").map((t) => t.category),
  ).size;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-[color:var(--dojo-border)] bg-gradient-to-br from-red-700 via-red-800 to-neutral-950 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> Instrutor virtual
          </div>
          <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
            Qual é a sua dúvida hoje?
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-white/80">
            Escolha um tema e o sistema conduz você passo a passo: destaca o elemento na tela,
            explica a função, mostra o objetivo e só avança depois que a ação é realizada.
          </p>

          <div className="mt-5 max-w-xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ex.: cadastrar aluno, PIX, mensalidade, turma, certificado…"
                className="h-11 border-0 bg-white pl-9 text-black placeholder:text-neutral-500"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat icon={Trophy} label="Tutoriais concluídos" value={`${completed}/${tracks.length}`} />
            <Stat icon={Target} label="Módulos dominados" value={`${modules}`} />
            <Stat icon={Clock} label="Em andamento" value={`${inProgress}`} />
          </div>

          <div className="mt-4 flex items-center gap-3 text-xs text-white/85">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
            </div>
            {pct}% de capacitação na plataforma
          </div>
        </div>
      </section>

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={demo ? "default" : "outline"}
          size="sm"
          onClick={() => setDemo((v) => !v)}
          className="gap-1.5"
        >
          <MonitorPlay className="h-4 w-4" />
          Modo demonstração {demo ? "ativo" : "desligado"}
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to="/dojo/app/tutorial-editor">
            <Pencil className="h-4 w-4" /> Editor de tutoriais
          </Link>
        </Button>
        {demo && (
          <span className="text-xs text-muted-foreground">
            No modo demonstração o tutorial avança sozinho, apenas para você observar o fluxo.
          </span>
        )}
      </div>

      {/* Filtros */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {["Todos", ...TUTORIAL_CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                cat === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-[color:var(--dojo-border)] bg-white text-foreground hover:border-primary/50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                status === s
                  ? "border-foreground bg-foreground text-background"
                  : "border-[color:var(--dojo-border)] bg-transparent text-muted-foreground hover:border-foreground/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Compass className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <div className="font-semibold">Nenhum tutorial encontrado</div>
          <p className="text-sm text-muted-foreground">
            Tente outras palavras ou fale com o suporte pelo menu Ajuda.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <TrackCard
              key={t.id}
              track={t}
              state={progress[t.id]}
              favorite={favs.includes(t.id)}
              onFavorite={() => {
                toggleFavorite(t.id);
                setFavs(listFavorites());
              }}
              onStart={() => start(t.id, { demo })}
              onResume={() => start(t.id, { demo, step: progress[t.id]?.step ?? 0 })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur">
      <Icon className="h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-bold leading-none">{value}</div>
        <div className="truncate text-[11px] text-white/70">{label}</div>
      </div>
    </div>
  );
}

function TrackCard({
  track,
  state,
  favorite,
  onFavorite,
  onStart,
  onResume,
}: {
  track: TutorialTrack;
  state?: { status: string; step: number };
  favorite: boolean;
  onFavorite: () => void;
  onStart: () => void;
  onResume: () => void;
}) {
  const done = state?.status === "completed";
  const inProgress = state?.status === "in_progress";
  const stepPct = inProgress ? Math.round((((state?.step ?? 0) + 1) / track.steps.length) * 100) : 0;

  return (
    <Card className="group flex flex-col justify-between gap-4 p-4 transition-shadow hover:shadow-md">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {track.category}
          </Badge>
          {track.custom && (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              Personalizado
            </Badge>
          )}
          {done && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Concluído
            </span>
          )}
          {inProgress && !done && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
              <Clock className="h-3.5 w-3.5" /> {stepPct}%
            </span>
          )}
          <button
            type="button"
            onClick={onFavorite}
            title="Favoritar"
            className="ml-auto text-muted-foreground transition-colors hover:text-amber-500"
          >
            <Star className={`h-4 w-4 ${favorite ? "fill-amber-400 text-amber-500" : ""}`} />
          </button>
        </div>

        <h3 className="text-sm font-semibold leading-snug">{track.question}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{track.title}</p>

        <ul className="mt-3 space-y-1">
          {track.steps.slice(0, 3).map((s, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              <span className="line-clamp-1">{s.title ?? s.text}</span>
            </li>
          ))}
          {track.steps.length > 3 && (
            <li className="pl-4.5 text-[11px] text-muted-foreground/70">
              +{track.steps.length - 3} passos
            </li>
          )}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[color:var(--dojo-border)]/60 pt-3">
        <span className="text-[11px] text-muted-foreground">
          {track.steps.length} passos · ~{trackMinutes(track)} min
        </span>
        <Button size="sm" onClick={inProgress ? onResume : onStart} className="gap-1.5">
          {done ? <RotateCcw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {done ? "Refazer" : inProgress ? "Continuar" : "Começar"}
        </Button>
      </div>
    </Card>
  );
}
