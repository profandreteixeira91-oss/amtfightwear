# Refatoração do Módulo Competições

Escopo grande demais para uma única entrega — abaixo está a divisão em 4 fases entregáveis. O schema atual (`dojo_competitions`, `dojo_competition_athletes`, `dojo_competition_medals`, `dojo_competition_results`, `dojo_competition_attachments`, `competition_sources`, `competition_ingest_runs`) já cobre a maior parte dos dados, então a maior parte do trabalho é **UI + funções + expansão de campos**.

## Estado atual (reaproveitável)

- Providers já modularizados em `src/lib/dojo/competitions/providers.ts` (arquitetura pronta para RSS/Firecrawl/APIs).
- Ingest pipeline em `ingest.functions.ts` com dedupe por `(owner_id, provider, external_id)`.
- Rotas: `dojo.app.competitions.tsx` (lista atual) e `dojo.app.competitions.$id.tsx` (detalhe atual).
- Aba `Competições` no perfil do aluno já existe (`students.$id.tsx`).

## Fase 1 — Schema & fundação

Migração única expandindo o schema:

- `dojo_competitions`: adicionar `subtitle`, `regulation_url`, `schedule_url`, `venue_map_url`, `contact_phone`, `contact_email`, `instagram`, `facebook`, `website`, `estimated_athletes`, `is_international boolean`, `is_free boolean`, `federation`, `confederation`, `tags jsonb`, `archived_at`, `cancelled_at`, `internal boolean` (competições internas da academia), `calendar_event_id` (link com `dojo_class_occurrences` quando adicionada ao calendário).
- `dojo_competition_athletes`: adicionar `teacher_id` (FK team_members), `registration_number`, `amount_paid numeric`, `payment_method text`, `documents jsonb` (enviados/pendentes).
- `dojo_competition_results`: adicionar `matches_total`, `matches_drawn`, `submissions`, `knockouts`, `ippons`, `total_points`, `total_time_seconds`.
- Nova tabela `dojo_competition_media` (fotos/vídeos por resultado — id, owner_id, athlete_id, competition_id, kind: photo|video|certificate, url, caption).
- Nova tabela `dojo_competition_calendar` (event_id, competition_id, notify_teachers, notify_athletes, checklist jsonb, notes).
- RPC `get_academy_medal_stats(_owner uuid)` e `get_student_competition_history(_student uuid)` (security definer).
- GRANTs + RLS para todas.

## Fase 2 — Dashboard & Listagem

- Nova rota `dojo.app.competitions.tsx` reescrita como **Dashboard** com abas: `Dashboard | Buscador | Minhas competições | Ranking | Estatísticas`.
- Componentes em `src/components/dojo/competitions/`:
  - `DashboardOverview.tsx`: cards (Total, Nacionais, Internacionais, Atletas inscritos, medalhas ouro/prata/bronze), calendário mensal, próximas 30 dias, últimas realizadas.
  - `CompetitionCard.tsx`: banner, nome, modalidade, data, local, prazo, taxa, categorias, status, botões (Ver detalhes / Registrar no calendário / Site oficial / Compartilhar).
  - `CompetitionsList.tsx`: virtualização + paginação.

## Fase 3 — Buscador, Filtros, Detalhe & Atletas

- `CompetitionFinder.tsx`: filtros por modalidade (multi), país, UF, cidade, data, mês/ano, organizador, federação, gratuito/pago, aberto/encerrado, nacional/internacional, próximos 30/90 dias, este ano. Busca client-side sobre `listCompetitions` com debounce; server-side para ranges de data.
- Rota `dojo.app.competitions.$id.tsx` reescrita com abas: `Info | Programação | Categorias | Local | Anexos | Atletas | Resultados`.
- `AthleteRegistrationDialog.tsx`: cadastro de aluno com categoria, peso, faixa, professor responsável, nº inscrição, valor pago, forma de pagamento, checklist documentos.
- `ResultsEditor.tsx`: colocação, lutas (V/D/E), finalizações, ippons, KOs, pontuação, tempo, medalha (auto-cria em `dojo_competition_medals`), upload de fotos/vídeos/certificados.
- Botão "Adicionar ao calendário" cria evento em `dojo_class_occurrences` via `dojo_competition_calendar`.
- Botão "Acessar site oficial" apenas redireciona (sem inscrição interna).

## Fase 4 — Ranking, Estatísticas, Perfil do aluno & Cron

- `RankingPanel.tsx`: rankings (geral, por modalidade, por faixa, por categoria) baseado em RPC agregando `medals + results`.
- `StatsPanel.tsx`: gráficos (recharts) — competições/ano, medalhas/modalidade, aproveitamento, eventos/UF, atletas mais ativos, professores mais premiados.
- Perfil do aluno (`students.$id.tsx`): expandir aba **Competições** para mostrar histórico completo (data, modalidade, categoria, peso, faixa, resultado, medalha, lutas V/D, fotos, vídeos, certificados, observações).
- Rota pública `src/routes/api/public/hooks/competitions-ingest.ts` chamada por pg_cron (6h/12h/24h/48h configurável em `competition_sources.schedule_hours`).
- Notificações (usa `dojo_student_notifications` já existente): nova competição, prazo próximo, adicionada ao calendário, resultado pendente, começa amanhã.
- Permissões: leitura via `dojoPermissions` — admin controle total, professor cadastra atletas/resultados, aluno só visualiza.

## Regras de negócio

- Sem IA em nenhuma etapa (busca é rule-based por metadata + fontes indexadas).
- Nenhuma inscrição é feita pelo Dojo Manager — sempre redireciona ao organizador.
- Resultados salvos criam automaticamente registro em `dojo_competition_medals` e aparecem no histórico do aluno sem duplicação.
- Nova conta começa zerada (regra core respeitada — sem seed).

## Detalhes técnicos

- Arquitetura de providers atual (`providers.ts`) mantida; novos providers registrados por linha (CBJJ, IBJJF, CBJ, CBK, CBTKD, CNMT etc.) sem refatorar chamadores.
- Todos os `createServerFn` autenticados usam `requireSupabaseAuth` — a integração de bearer já está registrada em `src/start.ts`.
- TanStack Query com `queryOptions` + `useSuspenseQuery` no padrão do projeto.
- Cache: `staleTime` 60s para listagens, 300s para dashboard.
- Uploads (fotos/vídeos/certificados) no bucket `dojo-documents` (já existe).

## Estimativa

- **Fase 1**: 1 migração grande + regeneração de types (~1 turno).
- **Fase 2**: ~4 arquivos (~1 turno).
- **Fase 3**: ~6 arquivos, o mais denso (~1-2 turnos).
- **Fase 4**: ~5 arquivos + cron SQL + perfil do aluno (~1 turno).

Confirma que sigo por essa divisão? Posso começar pela **Fase 1 (migração + fundação)** logo em seguida — as fases 2-4 dependem dos campos novos.
