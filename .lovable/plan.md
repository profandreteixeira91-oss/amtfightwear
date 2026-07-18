
# Editor Visual do App do Aluno (No-Code)

Painel admin em `/dojo/app/student-app` para configurar o portal `/app` sem código. Toda config vive em uma tabela nova (`dojo_student_app_config`) por academia — o app do aluno lê essa config em tempo real e monta a UI dinamicamente.

## Modelo de dados

Uma linha por academia + histórico de versões:

```text
dojo_student_app_config           ← config publicada (1 por owner)
  owner_id, version, published_at, published_by, config jsonb, draft jsonb
dojo_student_app_versions         ← histórico
  owner_id, version, config jsonb, label, author_id, created_at
dojo_student_app_news             ← notícias/banners
  owner_id, type (news|banner), title, body, image_url, cta_label,
  cta_link, starts_at, ends_at, priority, audience, active
```

Formato do `config jsonb` (contrato do app):

```json
{
  "appearance": {
    "app_name": "Team Alpha",
    "logo_url": "...",
    "app_icon_url": "...",
    "splash_url": "...",
    "login_bg_url": "...",
    "home_hero_url": "...",
    "brand_primary": "#dc2626",
    "brand_secondary": "#0a0a0a",
    "button_color": null,
    "bottom_nav_color": "#ffffff",
    "card_color": "#ffffff",
    "title_color": "#0a0a0a",
    "font_family": "Inter",
    "theme_mode": "light"
  },
  "features": {
    "agenda": true, "checkin": true, "videos": true, "graduations": true,
    "certificates": true, "finance": true, "competitions": true,
    "profile": true, "documents": true, "news": true, "messages": false,
    "events": true, "announcements": true, "evaluations": false,
    "attendance": true, "digital_card": false, "store": false,
    "ranking": false, "gamification": false, "training_plan": false
  },
  "audience": { "student": {...features}, "guardian": {...} },
  "bottom_nav": [
    { "id": "home", "label": "Início", "icon": "home", "route": "/app/home" },
    { "id": "agenda", "label": "Agenda", "icon": "calendar", "route": "/app/agenda" },
    { "id": "checkin", "label": "Check-in", "icon": "qr", "route": "/app/checkin", "primary": true },
    { "id": "videos", "label": "Vídeos", "icon": "film", "route": "/app/videos" },
    { "id": "profile", "label": "Perfil", "icon": "user", "route": "/app/profile" }
  ],
  "home_blocks": [
    { "id": "welcome",    "type": "welcome",    "visible": true },
    { "id": "banner",     "type": "banner",     "visible": true },
    { "id": "next_class", "type": "next_class", "visible": true },
    { "id": "shortcuts",  "type": "shortcuts",  "visible": true,
      "items": ["checkin","videos","finance","graduations"] },
    { "id": "news",       "type": "news",       "visible": true },
    { "id": "invoices",   "type": "open_invoices", "visible": true },
    { "id": "graduation", "type": "graduation", "visible": false }
  ],
  "login": {
    "title": "Bem-vindo",
    "subtitle": "Acesse com seu e-mail e senha",
    "institutional_text": null,
    "button_color": null,
    "welcome_screen_enabled": false,
    "welcome_screen_message": null
  },
  "notifications": {
    "welcome_message": "Bem-vindo(a) ao portal!",
    "push_enabled": false
  }
}
```

Publicação = copiar `draft` → `config` + bump `version` + snapshot em `dojo_student_app_versions`. Rollback = pegar linha do histórico e restaurar.

## Backend

`src/lib/student-app/config.functions.ts`:
- `getStudentAppConfig()` — retorna `config` publicada (público-para-aluno via `requireSupabaseAuth`; app do aluno consome). Filtro por owner do aluno logado.
- `adminGetConfig()` — retorna `{ draft, config, version, updated_at }` (admin).
- `adminSaveDraft(patch)` — merge no `draft`.
- `adminPublish(label?)` — draft → config, snapshot na tabela de versões, notifica alunos.
- `adminListVersions()`, `adminRestoreVersion(version)`, `adminDuplicateVersion(version)`.
- `adminListNews()`, `adminUpsertNews()`, `adminDeleteNews()`.
- `getActiveNewsAndBanners()` — para o app do aluno.

RLS: `dojo_student_app_config` — admin manage (owner_id = auth.uid()) + aluno SELECT (`owner_id = get_my_student_owner_id()`, mas só colunas de config publicada).

## Editor admin — `/dojo/app/student-app`

Layout de 2 colunas (desktop):
- **Esquerda**: sidebar com abas (Aparência / Navegação / Funcionalidades / Tela Inicial / Login / Notícias & Banners / Notificações / Versões).
- **Direita**: preview de celular em tempo real (mockup iPhone/Android via toggle) — renderiza o mesmo bundle do app dentro de um `<iframe src="/app/home?preview=<hash>">` OU um preview React inline lendo o mesmo `config` que está sendo editado (via Zustand store).

Componentes:
- `AppearancePanel.tsx` — color pickers, upload de logo/splash/hero (bucket `dojo-brand`), tipografia.
- `NavigationEditor.tsx` — lista `bottom_nav` com drag-and-drop (`@dnd-kit/sortable`, já instalado); editar rótulo, ícone (picker de lucide-icons), rota; adicionar/remover; máx 5.
- `FeaturesPanel.tsx` — grid de toggles com descrição.
- `HomeBlocksEditor.tsx` — drag-and-drop de blocos, toggle visibilidade, config por bloco (ex: shortcuts escolhe quais atalhos).
- `LoginPanel.tsx` — textos + upload da imagem de fundo.
- `NewsManager.tsx` — CRUD de notícias/banners com datas de vigência e prioridade.
- `NotificationsPanel.tsx` — mensagens padrão + toggle push (estrutura).
- `VersionsPanel.tsx` — lista, restaurar, duplicar, comparar (diff JSON).
- `PublishBar.tsx` — sticky bottom: "Salvar rascunho" + "Publicar" + selo "Alterações não publicadas".
- `DevicePreview.tsx` — moldura de celular (Android/iPhone/Tablet) envolvendo o preview.

Barra superior do editor:
- Toggle dispositivo (Android / iPhone / Tablet).
- "Ver como aluno" (abre `/app` numa nova aba com token).
- Badge de versão atual e status (Rascunho / Publicado).

## App do aluno — consumir a config

Refatorar as rotas em `src/routes/app._student.*.tsx` para ler `useStudentAppConfig()` (React Query) e:
- BottomNav renderiza itens de `config.bottom_nav`.
- Home renderiza `config.home_blocks` em ordem, cada bloco vira um componente (`<WelcomeBlock/>`, `<NextClassBlock/>`, `<ShortcutsBlock items=.../>`, `<NewsBlock/>`, `<BannerBlock/>`, `<OpenInvoicesBlock/>`, `<GraduationBlock/>`).
- Rotas de funcionalidades desabilitadas retornam redirect para `/app/home` (+ removidas do BottomNav e dos atalhos).
- Tema aplica cores via CSS custom properties no `StudentThemeProvider` (adicionar novas vars: `--sa-bottom-nav`, `--sa-card`, `--sa-title`, `--sa-button`).
- Notícias/banners consomem `getActiveNewsAndBanners`.

## O que NÃO faço agora

- Push notifications reais (FCM) — só toggle na config.
- Editor por perfil (Responsável/Professor/Convidado) além do toggle base — schema pronto (`audience`), UI só para `student`.
- Widgets custom / marketplace / temas completos / formulários custom (deixados na estrutura JSON, sem UI ainda).
- Modo escuro real (schema pronto, sem CSS variant nesta iteração).
- Sincronização em background/lazy loading avançado — app já faz refetch on focus via React Query.
- Diff visual entre versões (só metadados + JSON preview).

## Entrega desta iteração

1. Migração: tabelas `dojo_student_app_config`, `dojo_student_app_versions`, `dojo_student_app_news` + RLS + GRANTs + trigger de updated_at.
2. `config.functions.ts` completo.
3. Rota admin `/dojo/app/student-app` com todos os painéis e preview em tempo real.
4. Refatoração das telas do aluno para consumir a config (BottomNav dinâmica + Home por blocos + gate de features + tema estendido).
5. Bloco de notícias/banners no home e página `/app/news`.

Tudo em uma iteração. Confirme para eu começar pela migração.
