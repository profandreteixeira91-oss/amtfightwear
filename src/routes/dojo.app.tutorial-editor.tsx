import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Save, Trash2, Play, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  TUTORIAL_CATEGORIES,
  type TutorialAction,
  type TutorialCategory,
  type TutorialStep,
  type TutorialTrack,
} from "@/lib/dojo/tutorial/tracks";
import {
  deleteCustomTrack,
  listCustomTracks,
  saveCustomTrack,
} from "@/lib/dojo/tutorial/custom-tracks";
import { useTutorial } from "@/components/dojo/tutorial/TutorialProvider";
import { OwnerOnly } from "@/lib/auth/owner-only";

export const Route = createFileRoute("/dojo/app/tutorial-editor")({
  head: () => ({
    meta: [
      { title: "Editor de tutoriais | AMT Dojo Manager" },
      {
        name: "description",
        content:
          "Crie e publique tutoriais guiados personalizados para a sua equipe, sem escrever uma linha de código.",
      },
      { property: "og:title", content: "Editor de tutoriais | AMT Dojo Manager" },
      {
        property: "og:description",
        content: "Monte passo a passo interativo com alvo, ação esperada e validação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EditorRoute,
});

/** Rota oculta: apenas a conta proprietária tem acesso. */
function EditorRoute() {
  return (
    <OwnerOnly>
      <EditorPage />
    </OwnerOnly>
  );
}

const ACTIONS: TutorialAction[] = [
  "none",
  "click",
  "input",
  "select",
  "navigate",
  "submit",
  "upload",
  "confirm",
  "create",
  "edit",
  "delete",
  "export",
  "print",
];

const ACTION_PT: Record<TutorialAction, string> = {
  none: "Apenas informação",
  click: "Esperar clique",
  input: "Esperar preenchimento",
  select: "Esperar seleção",
  navigate: "Esperar navegação",
  submit: "Esperar envio",
  upload: "Esperar upload",
  confirm: "Esperar confirmação",
  create: "Esperar criação",
  edit: "Esperar edição",
  delete: "Esperar exclusão",
  export: "Esperar exportação",
  print: "Esperar impressão",
};

const emptyStep = (): TutorialStep => ({ title: "", text: "", action: "none", seconds: 20 });

const emptyTrack = (): TutorialTrack => ({
  id: `custom-${Date.now()}`,
  title: "",
  question: "",
  category: "Primeiros passos",
  duration: "3 min",
  route: "/dojo/app",
  steps: [emptyStep()],
  custom: true,
});

function EditorPage() {
  const { start } = useTutorial();
  const [list, setList] = useState<TutorialTrack[]>([]);
  const [draft, setDraft] = useState<TutorialTrack>(emptyTrack);

  useEffect(() => setList(listCustomTracks()), []);

  const update = (patch: Partial<TutorialTrack>) => setDraft((d) => ({ ...d, ...patch }));
  const updateStep = (i: number, patch: Partial<TutorialStep>) =>
    setDraft((d) => ({
      ...d,
      steps: d.steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));

  const save = () => {
    if (!draft.title.trim() || !draft.question.trim()) {
      toast.error("Informe o título e a dúvida do tutorial.");
      return;
    }
    if (draft.steps.some((s) => !s.text.trim())) {
      toast.error("Todos os passos precisam de uma instrução.");
      return;
    }
    saveCustomTrack(draft);
    setList(listCustomTracks());
    toast.success("Tutorial publicado na biblioteca.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5">
            <Link to="/dojo/app/tutorial">
              <ArrowLeft className="h-4 w-4" /> Voltar à biblioteca
            </Link>
          </Button>
          <h2 className="mt-1 font-display text-xl font-bold">Editor de tutoriais</h2>
          <p className="text-sm text-muted-foreground">
            Monte tutoriais guiados personalizados para a sua equipe, com alvo na tela, ação esperada
            e validação — sem programação.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDraft(emptyTrack())} className="gap-1.5">
            <Plus className="h-4 w-4" /> Novo
          </Button>
          <Button onClick={save} className="gap-1.5">
            <Save className="h-4 w-4" /> Publicar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Título</Label>
                <Input value={draft.title} onChange={(e) => update({ title: e.target.value })} placeholder="Cadastrar aluno" />
              </div>
              <div>
                <Label>Dúvida do usuário</Label>
                <Input
                  value={draft.question}
                  onChange={(e) => update({ question: e.target.value })}
                  placeholder="Como cadastro um novo aluno?"
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select
                  value={draft.category}
                  onValueChange={(v) => update({ category: v as TutorialCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TUTORIAL_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rota inicial</Label>
                <Input value={draft.route} onChange={(e) => update({ route: e.target.value })} placeholder="/dojo/app/students" />
              </div>
            </div>
          </Card>

          {draft.steps.map((s, i) => (
            <Card key={i} className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <GripVertical className="h-4 w-4 text-muted-foreground" /> Passo {i + 1}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      steps: d.steps.length > 1 ? d.steps.filter((_, idx) => idx !== i) : d.steps,
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Título do passo</Label>
                  <Input value={s.title ?? ""} onChange={(e) => updateStep(i, { title: e.target.value })} />
                </div>
                <div>
                  <Label>Componente alvo</Label>
                  <Input
                    value={s.target ?? ""}
                    onChange={(e) => updateStep(i, { target: e.target.value })}
                    placeholder="text:Novo aluno  ou  [data-tour='x']"
                  />
                </div>
              </div>

              <div>
                <Label>Instrução</Label>
                <Textarea rows={2} value={s.text} onChange={(e) => updateStep(i, { text: e.target.value })} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Objetivo</Label>
                  <Input value={s.objective ?? ""} onChange={(e) => updateStep(i, { objective: e.target.value })} />
                </div>
                <div>
                  <Label>Dica</Label>
                  <Input value={s.hint ?? ""} onChange={(e) => updateStep(i, { hint: e.target.value })} />
                </div>
                <div>
                  <Label>Ação esperada</Label>
                  <Select
                    value={s.action ?? "none"}
                    onValueChange={(v) => updateStep(i, { action: v as TutorialAction })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIONS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {ACTION_PT[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Rota do passo</Label>
                  <Input value={s.route ?? ""} onChange={(e) => updateStep(i, { route: e.target.value })} />
                </div>
                <div>
                  <Label>Só exibir se existir (seletor)</Label>
                  <Input value={s.requires ?? ""} onChange={(e) => updateStep(i, { requires: e.target.value })} />
                </div>
                <div>
                  <Label>Tempo estimado (segundos)</Label>
                  <Input
                    type="number"
                    value={s.seconds ?? 20}
                    onChange={(e) => updateStep(i, { seconds: Number(e.target.value) || 20 })}
                  />
                </div>
              </div>
            </Card>
          ))}

          <Button
            variant="outline"
            className="w-full gap-1.5"
            onClick={() => setDraft((d) => ({ ...d, steps: [...d.steps, emptyStep()] }))}
          >
            <Plus className="h-4 w-4" /> Adicionar passo
          </Button>
        </div>

        <Card className="h-fit space-y-3 p-4">
          <div className="text-sm font-semibold">Tutoriais personalizados</div>
          {list.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum tutorial criado ainda.</p>
          )}
          {list.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-[color:var(--dojo-border)] p-2.5"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => setDraft(t)}
              >
                <div className="truncate text-xs font-semibold">{t.title}</div>
                <div className="text-[11px] text-muted-foreground">{t.steps.length} passos</div>
              </button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => start(t.id)}>
                <Play className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => {
                  deleteCustomTrack(t.id);
                  setList(listCustomTracks());
                  toast.success("Tutorial removido.");
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
