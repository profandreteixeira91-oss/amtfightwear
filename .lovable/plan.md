# Refatoração AMT Pay — Motor Financeiro do Dojo Manager

O escopo é grande demais para uma única entrega. Proponho 6 fases incrementais, cada uma **entregável e testável isoladamente**. O sistema atual continua funcionando enquanto migramos.

## Princípios arquiteturais

- **Asaas vira apenas gateway** (PIX/boleto/cartão/transferência PIX/webhook). Toda regra financeira vive no AMT Pay.
- **Camada de abstração `PaymentGateway`** (interface única) — hoje `AsaasGateway`, amanhã Mercado Pago / EFI / PagBank / Stripe / Pagar.me sem mexer no core.
- **Ledger append-only** (`dojo_ledger_entries`) — saldo nunca é gravado, sempre derivado por `SUM()`. Nenhum ajuste manual.
- **Idempotência** em toda operação (chave: `gateway`+`external_id`+`event_type`).
- **Nada é considerado pago sem webhook confirmado**.
- **"Mensalidades" e "Assinaturas" fundem em `dojo_recurring_billings`** (novo conceito único: Cobrança Recorrente). As telas antigas continuam funcionando durante a transição via views.

## Modelo de dados (novo)

```text
dojo_recurring_billings        # 1 registro por plano contratado
  ├─ recurring_cycles          # cada ciclo/vencimento gerado
  │   └─ payment_attempts      # tentativas de cobrança no gateway
  │       └─ webhook_logs      # payloads recebidos
  └─ billing_events (audit)

dojo_wallets                   # 1 por dojo (owner_id)
  ├─ ledger_entries            # append-only, tipado
  │    types: charge_gross | gateway_fee | platform_fee (2%)
  │           | refund | withdrawal | adjustment | correction
  └─ withdrawals               # solicitações de saque
       └─ withdrawal_logs

payment_settings               # taxas parametrizáveis por dojo
  pix_fee, boleto_fee,
  card_upfront_fee, card_installment_fee, card_per_installment,
  fixed_cost, percent_cost

pix_keys                       # chaves PIX do dojo para saque
billing_templates              # editor visual + variáveis
reminder_settings              # lembretes automáticos
reminder_schedules             # -X, 0, +X dias
audit_logs                     # centraliza tudo (quem/quando/IP/payload)
reconciliation_queue           # divergências para revisão manual
```

Saldo disponível = `SUM(ledger_entries WHERE status='cleared')` — nunca cacheado.

## Fluxo canônico (todas as fases seguem)

```text
Plano → Matrícula → RecurringBilling → Cycle → PaymentAttempt (gateway)
  → Webhook → validar → ledger_entries (bruto - gateway_fee - 2% AMT)
  → wallet atualiza → dashboard atualiza → audit_log
```

## Fases

### Fase 1 — Fundação (Ledger + Wallet + Gateway abstrato)
- Migração: `dojo_wallets`, `dojo_ledger_entries`, `payment_settings`, `pix_keys`, `audit_logs`.
- Interface TS `PaymentGateway` + `AsaasGateway` (extrai o que já existe em `src/lib/asaas/*`).
- Server fns: `getWalletBalance`, `listLedger`, `savePaymentSettings`.
- UI: aba **Carteira** no AMT Pay já lendo do ledger real (extrato + saldo bruto/pendente/líquido).
- **Migração de dados**: script que reconstrói o ledger a partir de `dojo_invoices` já pagas.

### Fase 2 — Cobrança Recorrente unificada
- Migração: `dojo_recurring_billings`, `recurring_cycles`, `payment_attempts`.
- `RecurringBillingEngine`: cria/edita/suspende/reativa/cancela/altera vencimento/valor/método.
- Views de compatibilidade: telas atuais de "Mensalidades" continuam funcionando (apontam para as novas tabelas).
- Vínculo automático `dojo_enrollments.plan_id` → cria `recurring_billing` no ato da matrícula.
- **Regra**: alterar plano regenera ciclos futuros (não retroativo).

### Fase 3 — Webhook + Ledger automático + Taxas
- Refactor `src/routes/api/public/hooks/asaas.ts` para gravar em `payment_attempts` + `webhook_logs` e disparar `LedgerService.creditPayment(attempt)`.
- `LedgerService.creditPayment` calcula em transação única:
  - `charge_gross` (+valor bruto)
  - `gateway_fee` (-taxa parametrizada em `payment_settings`)
  - `platform_fee` (-2% AMT)
  - Resultado líquido = disponível para saque.
- Idempotência via `UNIQUE (gateway, external_id, event_type)` em `webhook_logs`.
- UI: tela de **Configuração de Taxas** (PIX/Boleto/Cartão à vista/Parcelado/Por parcela/Fixo/%).

### Fase 4 — Dashboard Financeiro completo
- Server fns: KPIs (saldo disponível/pendente, recebimentos dia/mês, aberto/vencido/pago, recorrências ativas, bruto vs líquido, taxas totais).
- Gráficos: evolução mensal, fluxo de caixa 12 meses, taxas × líquido.
- Últimas movimentações + drill-down por cobrança.

### Fase 5 — Lembretes automáticos + Editor de cobranças
- `reminder_settings` + `reminder_schedules` por dojo (habilitar cada -X/0/+X dia).
- `pg_cron` diário → server route `/api/public/hooks/dispatch-reminders` → resolve destinatários e enfileira via canal (e-mail agora; WhatsApp/SMS = flag preparado).
- Templates com variáveis `{{aluno}} {{valor}} {{plano}} {{vencimento}} {{academia}} {{professor}} {{link}} {{pix_qr}}`.
- Editor visual do boleto/cobrança (`billing_templates`): logo/endereço/mensagem/multa/juros/desconto/rodapé + preview lado a lado.

### Fase 6 — Saques + Conciliação + Auditoria
- `WithdrawalService`: valida saldo → registra `withdrawals` (pending) → `Gateway.transferPix()` → webhook confirma → ledger `withdrawal` + status final. Falha reverte e permite retry.
- `PixKeyService`: cadastro e validação (CPF/CNPJ/aleatória/telefone/e-mail).
- Job diário de **conciliação**: percorre `payment_attempts` × extrato do gateway, aponta divergências em `reconciliation_queue` sem alterar registros.
- Painel de **Logs** (filtros: data, aluno, dojo, cobrança, webhook, saque, gateway, erro).

## Detalhes técnicos

- **Não altera** o AMT Dojo Manager fora do AMT Pay / Planos. Módulo Planos ganha apenas o gancho de matrícula → `RecurringBillingEngine`.
- **RLS**: tudo por `owner_id = auth.uid()`; `audit_logs` e `webhook_logs` também tem policy de leitura só pelo dono. Service role escreve via server functions.
- **Grants**: cada tabela ganha `authenticated` + `service_role` na mesma migration.
- **Backward compat**: `dojo_invoices` e `dojo_subscriptions` continuam existindo mas viram views apontando para o novo modelo; a UI antiga não quebra.
- **Testes de aceitação por fase** (script Playwright + queries): cada fase é validada antes de seguir.
- **Taxa AMT fixa 2%** já registrada nas memórias do projeto.

## Decisões que preciso confirmar antes de começar

1. **Ordem de execução**: começar pela **Fase 1** (Fundação) já nesta rodada? Cada fase leva 1 iteração grande.
2. **Migração de histórico**: quando reconstruir o ledger a partir das `dojo_invoices` pagas, mantemos as taxas antigas (se conhecidas) ou marcamos tudo como `legacy_import` sem detalhar taxa/AMT nas históricas?
3. **Compat "Mensalidades"**: manter a tela antiga acessível durante a transição ou remover imediatamente após Fase 2?
4. **Lembretes canal padrão**: começar apenas por **e-mail** (infra pronta) e deixar WhatsApp/SMS como toggles desabilitados até integração futura — confirma?
5. **Conciliação**: rodada **diária às 03:00** ou intervalo menor?

Confirme (ou ajuste) esses 5 pontos e eu executo a Fase 1 já em seguida.
