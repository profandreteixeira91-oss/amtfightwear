
# Reformulação do módulo Avaliações

O módulo hoje é um CRUD simples de "provas com itens teóricos/práticos + impressão". A reformulação transforma isso em uma plataforma completa mantendo o schema atual (`dojo_evaluations`) como uma das entidades — o campo `items jsonb` passa a suportar a estrutura nova, sem quebrar avaliações existentes.

## Modelo de dados

Aproveita `dojo_evaluations` (que vira "modelo"/template) e adiciona:

```text
dojo_eval_categories       ← categorias técnicas (Fundamentos, Guarda...)
  owner_id, name, description, icon, color, order_index, archived

dojo_eval_techniques       ← biblioteca central de técnicas
  owner_id, name, description, category_id, image_url, video_id,
  default_score, required, estimated_seconds, tags text[], archived

dojo_eval_templates        ← estende dojo_evaluations com metadados novos
  (adicionar colunas ao dojo_evaluations)
  modality, category, teacher_id, min_training_months, min_attendance,
  observations, version, parent_template_id, is_library, method,
  scale jsonb, structure jsonb  ← categorias > critérios > técnicas
  
dojo_eval_sessions         ← execução da avaliação com um aluno
  owner_id, template_id, student_id, evaluator_id, scheduled_at,
  started_at, finished_at, status (draft|scheduled|in_progress|done|failed|review),
  scores jsonb, observations, attachments jsonb, total_score, percentage,
  result (approved|failed|review|conditional)

dojo_eval_plans            ← plano de evolução pós-avaliação
  session_id, strong_points, improvement_points, recommended_techniques uuid[],
  recommended_videos uuid[], comments, next_evaluation_at
```

`structure jsonb` do template:
```json
{
  "categories": [
    { "id": "...", "name": "Guarda", "weight": 1,
      "criteria": [
        { "id": "...", "name": "Fechada", "weight": 2, "max_score": 10,
          "min_score": 0, "required": true, "eliminatory": false,
          "techniques": ["<technique_id>", ...] } ] } ]
}
```

Método de avaliação por template: `numeric | checklist | pass_fail | scale | rubric | concept`.

## Seed: biblioteca de modelos prontos

Uma migração adicional insere modelos com `is_library=true` e `owner_id=null` (visíveis a todos):
- Jiu-Jitsu Infantil (13 faixas conforme lista).
- Jiu-Jitsu Adulto (5 faixas).
- Judô (branca a preta — conforme graduação).
- Genérico vazio.

Modelos com `owner_id IS NULL` são somente-leitura para a academia. "Usar este modelo" faz duplicação em `owner_id = auth.uid()` (linha nova).

RLS: `owner_id = auth.uid() OR (is_library = true AND owner_id IS NULL)` para SELECT; INSERT/UPDATE/DELETE só quando `owner_id = auth.uid()`.

## Backend

`src/lib/dojo/evaluations/`:
- `templates.functions.ts` — list/get/save/duplicate/archive/delete templates + versionamento.
- `library.functions.ts` — lista modelos da biblioteca.
- `categories.functions.ts` — CRUD categorias técnicas.
- `techniques.functions.ts` — CRUD biblioteca central de técnicas.
- `sessions.functions.ts` — criar/atualizar/finalizar sessão + calcular resultado.
- `plans.functions.ts` — CRUD plano de evolução.
- `dashboard.functions.ts` — agregações para o painel.
- `integrations.functions.ts` — ao aprovar sessão, criar registro em `dojo_graduations` (opcional por flag).

## UI — `/dojo/app/evaluations` (rebuild)

Layout com abas + subrotas:
- `/dojo/app/evaluations` → **Dashboard** (KPIs + gráficos com `recharts` já usado).
- `/dojo/app/evaluations/library` → **Biblioteca de Modelos** (grid com filtro por modalidade/faixa; botão "Usar este modelo").
- `/dojo/app/evaluations/my` → **Minhas Avaliações** (sessões executadas/agendadas, lista + filtros).
- `/dojo/app/evaluations/templates` → **Modelos Personalizados** (grid + editor visual drag-and-drop de estrutura).
- `/dojo/app/evaluations/templates/$id` → **Editor de modelo** (categorias > critérios > técnicas com `@dnd-kit`, seleção de método, escala).
- `/dojo/app/evaluations/categories` → **Categorias Técnicas** (CRUD).
- `/dojo/app/evaluations/techniques` → **Biblioteca de Técnicas** (CRUD, busca, filtros, tags, arquivar).
- `/dojo/app/evaluations/session/$id` → **Executar avaliação** (aluno em foco, header com foto/faixa/histórico, checklist/notas por critério, anexos, salvamento automático, resultado ao final).
- `/dojo/app/evaluations/session/$id/plan` → **Plano de evolução** (formulário + sugestões de vídeos).
- `/dojo/app/evaluations/history` → **Histórico** (timeline por aluno).
- `/dojo/app/evaluations/settings` → **Configurações** (nota mínima padrão, escala padrão, integração automática com graduação, regras de aprovação).

Componentes reutilizáveis em `src/components/dojo/evaluations/`:
- `TemplateCard`, `TemplateEditor` (drag-and-drop categorias/critérios/técnicas), `MethodSelector`, `ScaleEditor`, `TechniquePicker`, `SessionRunner` (com auto-save via debounce), `ResultSummary`, `EvolutionPlanForm`, `StudentHeader`, `TimelineList`.

Design: Notion/ClickUp — sidebar de abas no topo do módulo, cards, skeleton loading, filtros rápidos, busca instantânea (`useDeferredValue`), painéis laterais para edição, feedback visual (toasts).

## Integrações

- **Alunos**: `SessionRunner` puxa `dojo_students`; ao aprovar, gravar linha timeline em `dojo_account_audit`/histórico do aluno.
- **Vídeos**: `TechniquePicker` linka `dojo_videos.id`; `EvolutionPlanForm` sugere vídeos por técnicas mal avaliadas (query em `dojo_videos` com tags/categoria).
- **Graduação**: função `promoteFromSession` cria `dojo_graduations` quando `result='approved'` E flag `auto_graduate` do template estiver on. Opcional via botão manual também.
- **Agenda**: sessão com `scheduled_at` aparece como evento (não altera schema da agenda; consulta cruzada).
- **Certificados**: reaproveita gerador existente com data da avaliação.

## Backward compatibility

- Rotas antigas continuam funcionando; a listagem de "provas" existente aparece dentro de "Modelos Personalizados" (mesma tabela).
- `items jsonb` legado é migrado on-the-fly: se `structure` estiver vazio, o UI mostra o modelo em modo compatível (categoria única "Itens", critérios = itens).
- `saveDojoEvaluation` e `listDojoEvaluations` mantidos e usados por baixo do capô.

## Fora do escopo desta iteração (estrutura preparada)

- Assinatura digital dos avaliadores, avaliação remota, avaliação por vídeo, IA de análise técnica.
- Ranking técnico e gamificação.
- Marketplace público entre academias.
- Compartilhamento entre unidades da mesma academia (schema pronto via `unit_id`, sem UI ainda).
- Importação/exportação real (JSON de template) — deixo botão "Exportar JSON" e "Importar JSON" simples; import cross-academy fica só como schema.

## Entrega desta iteração

1. Migração: novas tabelas + colunas em `dojo_evaluations` + RLS/GRANTs + seed da biblioteca.
2. Backend completo (`src/lib/dojo/evaluations/*.functions.ts`).
3. Reescrita do módulo com todas as subrotas listadas.
4. Componentes reutilizáveis.
5. Integração automática (opcional) com Graduação.

Confirme para eu começar pela migração.
