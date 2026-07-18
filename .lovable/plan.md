
# App do Aluno — AMT Dojo Manager

Este é um módulo grande. Vou entregar como **PWA white-label instalável** (mesmo codebase TanStack Start), servido no subdomínio `dojomanager.amtfightwear.com.br/app` — instalável em Android e iOS via "Adicionar à tela inicial", com identidade visual carregada dinamicamente por academia (sem menção à AMT para o aluno). APK Android pode ser gerado depois via wrapper (PWABuilder/Bubblewrap) sem retrabalho.

## Arquitetura

```text
/app                        ← área do aluno (layout próprio, sem chrome do Dojo)
  /app/login                ← login público (email/CPF/matrícula + senha)
  /app/_student/            ← rota protegida (BottomNav)
    home                    ← dashboard
    agenda                  ← aulas das turmas do aluno
    checkin                 ← QR/PIN + histórico + frequência
    videos                  ← lista + player + progresso
    videos/$id
    graduations             ← faixa, graus, timeline
    certificates            ← lista + download PDF + validar QR
    competitions            ← próximas + inscritas
    finance                 ← faturas + PIX + boletos
    profile                 ← edição limitada
    documents               ← contratos, LGPD, atestados
    notifications           ← central
    settings                ← senha, notificações, tema
```

**White label**: um `StudentThemeProvider` no `_student` carrega `dojo_academy_profile` (logo, nome, cores) do owner do aluno, injeta CSS custom properties (`--brand-primary`, etc.) e o `<title>` / manifest. O nome "AMT" some do UI para o aluno.

**Autenticação**: reusa Supabase Auth já existente; aluno é identificado por `dojo_students.user_id` (ou email match). Todas as leituras rodam via `createServerFn` com `requireSupabaseAuth` e uma nova middleware `requireStudent` que resolve o `dojo_students` do usuário logado e aplica RLS baseada em `student_id`.

**PWA**: manifest dinâmico gerado por server route `/app/manifest.webmanifest` lendo cores/nome da academia (via subdomínio ou cookie de tenant). Meta tags iOS. Splash gerado pelo manifest. **Sem service worker de offline nesta primeira entrega** (regra Lovable: só quando explicitamente pedido offline completo; aqui deixamos preparado).

## Backend novo (migração + funções)

Novas RLS/policies para o role "aluno" nas tabelas já existentes:
- `dojo_students` (self read/update em campos permitidos)
- `dojo_attendance`, `dojo_class_students`, `dojo_class_occurrences`
- `dojo_videos` (com controle de acesso), `dojo_video_progress`, `dojo_video_favorites`
- `dojo_graduations`, `dojo_certificates`
- `dojo_competitions`, `dojo_competition_athletes`
- `dojo_invoices`, `dojo_enrollments`
- `dojo_account_notifications` (repurposed p/ aluno)

Novo arquivo `src/lib/student/student.functions.ts` com:
- `getMyProfile`, `updateMyProfile` (whitelisted fields)
- `getMyHome` (dashboard agregado — 1 chamada)
- `getMyAgenda(range)`
- `checkinSelf(pin|qr)` (respeita `dojo_checkin_settings`)
- `getMyAttendance(range)` + `getMyFrequencyStats`
- `getMyVideos`, `getMyVideoProgress`, `saveVideoProgress`, `toggleFavorite`
- `getMyGraduations`, `getMyCurrentBelt`
- `getMyCertificates` + `downloadCertificatePdf` (reuso do gerador existente)
- `getMyCompetitions`, `confirmCompetition`
- `getMyInvoices`, `getPixForInvoice`
- `getMyNotifications`, `markNotificationRead`
- `getAcademyBranding` (público-para-aluno: logo, nome, cores)

Novo arquivo `src/lib/student/student-middleware.ts`:
- `requireStudent` — resolve `dojo_students` pelo `auth.uid()` via `user_id` ou `email`.

## Frontend novo

```text
src/routes/
  app.tsx                        ← layout raiz (theme provider white-label)
  app.index.tsx                  ← redirect /app/home
  app.login.tsx                  ← login público
  app._student.tsx               ← gate + BottomNav + header
  app._student.home.tsx
  app._student.agenda.tsx
  app._student.checkin.tsx
  app._student.videos.tsx
  app._student.videos.$id.tsx
  app._student.graduations.tsx
  app._student.certificates.tsx
  app._student.competitions.tsx
  app._student.finance.tsx
  app._student.profile.tsx
  app._student.documents.tsx
  app._student.notifications.tsx
  app._student.settings.tsx
  api/public/app/manifest.webmanifest.ts   ← manifest dinâmico
  api/public/app/branding.$owner.ts        ← cores/logo (público, sem PII)

src/components/student/
  BottomNav.tsx
  StudentHeader.tsx
  StudentThemeProvider.tsx
  KpiCard.tsx, EmptyState.tsx, SkeletonList.tsx, PullToRefresh.tsx
  QrScanner.tsx (usa BarcodeDetector com fallback)
```

Design system: mobile-first (max-w-md), bottom nav com 5 abas principais (Home / Agenda / Check-in / Vídeos / Perfil), demais telas via "Mais" ou cards no home. Skeleton loading, `refetchOnWindowFocus`, animações discretas.

## Segurança

- Supabase JWT + refresh (já implementado).
- RLS por `owner_id` + `student.user_id = auth.uid()` em cada policy nova.
- `updateMyProfile` valida whitelist server-side (bloqueia CPF, email, matrícula, faixa, professor).
- Rate limit em `checkinSelf` respeitando `dojo_checkin_settings.min_interval_minutes`.

## Entregas por fase (evita 1 mega-commit)

**Fase 1 — Fundação (esta iteração)**
1. Migração RLS + tabelas auxiliares (notif do aluno, se faltar).
2. `student-middleware.ts` + `student.functions.ts` (Home + Profile + Agenda + Check-in + Notificações).
3. Rotas: `app.tsx`, `app.login.tsx`, `app._student.tsx` (theme + bottom nav), Home, Perfil, Agenda, Check-in, Notificações.
4. Manifest dinâmico + meta iOS + splash.
5. Página de download em `/app/install` com instruções (Android/iOS).

**Fase 2** — Vídeos + Graduações + Certificados.
**Fase 3** — Competições + Financeiro (PIX/boleto) + Documentos + Configurações.
**Fase 4** — Push notifications (FCM), biometria (WebAuthn), Wallet, offline (SW controlado).

## O que NÃO entrego agora (deixo estrutura pronta)

- APK/IPA nativos (só após homologar PWA).
- Chat professor↔aluno.
- Streaming ao vivo, gamificação, ranking, alimentar.
- Login biométrico ativo (só UI + estrutura).
- Serviço worker offline (regra Lovable exige pedido explícito de offline).

Confirma que devo tocar **Fase 1** agora? Se sim, começo pela migração + backend + rotas base.
