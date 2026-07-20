## Módulo Equipe — Plano de Entrega

Este é um escopo muito grande (13+ áreas funcionais). Vou entregar em **duas fases** para não deixar nenhuma área quebrada. Se preferir, ajuste as prioridades antes de eu começar.

### Princípios

- **Multi-tenant estrito**: toda tabela com `owner_id` + RLS por `auth.uid()`, sem exceção.
- **Team Service único** (`src/lib/dojo/team.functions.ts`): fonte da verdade. Agenda, Turmas, Certificados, Check-in, Avaliações, Eventos, Financeiro passam a **consumir** esse serviço em vez de replicar dados.
- **Não duplicar**: `dojo_units` (professores atuais), `dojo_class_schedules`, `dojo_evaluations`, `dojo_certificates` já existem. Vou **estender** (não recriar) e migrar dados existentes.
- **Perfis de permissão**: reutilizar `user_roles` + `has_role`. Zero nova estrutura de RBAC.
- **UI**: `DojoPageShell` + navegação superior + padrão visual já em uso (cards, tabs, timeline).

---

### FASE 1 — Núcleo entregue nesta rodada

**1. Migração de banco (uma migration)**

- `dojo_team_members` — colaborador (dados pessoais + profissionais + status). Substitui/estende `dojo_units` como fonte central. Mantém `dojo_units` sincronizada por trigger para não quebrar o que já consome.
- `dojo_team_documents` — anexos (contrato, RG, diplomas). Nunca deletados fisicamente (`archived_at`).
- `dojo_team_payroll_config` — tipo de pagamento (fixo/hora-aula/percentual/comissão), valores base, dados bancários/PIX.
- `dojo_team_payments` — pagamentos, adiantamentos, descontos, bônus, comissões, horas extras, reembolsos. Status: pendente/pago/cancelado.
- `dojo_team_attendance` — controle de presença da equipe (entrada/saída/intervalo/justificativa).
- `dojo_team_history` — audit permanente (insert-only para o usuário).
- `dojo_team_signatures` — assinatura digital para certificados (imagem, nome, cargo, faixa).
- View `dojo_team_dashboard` — KPIs agregados.
- Todas com GRANTs + RLS por `owner_id` + política do aluno/próprio membro quando aplicável.

**2. Team Service (`src/lib/dojo/team.functions.ts`)**

CRUD completo, incluindo:
- `listTeamMembers`, `getTeamMember`, `upsertTeamMember`, `updateStatus`, `archiveTeamMember`
- `listPayments`, `registerPayment`, `computePayrollPreview` (usa `dojo_attendance` × config)
- `listTeamAttendance`, `punchIn`, `punchOut`
- `listDocuments`, `uploadDocument`, `archiveDocument`
- `getTeamSignature`, `setTeamSignature`
- `getTeamDashboard` — cards do dashboard
- `listBirthdaysThisMonth`

**3. Rotas**

- `dojo.app.team.index.tsx` — dashboard + lista com filtros (cargo, status, modalidade), busca, cards.
- `dojo.app.team.$id.tsx` — perfil do colaborador em 8 abas:
  1. Dados Pessoais
  2. Dados Profissionais
  3. Permissões (integrado ao `user_roles` existente)
  4. Agenda (embed `dojo_class_schedules` filtrado)
  5. Turmas (reuso do módulo existente)
  6. Financeiro (config + histórico)
  7. Documentos
  8. Histórico
- `dojo.app.team.payroll.tsx` — folha do mês (todos), export PDF/Excel.
- `dojo.app.team.attendance.tsx` — controle de presença da equipe.

**4. Menu**

Adicionar em `AppTopNav.tsx` grupo Gestão: **Equipe** — ícone `Users` (👥). Renomear item "Professores" existente para link à `/dojo/app/team` (mesma rota).

**5. Integrações imediatas nesta fase**

- **Certificados**: `CertificateEditor` lê `dojo_team_signatures` (o professor logado precisa estar cadastrado em Equipe).
- **Check-in**: quando o aluno faz check-in em uma turma, o serviço identifica o professor titular via `dojo_class_schedules.instructor_id` → `dojo_team_members`.
- **Dashboard geral do Dojo**: puxa KPIs de folha do mês.
- **Agenda**: nada muda (já usa `dojo_class_schedules`); a aba Agenda do colaborador é uma view filtrada.

---

### FASE 2 — Entregue em rodada separada (aviso ao final)

Ganchos preparados no serviço, mas UI/lógica completa depois:
- Dashboard do Professor (rota `/dojo/app/me` — visão do professor logado).
- Comunicação (envio de comunicado/mensagem/email — integrar ao módulo Avisos existente).
- Cálculo automático de comissões por matrícula/renovação/venda (depende de eventos financeiros).
- Ponto eletrônico real (biometria/hardware).
- Eventos: vincular professores com funções (organizador/árbitro/etc.).

---

### Detalhes técnicos

- **Não haverá duplicação com `dojo_units`**: `dojo_team_members` recebe um campo `legacy_unit_id` apontando para `dojo_units` durante a migração; uma função `sync_team_to_units()` (trigger) mantém `dojo_units.instructor_name/instructor_email` em espelho. Consumers antigos continuam funcionando.
- **Permissões**: aba "Permissões" grava roles em `user_roles` via `assign_role` server-fn (já existe padrão). Perfis pré-definidos (Administrador/Professor/Recepção/Financeiro/Instrutor) mapeiam para combinações de roles + escopo. Perfil "Personalizado" abre matriz granular.
- **Documentos**: bucket `team-documents` (privado), RLS por `owner_id` do dono e pelo próprio colaborador.
- **Foto/assinatura**: bucket `team-media` (público apenas para foto de perfil, assinatura privada).
- **Cálculo de folha**: `computePayrollPreview` cruza `dojo_attendance` (ou `dojo_class_occurrences`) com `dojo_team_payroll_config` para gerar preview antes do registro em `dojo_team_payments`. Não altera pagamentos existentes.
- **Multi-tenant**: cada função server usa `requireSupabaseAuth`; toda query filtra por `owner_id = context.userId`.

---

### O que NÃO farei sem pedir

- Não vou remover `dojo_units` (quebraria o resto do sistema).
- Não vou refatorar módulos existentes para "consumir Team Service" agora — eles continuam funcionando; migração de leitores acontece incrementalmente.
- Não vou implementar WhatsApp (fora de escopo desta fase).

Confirme e eu executo a Fase 1 (migration + serviço + rotas + integrações mínimas).