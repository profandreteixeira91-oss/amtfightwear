# Refatoração do módulo Competições — AMT Dojo Manager

Reescrita do módulo em arquitetura de 3 camadas independentes, multi-tenant, sem mocks, com sincronização com o App do Aluno.

## Arquitetura

```text
┌─────────────────────┐   ┌──────────────────────┐   ┌────────────────────────┐
│  1. Motor de Coleta │──▶│  2. Biblioteca Central│◀──│ 3. Gestão da Academia │
│  (conectores +      │   │  (competitions +      │   │ (academy_competitions │
│   cron + Firecrawl) │   │   classificador)      │   │   + atletas + $$$)    │
└─────────────────────┘   └──────────────────────┘   └────────────┬───────────┘
                                                                   │
                                                          ┌────────▼────────┐
                                                          │  App do Aluno   │
                                                          └─────────────────┘
```

### Camada 1 — Motor de Coleta
- `src/lib/dojo/competitions/connectors/` — um arquivo por fonte (IBJJF, CBJJ, UAEJJF, AJP, SJJIF, JJIF, ADCC + genérico Firecrawl). Interface `CompetitionConnector` com `fetch(): Promise<RawEvent[]>`. Falha isolada por conector.
- `src/lib/dojo/competitions/ingest.functions.ts` — server fn `runCompetitionIngest` que executa todos os conectores, normaliza, classifica e faz upsert em `competitions`.
- `src/routes/api/public/hooks/competitions-ingest.ts` — endpoint acionado pelo `pg_cron` (a cada 6h) usando `apikey`.
- Painel admin com botão "Atualizar agora" + configuração de frequência em `dojo_competition_source_settings`.
- Classificador em `src/lib/dojo/competitions/classifier.ts` — regras por palavras-chave (mundial, grand slam, open, estadual, etc.) e escopo (INT/NAT/REG). Sem IA.

### Camada 2 — Biblioteca Central
- Tabela `competitions` global (não tem `owner_id` — é catálogo compartilhado, RLS `SELECT TO anon/authenticated`). Campos completos: identidade, geo, datas, valores, categorias JSONB, links, source, `classification` (jsonb: scope/tier/keywords).
- Índices para busca rápida por país/estado/data/scope/organization.
- `competition_sources` — registro dos conectores e último status.
- `competition_ingest_runs` — logs (encontrados, atualizados, erros, duração).
- Server fns públicas: `listCompetitions` (filtros: nome, país, estado, data, scope, inscrições abertas, valor máx, faixa/idade/peso/sexo), `getCompetition(id)`.

### Camada 3 — Gestão da Academia (multi-tenant, `owner_id`)
Tabelas com RLS por `owner_id`:
- `academy_competitions` — vínculo academia↔competição + notas, professor responsável, status interno.
- `academy_competition_athletes` — atletas inscritos, turma, graduação, categoria, peso, status (interessado→finalizado).
- `academy_competition_staff` — equipe técnica.
- `academy_competition_finances` — inscrição, viagem, hospedagem, alimentação, comprovantes.
- `academy_competition_hotels` — hospedagem.
- `academy_competition_transport` — transporte.
- `academy_competition_results` — resultados (lutas, medalha, colocação, fotos, vídeos).
- `academy_competition_documents` — documentos (S3/bucket `dojo-students` reutilizado ou novo `dojo-competitions`).

### Rotas
- `/dojo/app/competitions` (admin) — reescrita com abas: **Biblioteca** (busca/filtros na base central), **Meu Calendário** (competições adicionadas), **Dashboard** (indicadores).
- `/dojo/app/competitions/$id` (admin) — ambiente de gestão da competição adicionada, com sub-abas: Resumo, Cronograma, Atletas, Inscrições, Documentos, Financeiro, Hospedagem, Transporte, Equipe, Resultados, Fotos, Medalhas, Relatórios.
- `/app/competitions` (aluno) — reescrita: lista somente competições liberadas para o aluno (via `academy_competitions` do dojo dele filtradas por elegibilidade: faixa/idade/peso/sexo/turma).
- `/app/competitions/$id` (aluno) — detalhe + botões: Tenho interesse, Confirmar, Enviar docs, Google Maps, Inscrição oficial, Compartilhar.

### Notificações
- Hooks nas mutações relevantes (nova competição adicionada, mudança de data/local, inscrições encerrando, cancelamento, resultado publicado) gravam em `dojo_student_notifications` para os atletas elegíveis. Push/e-mail/WhatsApp/SMS ficam como TODO com abstração `NotificationChannel`.

## Banco de dados (migração única)

```sql
-- Biblioteca central (global; leitura pública autenticada)
CREATE TABLE public.competitions (...campos completos, classification jsonb, source_id uuid);
CREATE TABLE public.competition_sources (id, code UNIQUE, name, url, enabled, schedule, last_run_at, ...);
CREATE TABLE public.competition_ingest_runs (id, source_id, started_at, finished_at, found, updated, errors jsonb);

-- Gestão por academia
CREATE TABLE public.academy_competitions (id, owner_id, competition_id, status, professor_id, notes, added_by, ...);
CREATE TABLE public.academy_competition_athletes (id, owner_id, academy_competition_id, student_id, category, weight, belt, status, ...);
CREATE TABLE public.academy_competition_staff (id, owner_id, academy_competition_id, role, name, student_id, ...);
CREATE TABLE public.academy_competition_finances (...);
CREATE TABLE public.academy_competition_hotels (...);
CREATE TABLE public.academy_competition_transport (...);
CREATE TABLE public.academy_competition_results (id, athlete_id, wins, losses, medal, placement, ...);
CREATE TABLE public.academy_competition_documents (id, academy_competition_id, student_id?, url, kind, ...);
```

Cada tabela recebe: GRANTs (`authenticated` + `service_role`), RLS por `owner_id = auth.uid()` (admin) + `owner_id = get_my_student_owner_id()` (aluno via SELECT), triggers `set_updated_at`.

Tabelas legadas atuais que serão substituídas: `dojo_competitions`, `dojo_competition_athletes`, `dojo_competition_medals`, `dojo_competition_results`, `dojo_competition_attachments` — manter fisicamente por compat, novo módulo não escreve nelas. Rota antiga aponta para a nova.

## Ingestão

Cron `pg_net` → `/api/public/hooks/competitions-ingest` a cada 6h com `apikey`. Endpoint invoca `runCompetitionIngest` que:
1. Lê `competition_sources` habilitadas.
2. Para cada, chama o conector isolado (try/catch).
3. Normaliza `RawEvent → Competition` + roda `classify()`.
4. Faz `UPSERT` por `(source_code, external_id)`.
5. Grava `competition_ingest_runs` e atualiza `last_run_at`.

Conector Firecrawl usa a secret existente `FIRECRAWL_API_KEY`. Demais conectores começam com stubs bem definidos (interface pronta, endpoint fetch mockado desabilitado por default até integração real) — habilitados apenas quando houver endpoint público confirmado. Firecrawl já cobre IBJJF/CBJJ via scraping. Nada é mockado no produto final: fontes desabilitadas simplesmente não rodam.

## Arquivos principais a criar/editar

Novos:
- `src/lib/dojo/competitions/types.ts`
- `src/lib/dojo/competitions/classifier.ts`
- `src/lib/dojo/competitions/connectors/{ibjjf,cbjjf,uaejjf,ajp,sjjif,jjif,adcc,firecrawl-generic}.ts`
- `src/lib/dojo/competitions/library.functions.ts` (busca pública)
- `src/lib/dojo/competitions/academy.functions.ts` (gestão)
- `src/lib/dojo/competitions/ingest.functions.ts` + `ingest.server.ts`
- `src/lib/student/competitions.functions.ts` (aluno)
- `src/routes/api/public/hooks/competitions-ingest.ts`
- `src/routes/_authenticated/dojo.app.competitions.tsx` (reescrita)
- `src/routes/_authenticated/dojo.app.competitions.$id.tsx`
- `src/routes/app._student.competitions.tsx` (reescrita)
- `src/routes/app._student.competitions.$id.tsx`

Migração única com todas as tabelas + policies + GRANTs + seeds de `competition_sources`.

## Segurança
- Todas as tabelas `academy_*` têm RLS por `owner_id`.
- `competitions` é catálogo global (SELECT autenticado); só `service_role` escreve.
- Ingest endpoint valida `apikey`.
- Documentos usam bucket privado com signed URLs.

## Performance
- Índices em `competitions(country, state, start_at, scope, organization)`.
- Paginação server-side em `listCompetitions`.
- Cache do React Query com `staleTime` de 5min.
- Cron em background, nunca síncrono.

## Fora de escopo desta entrega
- Integração real com APIs oficiais (elas exigem contrato). Ficam as interfaces prontas + Firecrawl como fallback.
- Push/e-mail/WhatsApp/SMS reais — apenas persistência de notificação in-app.
- Migração de dados legados `dojo_competitions*` — mantidos, novo módulo é isolado.

Ao aprovar, executo a migração + criação de arquivos + reescrita das rotas em blocos paralelos.