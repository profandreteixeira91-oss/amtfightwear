# Reativação de Subcontas Asaas — AMT Pay v2

Modelo NextFit-like: cada dojo tem sua própria subconta Asaas. PIX/boleto/cartão são emitidos em nome do CNPJ do dojo, e o split de 2% da AMT é feito nativamente pelo Asaas em cada transação.

## Objetivos

- PIX e boleto com **CNPJ do dojo** como recebedor (visível no comprovante).
- **Split automático** de 2% para a wallet AMT em cada cobrança.
- **Onboarding obrigatório** com KYC antes da 1ª cobrança do dojo.
- **Fallback seguro**: se subconta não aprovada, bloqueia emissão (não cai mais na conta central "AMT Fightwear").
- Carteira/saldo/saques puxados da subconta do dojo.

## Fases

### Fase 1 — Onboarding de subconta + KYC obrigatório

- Nova server fn `activateAsaasSubaccount` que:
  1. Cria subaccount no Asaas via `POST /v3/accounts` com dados fiscais do dojo (CNPJ, razão social, endereço, celular, faturamento estimado).
  2. Salva `asaas_subaccount_api_key` (criptografada) e `asaas_wallet_id` em `dojo_academy_profile`.
  3. Retorna checklist de KYC pendente.
- Refatorar `dojo.onboarding.tsx` e `AsaasDocumentsCard.tsx` para:
  - Bloquear acesso ao módulo Carteira/Recebimentos até KYC completo.
  - Exibir status: `pending` → `awaiting_docs` → `approved` → `active`.
- Server fn `getAsaasAccountStatus` consulta status atualizado do Asaas (`GET /v3/myAccount/status`).

### Fase 2 — Emissão em nome do dojo + split nativo

Migrar todas as chamadas de criação de cobrança para usar chave da subconta:

- `src/lib/asaas/enrollment.server.ts` → `resolveDojoAsaasCredentials` volta a retornar:
  - `apiKey`: `asaas_subaccount_api_key` do dojo (descriptografada), OU throw se subconta não aprovada.
  - `split`: `[{ walletId: ASAAS_WALLET_ID_AMT, percentualValue: 2 }]`.
  - `mode`: `"subaccount"`.
- Atualizar `syncInvoiceWithAsaas`, `createSaleCharge`, `enrollStudentWithPlan`, `createSubscription` para passar `split[]` no payload do Asaas.
- `src/lib/dojo/payments/asaas-gateway.server.ts` → aceitar `apiKey` e `split` como parâmetros, remover uso hardcoded da chave central.
- `src/lib/dojo/public-payment.functions.ts` → `resolveOwnerAsaasKey` volta a ler a chave da subconta do dojo dono da fatura (comportamento anterior à correção 404), agora que a cobrança é criada na subconta.

### Fase 3 — Carteira, saldo e saques na subconta

- `getWalletBalance` → `GET /v3/finance/balance` usando chave da subconta.
- `listWalletTransactions` → `GET /v3/financialTransactions` da subconta.
- `requestPixWithdrawal` → `POST /v3/transfers` da subconta para a chave PIX cadastrada pelo dono.
- Remover a tabela `dojo_wallet_transactions` como fonte primária de saldo (vira apenas cache/histórico local). A AMT recebe seu 2% direto na wallet dela via split — sem ledger interno.

## Detalhes técnicos

**Migração de DB**: nenhuma tabela nova. Reaproveitar campos existentes:
- `dojo_academy_profile.asaas_subaccount_api_key` (já existe, criptografado)
- `dojo_academy_profile.asaas_wallet_id` (já existe)
- Adicionar coluna `asaas_account_status` (`pending|awaiting_docs|approved|active|rejected`).

**Split payload Asaas** (aplicado em toda cobrança):
```json
{ "split": [{ "walletId": "<ASAAS_WALLET_ID_AMT>", "percentualValue": 2 }] }
```

**Webhook**: `asaas-webhook` continua na conta central AMT? **Não** — cada subconta tem webhook próprio. Configurar webhook por subconta apontando para nossa rota `/api/public/hooks/asaas` já existente, com `apiKey` da subconta no header para identificação. Ajustar handler para resolver `owner_id` via lookup na `asaas_subaccount_api_key` recebida.

**Dojos existentes com cobranças ativas na conta central**: cobranças antigas continuam sendo consultadas com a chave central (fallback por `mode` armazenado na fatura). Novas cobranças só saem via subconta.

**Fallback removido**: se `asaas_subaccount_api_key` não existe/não aprovada, `resolveDojoAsaasCredentials` faz throw com mensagem clara ("Complete a ativação do AMT Pay em /dojo/onboarding"). Não cai mais silenciosamente na conta AMT central.

## Arquivos afetados (estimativa)

- `src/lib/asaas/enrollment.server.ts` — reescrita de `resolveDojoAsaasCredentials`
- `src/lib/asaas/asaas.functions.ts` — nova `activateAsaasSubaccount` + `getAsaasAccountStatus`
- `src/lib/asaas/client.server.ts` — endpoints de account/status/balance/transfers
- `src/lib/dojo/payments/asaas-gateway.server.ts` — receber apiKey/split como params
- `src/lib/dojo/public-payment.functions.ts` — reverter `resolveOwnerAsaasKey`
- `src/lib/dojo/dojo.functions.ts` — wallet balance/transactions/withdrawals
- `src/lib/dojo/sales.functions.ts` — passar split
- `src/routes/dojo.onboarding.tsx` — fluxo de ativação
- `src/routes/dojo.app.subscription.tsx` (Carteira) — gates de KYC
- `src/components/dojo/amtpay/*` — status da subconta
- `src/routes/api/public/hooks/asaas.ts` — resolver owner via subconta
- Migração: `ALTER TABLE dojo_academy_profile ADD COLUMN asaas_account_status text`

## Impacto operacional

- **Todos os dojos ativos hoje** precisam refazer onboarding com KYC antes da próxima cobrança recorrente. Adicionar banner de aviso com prazo (ex: 30 dias).
- Cobranças já emitidas na conta central continuam funcionando até a próxima renovação.

## Perguntas antes de executar

1. Executo **as 3 fases numa única release**, ou você prefere entregar por fases (Fase 1 → validar onboarding → Fase 2 → Fase 3)?
2. Prazo para forçar dojos ativos a migrarem: **30 dias**, **60 dias** ou **sem prazo** (só novos dojos usam subconta, antigos continuam na central)?
3. Confirma **2% fixo** de split AMT em toda transação, ou variável por plano da AMT (ex: dojo free = 3%, dojo pro = 2%)?
