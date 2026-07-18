# AMT Dojo Manager — Plano de Construção

Sistema de gestão para academia/dojo, integrado ao ecossistema AMT Fight Wear (loja, autenticação, painel administrativo já existentes). Como o escopo é grande, proponho entregar em fases incrementais, começando pelo núcleo (alunos + financeiro) e evoluindo para integrações externas.

## Arquitetura geral

- Novo grupo de rotas administrativas sob `/_authenticated/dojo/*` com submenu próprio em `AppTopNav`.
- Reuso do Supabase Auth existente (perfis já linkados a `profiles`).
- Papéis adicionais em `user_roles`: `dojo_admin`, `instructor`, `student`.
- App do aluno via rotas públicas/autenticadas `/aluno/*` (mobile-first, PWA).
- Integrações externas isoladas em `src/lib/dojo/*.functions.ts` + rotas `/api/public/hooks/*` para webhooks.

## Fases propostas

### Fase 1 — Núcleo (Alunos + Graduações + Financeiro básico)
- **Cadastro de alunos**: dados pessoais, responsável, plano, faixa atual, histórico de graduações, foto, status (ativo/inativo/trancado).
- **Planos e mensalidades**: catálogo de planos (mensal, trimestral, anual, aula avulsa), vínculo aluno↔plano com data de início/renovação.
- **Financeiro**:
  - Contas a receber (mensalidades geradas automaticamente por cron mensal).
  - Contas a pagar (despesas manuais).
  - Fluxo de caixa e DRE simples com filtros por período.
  - Cobrança via Mercado Pago (reuso do módulo já existente): geração de link Pix/cartão por mensalidade.
- **Graduações**: registro de exames, faixas por modalidade (Jiu-Jitsu, Muay Thai, MMA, etc.), grau/dan, data e avaliador.
- **Certificados**: geração de PDF (React-PDF) com template personalizável, QR code para verificação pública em `/certificado/$id`.

### Fase 2 — Check-in e presenças
- Check-in manual pelo instrutor + QR code do aluno.
- Integração **GymPass / TotalPass**: rotas `/api/public/hooks/gympass` e `/api/public/hooks/totalpass` para validação por CPF/token conforme especificação de cada API (documentação será solicitada quando começarmos).
- Histórico de presenças por aluno/turma, com relatórios de frequência.

### Fase 3 — App do Aluno
- Rotas `/aluno/*` autenticadas (mesmo Auth da loja).
- Telas: home (próxima aula, faixa, mensalidade), meus pagamentos (Pix on-demand), meu histórico, meus certificados (download), meu QR code de check-in, agenda de aulas.
- Push notifications via web push + notificações in-app (reuso do `NotificationsBell`).

### Fase 4 — WhatsApp
- Reuso da estrutura já preparada em `src/lib/store/whatsapp.server.ts`.
- Templates: aviso de mensalidade, confirmação de pagamento, aula cancelada, parabéns por graduação, aniversário.

### Fase 5 — Estoque + integração com Loja
- Módulo de estoque interno do dojo (kimonos, faixas, luvas, itens de venda balcão).
- Integração com loja AMT Fight Wear: aluno recebe cupom/desconto automático; pedidos da loja podem ser marcados como "retirada no dojo" e baixam do estoque local.
- Vendas balcão registradas no financeiro do dojo.

## Estrutura de dados (Fase 1 — a criar via migration)

```text
dojo_students        (aluno, vínculo com auth.users opcional)
dojo_modalities      (Jiu-Jitsu, Muay Thai, ...)
dojo_belts           (faixa por modalidade, ordem, cor)
dojo_graduations     (aluno, modalidade, faixa, grau, data, avaliador)
dojo_plans           (nome, valor, duração)
dojo_enrollments     (aluno ↔ plano, datas, status)
dojo_invoices        (mensalidades e cobranças, status, MP payment id)
dojo_expenses        (contas a pagar)
dojo_certificates    (PDF gerado, hash público)
```
Todas com RLS: `dojo_admin`/`instructor` gerenciam; `student` vê apenas o próprio (via `dojo_students.user_id = auth.uid()`).

## Perguntas antes de codar a Fase 1

1. **Modalidades**: quais devem vir pré-cadastradas? (Jiu-Jitsu, Muay Thai, MMA, Boxe, outras?)
2. **Sistema de faixas**: uso o padrão IBJJF para Jiu-Jitsu (branca→preta com 4 graus) e faixas coloridas Muay Thai (khan)? Ou você fornece a estrutura?
3. **Certificado**: você tem um modelo/arte de referência? Precisa de assinatura digital do mestre?
4. **Mensalidades**: valor único por plano ou personalizado por aluno? Vencimento fixo (todo dia X) ou móvel (30 dias após adesão)?
5. **Multi-unidade**: um dojo só ou preciso suportar várias unidades desde já?

## Próximo passo

Depois de aprovado o plano e respondidas as 5 perguntas acima, começo pela **Fase 1** com:
1. Migration criando as tabelas + RLS + GRANTs.
2. Menu "Dojo" no `AppTopNav`.
3. CRUD de alunos, planos, graduações.
4. Geração de mensalidades + integração Mercado Pago (reuso).
5. Emissão de certificado PDF com QR de verificação.

GymPass, TotalPass, WhatsApp e App do Aluno entram nas fases seguintes conforme prioridade.
