
# Central de Contratos — Módulo Jurídico

Transformar o editor atual em um **hub jurídico único**, onde todos os modelos são criados/versionados e todos os contratos (aluno, filial, professor, evento…) nascem obrigatoriamente a partir de um modelo, ficando congelados numa versão.

## Arquitetura de dados

Duas camadas: **modelos** (reutilizáveis, versionáveis) e **contratos gerados** (cópia congelada, com status próprio).

### 1. Expandir `dojo_contract_templates`
- `category` text — `student | affiliate | teacher | employee | partnership | events | competitions | lgpd | legal | other`
- `status` text — `active | inactive | review | archived`
- `current_version` int (default 1)
- `variables_schema` jsonb — lista de variáveis suportadas
- `owner_id` NULL → **modelos globais** (Prof. André propaga p/ todos, mesmo padrão das faixas)

### 2. Nova tabela `dojo_contract_template_versions`
Snapshot imutável do modelo a cada save. Colunas:
`template_id, version, content, header_html, footer_html, page_size, page_orientation, margin_mm, show_page_numbers, created_by, created_at`.

### 3. Refatorar `dojo_student_contracts` + `dojo_affiliate_contracts`
Padronizar campos ausentes:
- `contract_number` text — sequencial `2026-000145`
- `template_id`, `template_version` int
- `status` enum `draft | issued | sent | pending_signature | signed | refused | cancelled | expired | terminated | completed`
- `issued_by` uuid, `sent_at`, `expires_at`, `cancelled_at`
- `pdf_url` (cache do último export)

### 4. Nova tabela `dojo_contract_events` (timeline unificada)
`contract_kind (student|affiliate), contract_id, event_type, actor_id, payload jsonb, created_at`
Eventos: `created, updated, sent, signed, refused, downloaded, printed, cancelled, renewed, status_changed`.

### 5. Sequencial de numeração
Função `dojo_next_contract_number(_owner uuid)` → `AAAA-000XXX` (por ano, por owner).

## Editor unificado (Central de Contratos)

Manter TUDO do editor atual (`dojo.app.contract-templates.$id.tsx`) e evoluir:

- **Painel lateral de variáveis** com abas: Aluno / Academia / Filial / Sistema — clique insere `{{variavel}}` no cursor.
- **Categoria + Status + Versão** no top bar.
- Bloqueio de edição quando já existem contratos emitidos com essa versão → força "salvar como nova versão".
- Botão **Duplicar / Arquivar / Nova versão**.
- Preview usa a última versão; timeline de versões no drawer.

Ampliar o `RichTextEditor` (Tiptap) com: tabelas, colunas (via CSS grid), listas/checklists, quebra de página, imagens (upload → `ig-media`), placeholder de logo/assinatura, margens configuráveis (já existe), export PDF (já existe).

## Rota / Navegação

```
/dojo/app/contracts                    → Dashboard jurídico (KPIs + últimos)
/dojo/app/contracts/templates          → Biblioteca (grid por categoria)
/dojo/app/contracts/templates/$id      → Editor (rota atual, movida)
/dojo/app/contracts/issued             → Todos os contratos emitidos + busca global
/dojo/app/contracts/issued/$kind/$id   → Visualizador + timeline + ações
```

Rota atual `dojo.app.contract-templates.*` vira alias/redirect para as novas.

## Integração Aluno / Filial

- **Ficha do Aluno** já tem aba Contratos (`StudentContracts.tsx`); reescrever para consumir a nova API:
  - Botão "Novo contrato" → modal seleciona modelo da biblioteca (filtrado por `category=student`) → gera contrato com variáveis resolvidas → salva → aparece na aba.
  - Ações por linha: Ver / PDF / Imprimir / Enviar por email / Duplicar / Cancelar / Registrar assinatura.
- **Filial** (`dojo.app.units.affiliates.$id.tsx`) — mesma UX, filtro `category=affiliate`.
- Nenhum contrato é criado fora da Central → editor inline nas fichas é **removido**; sobra apenas *seleção de modelo + geração + gestão de status*.

## Server functions (`src/lib/dojo/contracts.functions.ts`)

Ampliar / adicionar:
- `listTemplates({ category?, status? })`
- `getTemplateWithVersions(id)`
- `saveTemplate` — detecta se há contratos emitidos → cria nova versão em vez de atualizar
- `duplicateTemplate` / `archiveTemplate`
- `generateContract({ template_id, kind, target_id, extra_vars? })` — resolve variáveis, congela conteúdo, gera número, insere evento `created`
- `updateContractStatus({ id, kind, status, note? })` — insere timeline event
- `registerSignature({ id, kind, signed_at, signer, notes })`
- `listIssuedContracts({ kind?, status?, q?, from?, to? })` — busca global
- `getContractTimeline(kind, id)`
- `dashboardStats()` — totais por status/categoria/período

## Dashboard `/dojo/app/contracts`

- Cards: Total de modelos · Ativos · Pendentes · Vencendo (30d) · Expirados · Rescindidos
- Gráfico "Emitidos por mês" (Recharts)
- Pizza "Contratos por categoria"
- Lista "Últimos 10 emitidos"

## Notificações

Toasts sonner + inserção em `dojo_account_notifications`:
- Contrato pendente > 7d, vencendo em 30d, expirado, novo emitido, assinado, recusado.
- Cron opcional (fase 2) — nesta refatoração deixamos apenas os disparos síncronos.

## Permissões

Reutilizar `dojo_my_team_permissions()`:
- `admin` — controle total
- `secretary` — criar/emitir/registrar assinatura
- `teacher` — read-only nos contratos dos alunos vinculados
- `student` (portal) — próprios contratos + download PDF

Aplicar via `has_role` + policies novas nas tabelas.

## Ordem de execução

1. Migração SQL (tabelas + colunas + função de numeração + policies + grants).
2. Backend server functions.
3. Editor com painel de variáveis + versionamento.
4. Rotas Dashboard / Biblioteca / Emitidos / Visualizador.
5. Refactor `StudentContracts.tsx` + aba de contratos na filial.
6. Redirects das rotas antigas.
7. Typecheck + smoke test navegando pelas rotas principais.

## Fora do escopo (fase 2, explicitar depois)

- Integração real com provedores de assinatura eletrônica (D4Sign, ClickSign) — hoje apenas registro manual.
- Envio real de e-mail com PDF anexado (hoje usa o fluxo de branded print existente).
- App do aluno — a leitura via portal PWA já funciona; ajustes de UI ficam para depois.

---

Vou começar pela migração assim que aprovar.
