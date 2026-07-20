# Evolução do Módulo Equipe — Plano de Entrega

Escopo massivo. Vou entregar em **5 fases sequenciais**, cada uma funcional de ponta a ponta, para evitar um único deploy gigante e permitir validação incremental. Todas as fases respeitam multi-tenant (`dojo_id` em toda tabela + RLS via `has_role`/ownership).

---

## Fase 1 — Escalas & Substituições (base operacional)

**Banco**
- `dojo_team_schedules` — escalas recorrentes (professor, aula, dia da semana, horário, unidade, sala, modalidade, recorrência, período).
- `dojo_team_schedule_occurrences` — ocorrências geradas (data específica, status, substituto_id, motivo).
- `dojo_team_substitutions` — histórico permanente de substituições (professor original, substituto, motivo, período, criado_por).

**Service** — `src/lib/dojo/team-schedule.functions.ts`
- `listSchedules`, `upsertSchedule`, `generateOccurrences` (materializa X semanas à frente), `substituteTeacher`, `listSubstitutions`.
- Regra crítica: substituição **nunca** apaga vínculo original, apenas cria registro paralelo.

**UI** — Nova aba `dojo.app.team.schedules.tsx`
- Visualizações: Hoje / Semana / Mês / Timeline / Calendário (usando `date-fns` + grid custom, sem dep nova).
- Modal "Substituir Professor" com fluxo: atual → novo → motivo → período → confirmar.
- Drag-and-drop entre slots (usar `@dnd-kit` já instalado).

**Integrações**
- `dojo_class_occurrences` (agenda geral) recebe atualização quando substituição confirmada.
- Check-in valida contra `schedule_occurrences.substituto_id ?? professor_id`.

---

## Fase 2 — Carga Horária & Metas

**Banco**
- `dojo_team_workload_summary` (view materializada por colaborador/mês): horas previstas, ministradas, extras, faltas, reposições, canceladas, substituições feitas/recebidas.
- `dojo_team_goals` — metas (tipo enum: matriculas, renovacoes, frequencia, avaliacoes, eventos, receita, checkins, conversao; alvo, período, bônus_valor).
- `dojo_team_goal_progress` — snapshots de progresso.

**Service** — `src/lib/dojo/team-workload.functions.ts` + `team-goals.functions.ts`
- Cálculo derivado da agenda (nada duplicado).
- Goals com auto-cálculo cruzando `dojo_enrollments`, `dojo_attendance`, `dojo_evaluations`, `store_orders`.

**UI**
- Aba "Carga Horária" na ficha do colaborador + relatório global.
- Aba "Metas" com progresso, percentual, bônus previsto.

---

## Fase 3 — Remuneração Inteligente & Comissões

**Banco**
- Expandir `dojo_team_payroll_config`: JSONB `compensation_rules` com múltiplos modelos simultâneos (fixo, hora, aula, comissão matrícula, renovação, produto, mensalidade, exame, bônus meta).
- `dojo_team_commissions` — cada comissão calculada (origem_tipo, origem_id, base_valor, percentual/fixo, valor_final, status).
- `dojo_team_private_classes` — aulas particulares (aluno, data, valor, status, forma_pagamento).

**Service** — `src/lib/dojo/team-commission.functions.ts` + expansão `team-payroll`
- Triggers de cálculo:
  - Ao confirmar pagamento de mensalidade → comissão para professor da turma.
  - Ao criar `dojo_enrollments` → comissão matrícula.
  - Ao renovar plano → comissão renovação.
  - Ao pagar `store_orders`/`dojo_store_orders` → comissão produto (vendedor_id).
  - Ao concluir `dojo_evaluations` → comissão exame.
  - Ao bater meta → bônus.
- Motor único `computeCommissionsForPeriod(memberId, period)`.

**UI**
- Editor de regras de remuneração (checkboxes + config por regra) na aba Financeiro do colaborador.
- Registro de aulas particulares.
- Preview de comissões pendentes.

---

## Fase 4 — Desempenho, Dashboard Individual & Financeiro

**Banco**
- `dojo_team_performance` — indicadores mensais (pontualidade, presença, aulas, avaliações aplicadas, graduações, retenção, satisfação).
- Expandir `dojo_team_history` — categorias: cargo, faixa, curso, certificação, treinamento, aumento, substituição, advertência, elogio, férias, licença.

**Service** — `team-performance.functions.ts` + `team-analytics.functions.ts`

**UI**
- Rota `/dojo/app/team/me` — dashboard do colaborador logado (agenda, aulas hoje, horas mês, remuneração prevista, comissões, pendências, indicadores).
- Extrato financeiro exportável (CSV/PDF via `openBrandedPrintDocument`).
- Timeline de histórico profissional.

---

## Fase 5 — Alertas, Relatórios & Integração AMT Pay

**Banco**
- `dojo_team_alerts` — alertas gerados (tipo, severidade, colaborador, contexto, lido).
- Job `pg_cron` diário gerando alertas (férias em curso, excesso de carga, sem aulas, docs vencidos, aniversário, contrato próximo do fim).

**Relatórios**
- Central em `/dojo/app/team/reports`: horas, aulas, produtividade, comissões, folha, custos, professores por modalidade, substituições, metas, desempenho.
- Export PDF (branded print), Excel (`xlsx`), CSV.

**AMT Pay**
- Preparar estrutura: cada `dojo_team_payments` aponta para futuro `wallet_transaction_id` (nullable). Sem transferência automática nesta versão — apenas registro.

---

## Detalhes técnicos globais

- **RLS**: toda tabela nova segue padrão existente (`dojo_id = get_current_dojo_id()` + `has_role`).
- **GRANTS**: authenticated + service_role em cada CREATE TABLE.
- **Navegação**: sub-navegação horizontal dentro de `/dojo/app/team` (Dashboard, Colaboradores, Escalas, Carga Horária, Metas, Comissões, Desempenho, Alertas, Relatórios).
- **Consumo unificado**: Agenda, Check-in, Financeiro, AMT Store, Avaliações e Certificados passam a ler via os novos services (sem duplicar lógica).
- **Sem breaking changes**: tabelas atuais (`dojo_team_members`, `dojo_team_payroll_config`, `dojo_team_payments`, `dojo_team_attendance`, `dojo_team_documents`, `dojo_team_signatures`, `dojo_team_history`) são expandidas, não substituídas.

---

## Ordem de execução

Começo pela **Fase 1** (base de escalas + substituições) porque todas as outras dependem dela: carga horária, comissão por aula, desempenho e alertas são derivados da agenda materializada.

Confirma que devo iniciar pela Fase 1, ou prefere que eu ajuste o escopo/ordem?
