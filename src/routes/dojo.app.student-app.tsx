import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as Icons from "lucide-react";
import {
  adminGetStudentAppConfig,
  adminSaveDraft,
  adminPublishConfig,
  adminListAppVersions,
  adminRestoreAppVersion,
  adminListAppNews,
  adminUpsertAppNews,
  adminDeleteAppNews,
} from "@/lib/student-app/config.functions";
import {
  DEFAULT_CONFIG,
  FEATURE_LABELS,
  type StudentAppConfig,
  type NavItem,
  type HomeBlock,
  type FeatureKey,
} from "@/lib/student-app/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dojo/app/student-app")({
  head: () => ({ meta: [{ title: "Editor do App do Aluno — AMT Dojo Manager" }] }),
  component: StudentAppEditor,
});

// ================================================================
// Root
// ================================================================
function StudentAppEditor() {
  const qc = useQueryClient();
  const getFn = useServerFn(adminGetStudentAppConfig);
  const saveFn = useServerFn(adminSaveDraft);
  const publishFn = useServerFn(adminPublishConfig);

  const { data, isLoading } = useQuery({ queryKey: ["admin", "student-app-config"], queryFn: () => getFn({}) });

  const [draft, setDraft] = useState<StudentAppConfig | null>(null);
  const [device, setDevice] = useState<"iphone" | "android" | "tablet">("iphone");

  useEffect(() => {
    if (data && !draft) setDraft(data.draft);
  }, [data, draft]);

  const dirty = useMemo(() => {
    if (!draft || !data) return false;
    return JSON.stringify(draft) !== JSON.stringify(data.draft) || data.has_unpublished_changes;
  }, [draft, data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      await saveFn({ data: { draft } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "student-app-config"] });
      toast.success("Rascunho salvo");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publishMut = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      await saveFn({ data: { draft } });
      await publishFn({ data: { label: null } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "student-app-config"] });
      qc.invalidateQueries({ queryKey: ["admin", "student-app-versions"] });
      qc.invalidateQueries({ queryKey: ["student", "app-config"] });
      toast.success("Publicado! Os alunos verão as alterações.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !draft) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando editor…</div>;
  }

  const setAppearance = (patch: Partial<StudentAppConfig["appearance"]>) =>
    setDraft((d) => (d ? { ...d, appearance: { ...d.appearance, ...patch } } : d));
  const setFeatures = (patch: Partial<StudentAppConfig["features"]>) =>
    setDraft((d) => (d ? { ...d, features: { ...d.features, ...patch } } : d));
  const setNav = (nav: NavItem[]) => setDraft((d) => (d ? { ...d, bottom_nav: nav } : d));
  const setBlocks = (blocks: HomeBlock[]) => setDraft((d) => (d ? { ...d, home_blocks: blocks } : d));
  const setLogin = (patch: Partial<StudentAppConfig["login"]>) =>
    setDraft((d) => (d ? { ...d, login: { ...d.login, ...patch } } : d));
  const setNotifications = (patch: Partial<StudentAppConfig["notifications"]>) =>
    setDraft((d) => (d ? { ...d, notifications: { ...d.notifications, ...patch } } : d));

  return (
    <div className="dojo-theme flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editor do App do Aluno</h1>
          <p className="text-sm text-muted-foreground">
            Versão publicada:{" "}
            <span className="font-mono">v{data?.version ?? 0}</span> ·{" "}
            {data?.has_unpublished_changes || dirty ? (
              <Badge variant="secondary" className="ml-1">Alterações não publicadas</Badge>
            ) : (
              <Badge className="ml-1">Publicado</Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={device} onValueChange={(v) => setDevice(v as typeof device)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="iphone">iPhone</SelectItem>
              <SelectItem value="android">Android</SelectItem>
              <SelectItem value="tablet">Tablet</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Salvando…" : "Salvar rascunho"}
          </Button>
          <Button onClick={() => publishMut.mutate()} disabled={publishMut.isPending}>
            {publishMut.isPending ? "Publicando…" : "Publicar"}
          </Button>
        </div>
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="flex flex-col overflow-hidden">
          <Tabs defaultValue="appearance" className="flex flex-1 flex-col overflow-hidden">
            <div className="mx-3 mt-3 overflow-x-auto">
              <TabsList className="inline-flex h-auto w-max gap-1 whitespace-nowrap">
                <TabsTrigger value="appearance">Aparência</TabsTrigger>
                <TabsTrigger value="features">Funcionalidades</TabsTrigger>
                <TabsTrigger value="home">Tela Inicial</TabsTrigger>
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="news">Notícias &amp; Banners</TabsTrigger>
                <TabsTrigger value="notifications">Notificações</TabsTrigger>
                <TabsTrigger value="versions">Versões</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <TabsContent value="appearance" className="m-0">
                <AppearancePanel value={draft.appearance} onChange={setAppearance} />
              </TabsContent>
              <TabsContent value="features" className="m-0">
                <FeaturesPanel value={draft.features} onChange={setFeatures} />
              </TabsContent>
              <TabsContent value="home" className="m-0">
                <HomeBlocksPanel value={draft.home_blocks} onChange={setBlocks} />
              </TabsContent>
              <TabsContent value="login" className="m-0">
                <LoginPanel value={draft.login} onChange={setLogin} />
              </TabsContent>
              <TabsContent value="news" className="m-0">
                <NewsPanel />
              </TabsContent>
              <TabsContent value="notifications" className="m-0">
                <NotificationsPanel value={draft.notifications} onChange={setNotifications} />
              </TabsContent>
              <TabsContent value="versions" className="m-0">
                <VersionsPanel />
              </TabsContent>
            </div>
          </Tabs>
        </Card>

        <Card className="overflow-auto p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pré-visualização</div>
          <DevicePreview device={device} config={draft} />
        </Card>
      </div>
    </div>
  );
}

// ================================================================
// Aparência
// ================================================================
function AppearancePanel({ value, onChange }: { value: StudentAppConfig["appearance"]; onChange: (p: Partial<StudentAppConfig["appearance"]>) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Nome do aplicativo">
        <Input value={value.app_name} onChange={(e) => onChange({ app_name: e.target.value })} />
      </Field>
      <Field label="Tipografia">
        <Select value={value.font_family} onValueChange={(v) => onChange({ font_family: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["Inter", "Roboto", "Poppins", "Montserrat", "Nunito", "Manrope"].map((f) => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <ImageUpload label="Logotipo" url={value.logo_url} onChange={(u) => onChange({ logo_url: u })} />
      <ImageUpload label="Ícone do app" url={value.app_icon_url} onChange={(u) => onChange({ app_icon_url: u })} />
      <ImageUpload label="Splash Screen" url={value.splash_url} onChange={(u) => onChange({ splash_url: u })} />
      <ImageUpload label="Fundo do login" url={value.login_bg_url} onChange={(u) => onChange({ login_bg_url: u })} />
      <ImageUpload label="Imagem da tela inicial" url={value.home_hero_url} onChange={(u) => onChange({ home_hero_url: u })} />

      <ColorField label="Cor primária" value={value.brand_primary} onChange={(c) => onChange({ brand_primary: c })} />
      <ColorField label="Cor secundária" value={value.brand_secondary} onChange={(c) => onChange({ brand_secondary: c })} />
      <ColorField label="Cor dos botões" value={value.button_color ?? value.brand_primary} onChange={(c) => onChange({ button_color: c })} />
      <ColorField label="Barra inferior" value={value.bottom_nav_color} onChange={(c) => onChange({ bottom_nav_color: c })} />
      <ColorField label="Cor dos cards" value={value.card_color} onChange={(c) => onChange({ card_color: c })} />
      <ColorField label="Cor dos títulos" value={value.title_color} onChange={(c) => onChange({ title_color: c })} />

      <Field label="Modo (estrutura preparada)">
        <Select value={value.theme_mode} onValueChange={(v) => onChange({ theme_mode: v as "light" | "dark" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Claro</SelectItem>
            <SelectItem value="dark">Escuro</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

// ================================================================
// Navegação
// ================================================================
function NavigationPanel({ value, onChange }: { value: NavItem[]; onChange: (v: NavItem[]) => void }) {
  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = value.findIndex((i) => i.id === active.id);
    const newIdx = value.findIndex((i) => i.id === over.id);
    onChange(arrayMove(value, oldIdx, newIdx));
  }

  function updateItem(id: string, patch: Partial<NavItem>) {
    onChange(value.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function remove(id: string) {
    onChange(value.filter((it) => it.id !== id));
  }
  function add() {
    if (value.length >= 5) {
      toast.warning("Máximo de 5 itens na barra inferior");
      return;
    }
    onChange([...value, { id: crypto.randomUUID(), label: "Novo", icon: "star", route: "/app/home" }]);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Arraste para reordenar. Marque um item como destaque (círculo elevado no centro).</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={value.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {value.map((item) => (
              <SortableNavRow key={item.id} item={item} onChange={(p) => updateItem(item.id, p)} onRemove={() => remove(item.id)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button variant="outline" onClick={add}><Icons.Plus className="mr-2 h-4 w-4" />Adicionar item</Button>
    </div>
  );
}

function SortableNavRow({ item, onChange, onRemove }: { item: NavItem; onChange: (p: Partial<NavItem>) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
      <button {...attributes} {...listeners} className="cursor-grab touch-none rounded p-1 hover:bg-muted">
        <Icons.GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <Input className="w-32" value={item.label} onChange={(e) => onChange({ label: e.target.value })} placeholder="Rótulo" />
      <Input className="w-40" value={item.icon} onChange={(e) => onChange({ icon: e.target.value })} placeholder="Ícone (lucide)" />
      <Input className="w-52 flex-1" value={item.route} onChange={(e) => onChange({ route: e.target.value })} placeholder="/app/…" />
      <label className="flex items-center gap-2 text-xs">
        <Switch checked={!!item.primary} onCheckedChange={(v) => onChange({ primary: v })} />
        Destaque
      </label>
      <Button size="sm" variant="ghost" onClick={onRemove}><Icons.Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}

// ================================================================
// Funcionalidades
// ================================================================
function FeaturesPanel({ value, onChange }: { value: StudentAppConfig["features"]; onChange: (p: Partial<StudentAppConfig["features"]>) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {(Object.keys(FEATURE_LABELS) as FeatureKey[]).map((k) => (
        <label key={k} className="flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-muted/40">
          <span className="text-sm font-medium">{FEATURE_LABELS[k]}</span>
          <Switch checked={value[k]} onCheckedChange={(v) => onChange({ [k]: v } as Partial<StudentAppConfig["features"]>)} />
        </label>
      ))}
    </div>
  );
}

// ================================================================
// Blocos da tela inicial
// ================================================================
const BLOCK_TYPE_LABELS: Record<HomeBlock["type"], string> = {
  welcome: "Boas-vindas",
  banner: "Banner",
  next_class: "Próxima aula",
  shortcuts: "Atalhos",
  news: "Notícias",
  open_invoices: "Cobranças em aberto",
  graduation: "Graduação",
  videos_carousel: "Carrossel de vídeos",
  competitions: "Competições",
  certificates: "Certificados",
};

function HomeBlocksPanel({ value, onChange }: { value: HomeBlock[]; onChange: (v: HomeBlock[]) => void }) {
  const sensors = useSensors(useSensor(PointerSensor));
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = value.findIndex((b) => b.id === active.id);
    const newIdx = value.findIndex((b) => b.id === over.id);
    onChange(arrayMove(value, oldIdx, newIdx));
  }
  function toggle(id: string) {
    onChange(value.map((b) => (b.id === id ? { ...b, visible: !b.visible } : b)));
  }
  function addBlock(type: HomeBlock["type"]) {
    onChange([...value, { id: crypto.randomUUID(), type, visible: true }]);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Arraste para reordenar os blocos exibidos na tela inicial do app.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={value.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {value.map((b) => (
              <SortableBlockRow key={b.id} block={b} onToggle={() => toggle(b.id)} onRemove={() => onChange(value.filter((x) => x.id !== b.id))} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(BLOCK_TYPE_LABELS) as HomeBlock["type"][]).map((t) => (
          <Button key={t} size="sm" variant="outline" onClick={() => addBlock(t)}>
            <Icons.Plus className="mr-1 h-3 w-3" />{BLOCK_TYPE_LABELS[t]}
          </Button>
        ))}
      </div>
    </div>
  );
}

function SortableBlockRow({ block, onToggle, onRemove }: { block: HomeBlock; onToggle: () => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-lg border p-3">
      <button {...attributes} {...listeners} className="cursor-grab touch-none rounded p-1 hover:bg-muted">
        <Icons.GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex-1">
        <div className="text-sm font-medium">{BLOCK_TYPE_LABELS[block.type]}</div>
        <div className="text-xs text-muted-foreground">{block.visible ? "Visível" : "Oculto"}</div>
      </div>
      <Switch checked={block.visible} onCheckedChange={onToggle} />
      <Button size="sm" variant="ghost" onClick={onRemove}><Icons.Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}

// ================================================================
// Login
// ================================================================
function LoginPanel({ value, onChange }: { value: StudentAppConfig["login"]; onChange: (p: Partial<StudentAppConfig["login"]>) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Título"><Input value={value.title} onChange={(e) => onChange({ title: e.target.value })} /></Field>
      <Field label="Subtítulo"><Input value={value.subtitle} onChange={(e) => onChange({ subtitle: e.target.value })} /></Field>
      <div className="md:col-span-2">
        <Field label="Texto institucional">
          <Textarea value={value.institutional_text ?? ""} onChange={(e) => onChange({ institutional_text: e.target.value || null })} />
        </Field>
      </div>
      <ColorField label="Cor do botão" value={value.button_color ?? "#dc2626"} onChange={(c) => onChange({ button_color: c })} />
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <Switch checked={value.welcome_screen_enabled} onCheckedChange={(v) => onChange({ welcome_screen_enabled: v })} />
        <div className="text-sm">Habilitar tela de boas-vindas</div>
      </div>
      <div className="md:col-span-2">
        <Field label="Mensagem de boas-vindas">
          <Textarea value={value.welcome_screen_message ?? ""} onChange={(e) => onChange({ welcome_screen_message: e.target.value || null })} />
        </Field>
      </div>
    </div>
  );
}

// ================================================================
// Notícias
// ================================================================
function NewsPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListAppNews);
  const upsertFn = useServerFn(adminUpsertAppNews);
  const deleteFn = useServerFn(adminDeleteAppNews);
  const { data: list } = useQuery({ queryKey: ["admin", "app-news"], queryFn: () => listFn({}) });
  const [editing, setEditing] = useState<any | null>(null);

  const save = useMutation({
    mutationFn: (input: any) => upsertFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "app-news"] });
      qc.invalidateQueries({ queryKey: ["student", "app-news"] });
      setEditing(null);
      toast.success("Salvo");
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "app-news"] });
      qc.invalidateQueries({ queryKey: ["student", "app-news"] });
    },
  });

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Tipo">
            <Select value={editing.kind} onValueChange={(v) => setEditing({ ...editing, kind: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="news">Notícia</SelectItem>
                <SelectItem value="banner">Banner</SelectItem>
                <SelectItem value="announcement">Comunicado</SelectItem>
                <SelectItem value="event">Evento</SelectItem>
                <SelectItem value="promo">Promoção</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Prioridade"><Input type="number" value={editing.priority ?? 0} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} /></Field>
          <div className="md:col-span-2"><Field label="Título"><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field></div>
          <div className="md:col-span-2"><Field label="Descrição"><Textarea value={editing.body ?? ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></Field></div>
          <ImageUpload label="Imagem" url={editing.image_url} onChange={(u) => setEditing({ ...editing, image_url: u })} />
          <Field label="Rótulo do botão"><Input value={editing.cta_label ?? ""} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} /></Field>
          <Field label="Link do botão"><Input value={editing.cta_link ?? ""} onChange={(e) => setEditing({ ...editing, cta_link: e.target.value })} /></Field>
          <Field label="Início">
            <Input type="datetime-local" value={editing.starts_at ? editing.starts_at.slice(0, 16) : ""} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
          </Field>
          <Field label="Término">
            <Input type="datetime-local" value={editing.ends_at ? editing.ends_at.slice(0, 16) : ""} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
          </Field>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Switch checked={editing.active !== false} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
            <div className="text-sm">Ativo</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => save.mutate(editing)} disabled={save.isPending}>Salvar</Button>
          <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ kind: "news", title: "", active: true, priority: 0 })}>
          <Icons.Plus className="mr-2 h-4 w-4" />Nova notícia
        </Button>
      </div>
      {list && list.length > 0 ? (
        <div className="space-y-2">
          {list.map((n: any) => (
            <div key={n.id} className="flex items-center gap-3 rounded-lg border p-3">
              {n.image_url && <img src={n.image_url} alt="" className="h-12 w-12 rounded object-cover" />}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{n.title}</div>
                <div className="text-xs text-muted-foreground">
                  {n.kind} · prioridade {n.priority} · {n.active ? "ativo" : "inativo"}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditing(n)}><Icons.Pencil className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(n.id)}><Icons.Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">Nenhuma notícia cadastrada.</div>
      )}
    </div>
  );
}

// ================================================================
// Notificações
// ================================================================
function NotificationsPanel({ value, onChange }: { value: StudentAppConfig["notifications"]; onChange: (p: Partial<StudentAppConfig["notifications"]>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Mensagem de boas-vindas (in-app)">
        <Textarea value={value.welcome_message} onChange={(e) => onChange({ welcome_message: e.target.value })} />
      </Field>
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <Switch checked={value.push_enabled} onCheckedChange={(v) => onChange({ push_enabled: v })} />
        <div>
          <div className="text-sm font-medium">Push Notifications</div>
          <div className="text-xs text-muted-foreground">Estrutura preparada — requer configuração de provedor de push.</div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// Versões
// ================================================================
function VersionsPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListAppVersions);
  const restoreFn = useServerFn(adminRestoreAppVersion);
  const { data } = useQuery({ queryKey: ["admin", "student-app-versions"], queryFn: () => listFn({}) });
  const restore = useMutation({
    mutationFn: (version: number) => restoreFn({ data: { version } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "student-app-config"] });
      toast.success("Versão restaurada no rascunho. Revise e publique.");
    },
  });
  if (!data || data.length === 0) {
    return <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">Nenhuma publicação ainda.</div>;
  }
  return (
    <div className="space-y-2">
      {data.map((v: any) => (
        <div key={v.id} className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="text-sm font-semibold">v{v.version} {v.label ? `— ${v.label}` : ""}</div>
            <div className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString("pt-BR")}</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => restore.mutate(v.version)}>
            <Icons.RotateCcw className="mr-2 h-4 w-4" />Restaurar no rascunho
          </Button>
        </div>
      ))}
    </div>
  );
}

// ================================================================
// Preview do dispositivo
// ================================================================
type PreviewScreen = "login" | "home" | FeatureKey;

const SCREEN_LABELS: Record<string, string> = {
  login: "Login",
  home: "Tela inicial",
  ...FEATURE_LABELS,
};

function DevicePreview({ device, config }: { device: "iphone" | "android" | "tablet"; config: StudentAppConfig }) {
  const size = device === "tablet" ? { w: 380, h: 640 } : device === "android" ? { w: 300, h: 620 } : { w: 300, h: 640 };
  const radius = device === "iphone" ? 40 : device === "android" ? 26 : 20;

  const enabledFeatures = (Object.keys(config.features) as FeatureKey[]).filter((k) => config.features[k]);
  const screens: PreviewScreen[] = ["login", "home", ...enabledFeatures];
  const [screen, setScreen] = useState<PreviewScreen>("home");
  useEffect(() => {
    if (!screens.includes(screen)) setScreen("home");
  }, [screens.join(","), screen]);

  return (
    <div className="mx-auto" style={{ width: size.w }}>
      <div className="mb-3">
        <Select value={screen} onValueChange={(v) => setScreen(v as PreviewScreen)}>
          <SelectTrigger className="w-full text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {screens.map((s) => (
              <SelectItem key={s} value={s}>{SCREEN_LABELS[s] ?? s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div
        className="relative overflow-hidden border-[10px] border-neutral-900 shadow-xl"
        style={{ width: size.w, height: size.h, borderRadius: radius, background: "#f5f5f5" }}
      >
        <div className="flex h-full flex-col" style={{ fontFamily: `${config.appearance.font_family}, system-ui, sans-serif` }}>
          {screen === "login" ? (
            <PreviewLogin config={config} />
          ) : (
            <>
              <div className="flex items-center gap-2 border-b bg-white px-3 py-2">
                {config.appearance.logo_url ? (
                  <img src={config.appearance.logo_url} alt="" className="h-7 w-7 rounded-md object-cover" />
                ) : (
                  <div className="h-7 w-7 rounded-md" style={{ background: config.appearance.brand_primary }} />
                )}
                <div className="truncate text-xs font-bold" style={{ color: config.appearance.title_color }}>{config.appearance.app_name}</div>
              </div>
              <div className="flex-1 overflow-auto p-3">
                {screen === "home" ? (
                  <PreviewHome config={config} />
                ) : (
                  <PreviewFeature featureKey={screen as FeatureKey} config={config} />
                )}
              </div>
              <div className="border-t px-2 py-1" style={{ background: config.appearance.bottom_nav_color }}>
                <div className="flex items-stretch justify-around">
                  {config.bottom_nav.map((it) => {
                    const Icon = iconFromName(it.icon);
                    if (it.primary) {
                      return (
                        <div key={it.id} className="-mt-4">
                          <div className="grid h-10 w-10 place-items-center rounded-full text-white shadow-lg ring-2 ring-white" style={{ background: config.appearance.button_color ?? config.appearance.brand_primary }}>
                            <Icon className="h-4 w-4" />
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={it.id} className="flex flex-col items-center py-1 text-[9px] text-neutral-500">
                        <Icon className="h-4 w-4" />
                        {it.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewLogin({ config }: { config: StudentAppConfig }) {
  const bg = config.login?.background_color ?? "#ffffff";
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: bg }}>
      {config.appearance.logo_url ? (
        <img src={config.appearance.logo_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
      ) : (
        <div className="h-14 w-14 rounded-xl" style={{ background: config.appearance.brand_primary }} />
      )}
      <div className="text-sm font-bold" style={{ color: config.appearance.title_color }}>{config.appearance.app_name}</div>
      {config.login?.welcome_text && (
        <div className="text-[10px] text-neutral-500">{config.login.welcome_text}</div>
      )}
      <div className="mt-2 w-full space-y-2">
        <div className="rounded-md border bg-white px-2 py-1.5 text-left text-[10px] text-neutral-400">seu@email.com</div>
        <div className="rounded-md border bg-white px-2 py-1.5 text-left text-[10px] text-neutral-400">••••••••</div>
        <div className="rounded-md py-2 text-[11px] font-semibold text-white" style={{ background: config.appearance.button_color ?? config.appearance.brand_primary }}>Entrar</div>
      </div>
    </div>
  );
}

function PreviewFeature({ featureKey, config }: { featureKey: FeatureKey; config: StudentAppConfig }) {
  const accent = config.appearance.brand_primary;
  const title = FEATURE_LABELS[featureKey];

  const skeletons: Partial<Record<FeatureKey, React.ReactNode>> = {
    checkin: (
      <div className="space-y-2">
        <div className="rounded-xl p-3 text-center ring-1 ring-neutral-200" style={{ background: config.appearance.card_color }}>
          <div className="text-[10px] text-neutral-500">Aula das 19h</div>
          <div className="mt-2 rounded-md py-2 text-[11px] font-semibold text-white" style={{ background: accent }}>Fazer check-in</div>
        </div>
        <div className="rounded-xl p-2 text-[10px] ring-1 ring-neutral-200" style={{ background: config.appearance.card_color }}>Histórico de presenças</div>
      </div>
    ),
    videos: (
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="overflow-hidden rounded-md ring-1 ring-neutral-200">
            <div className="h-14 bg-neutral-200" />
            <div className="p-1 text-[9px]">Aula {i}</div>
          </div>
        ))}
      </div>
    ),
    finance: (
      <div className="space-y-2">
        <div className="rounded-xl p-3 ring-1 ring-neutral-200" style={{ background: config.appearance.card_color }}>
          <div className="text-[10px] text-neutral-500">Mensalidade Nov/25</div>
          <div className="mt-1 text-sm font-bold" style={{ color: accent }}>R$ 220,00</div>
          <div className="mt-2 rounded-md py-1.5 text-center text-[10px] font-semibold text-white" style={{ background: accent }}>Pagar via Pix</div>
        </div>
        <div className="rounded-xl p-2 text-[10px] ring-1 ring-neutral-200" style={{ background: config.appearance.card_color }}>Histórico de pagamentos</div>
      </div>
    ),
    graduations: (
      <div className="rounded-xl p-3 text-center ring-1 ring-neutral-200" style={{ background: config.appearance.card_color }}>
        <div className="text-[10px] text-neutral-500">Faixa atual</div>
        <div className="mx-auto mt-2 h-3 w-24 rounded-sm bg-blue-600" />
        <div className="mt-2 text-[10px]">3 graus</div>
      </div>
    ),
    certificates: (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 rounded-xl p-2 text-[10px] ring-1 ring-neutral-200" style={{ background: config.appearance.card_color }}>
            <Icons.Award className="h-4 w-4" style={{ color: accent }} /> Certificado #{i}
          </div>
        ))}
      </div>
    ),
    news: (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl p-2 ring-1 ring-neutral-200" style={{ background: config.appearance.card_color }}>
            <div className="h-14 rounded-md bg-neutral-200" />
            <div className="mt-1 text-[10px] font-semibold">Notícia {i}</div>
          </div>
        ))}
      </div>
    ),
    agenda: (
      <div className="space-y-2">
        {["Seg 19h", "Ter 20h", "Qui 19h"].map((t) => (
          <div key={t} className="flex items-center justify-between rounded-xl p-2 text-[10px] ring-1 ring-neutral-200" style={{ background: config.appearance.card_color }}>
            <span>{t} — Jiu-Jitsu</span>
            <Icons.ChevronRight className="h-3 w-3" />
          </div>
        ))}
      </div>
    ),
    profile: (
      <div className="space-y-2 text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-neutral-200" />
        <div className="text-xs font-semibold" style={{ color: config.appearance.title_color }}>Nome do Aluno</div>
        <div className="text-[10px] text-neutral-500">Faixa Azul • 2 graus</div>
      </div>
    ),
    evaluations: (
      <div className="space-y-2">
        <div className="rounded-xl p-2 text-[10px] ring-1 ring-neutral-200" style={{ background: config.appearance.card_color }}>Avaliação técnica — 85/100</div>
        <div className="rounded-xl p-2 text-[10px] ring-1 ring-neutral-200" style={{ background: config.appearance.card_color }}>Próxima avaliação em 30 dias</div>
      </div>
    ),
  };

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold" style={{ color: config.appearance.title_color }}>{title}</div>
      {skeletons[featureKey] ?? (
        <div className="rounded-xl p-3 text-[10px] text-neutral-500 ring-1 ring-neutral-200" style={{ background: config.appearance.card_color }}>
          Prévia de <b>{title}</b> — conteúdo será exibido aqui no app do aluno.
        </div>
      )}
    </div>
  );
}

function PreviewHome({ config }: { config: StudentAppConfig }) {
  return (
    <div className="space-y-3">
      {config.home_blocks.filter((b) => b.visible !== false).map((b) => (
        <div key={b.id} className="rounded-xl p-3 text-xs ring-1 ring-neutral-200" style={{ background: config.appearance.card_color }}>
          <div className="text-[10px] font-semibold uppercase text-neutral-400">{BLOCK_TYPE_LABELS[b.type]}</div>
          {b.type === "welcome" && (
            <div className="mt-1 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-neutral-200" />
              <div className="text-[11px] font-semibold" style={{ color: config.appearance.title_color }}>Nome do aluno</div>
            </div>
          )}
          {b.type === "shortcuts" && (
            <div className="mt-1 grid grid-cols-3 gap-1">
              {(b.items ?? ["checkin", "videos", "finance"]).slice(0, 6).map((k) => (
                <div key={k} className="rounded-md p-1 text-center text-[9px]">
                  <div className="mx-auto grid h-6 w-6 place-items-center rounded-md text-white" style={{ background: config.appearance.button_color ?? config.appearance.brand_primary }}>•</div>
                  <div className="mt-1 truncate" style={{ color: config.appearance.title_color }}>{k}</div>
                </div>
              ))}
            </div>
          )}
          {b.type === "banner" && (
            <div className="mt-1 h-16 rounded-md" style={{ background: `linear-gradient(135deg, ${config.appearance.brand_primary}, ${config.appearance.brand_secondary})` }} />
          )}
          {b.type === "news" && <div className="mt-1 text-[10px] text-neutral-500">Últimas notícias aparecerão aqui</div>}
          {b.type === "open_invoices" && <div className="mt-1 text-[10px] text-amber-700">Cobranças em aberto</div>}
          {b.type === "graduation" && <div className="mt-1 text-[10px] text-neutral-500">Sua faixa atual</div>}
        </div>
      ))}
    </div>
  );
}

function iconFromName(name: string) {
  const key = name.split(/[-_ ]+/).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
  return (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[key] ?? Icons.Circle;
}

// ================================================================
// Helpers
// ================================================================
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 font-mono text-xs" />
      </div>
    </Field>
  );
}

function ImageUpload({ label, url, onChange }: { label: string; url: string | null; onChange: (u: string | null) => void }) {
  const [uploading, setUploading] = useState(false);
  async function upload(file: File) {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const path = `${user.id}/student-app/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("dojo-brand").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("dojo-brand").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        {url ? (
          <img src={url} alt="" className="h-14 w-14 rounded-md border object-cover" />
        ) : (
          <div className="grid h-14 w-14 place-items-center rounded-md border bg-muted"><Icons.Image className="h-5 w-5 text-muted-foreground" /></div>
        )}
        <div className="flex-1 space-y-1">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
            <Icons.Upload className="h-3.5 w-3.5" />
            {uploading ? "Enviando…" : "Enviar imagem"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          {url && (
            <button onClick={() => onChange(null)} className="ml-2 text-xs text-red-600 hover:underline">Remover</button>
          )}
        </div>
      </div>
    </Field>
  );
}
