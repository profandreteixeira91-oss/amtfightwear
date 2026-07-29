import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search,
  Compass,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  TUTORIAL_CATEGORIES,
  TUTORIAL_TRACKS,
  type TutorialTrack,
} from "@/lib/dojo/tutorial/tracks";
import { useTutorial } from "@/components/dojo/tutorial/TutorialProvider";

export const Route = createFileRoute("/dojo/app/tutorial")({
  head: () => ({
    meta: [
      { title: "Tutorial guiado | AMT Dojo Manager" },
      {
        name: "description",
        content:
          "Central de dúvidas do AMT Dojo Manager: escolha um tema e seja guiado passo a passo dentro do próprio sistema.",
      },
      { property: "og:title", content: "Tutorial guiado | AMT Dojo Manager" },
      {
        property: "og:description",
        content: "Aprenda a usar cada módulo do Dojo Manager com passo a passo interativo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TutorialPage,
});

function TutorialPage() {
  const { start, progress } = useTutorial();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("Todos");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return TUTORIAL_TRACKS.filter((t) => {
      const matchCat = cat === "Todos" || t.category === cat;
      if (!matchCat) return false;
      if (!needle) return true;
      const hay = `${t.title} ${t.question} ${t.category} ${t.steps.map((s) => s.text).join(" ")}`.toLowerCase();
      return needle.split(/\s+/).some((w) => hay.includes(w));
    });
  }, [cat, q]);

  const completed = TUTORIAL_TRACKS.filter((t) => progress[t.id]?.status === "completed").length;
  const pct = Math.round((completed / TUTORIAL_TRACKS.length) * 100);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-[color:var(--dojo-border)] bg-gradient-to-br from-red-700 via-red-800 to-neutral-950 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> Central de dúvidas
          </div>
          <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
            Qual é a sua dúvida hoje?
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-white/80">
            Escolha um tema e o sistema te leva até o módulo certo, destacando na tela exatamente
            onde clicar em cada passo.
          </p>

          <div className="mt-5 max-w-xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ex.: cadastrar aluno, cobrança, faixa, check-in…"
                className="h-11 border-0 bg-white pl-9 text-black placeholder:text-neutral-500"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 text-xs text-white/85">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
            </div>
            {completed} de {TUTORIAL_TRACKS.length} tutoriais concluídos
          </div>
        </div>
      </section>

      {/* Categorias */}
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
              onStart={() => start(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TrackCard({
  track,
  state,
  onStart,
}: {
  track: TutorialTrack;
  state?: { status: string; step: number };
  onStart: () => void;
}) {
  const done = state?.status === "completed";
  const inProgress = state?.status === "in_progress";

  return (
    <Card className="group flex flex-col justify-between gap-4 p-4 transition-shadow hover:shadow-md">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {track.category}
          </Badge>
          {done && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Concluído
            </span>
          )}
          {inProgress && !done && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
              <Clock className="h-3.5 w-3.5" /> Em andamento
            </span>
          )}
        </div>

        <h3 className="text-sm font-semibold leading-snug">{track.question}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{track.title}</p>

        <ul className="mt-3 space-y-1">
          {track.steps.slice(0, 3).map((s, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              <span className="line-clamp-1">{s.text}</span>
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
          {track.steps.length} passos · {track.duration}
        </span>
        <Button size="sm" onClick={onStart} className="gap-1.5">
          {done ? <RotateCcw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {done ? "Refazer" : inProgress ? "Continuar" : "Começar"}
        </Button>
      </div>
    </Card>
  );
}
