# Migração AMT Pay para Asaas

## Objetivo

Substituir o Mercado Pago pelo **Asaas** como gateway do AMT Pay (mensalidades e repasses aos dojos), aproveitando:
- **Split nativo** (sem OAuth de dojo)
- **PIX Out automático** para chave PIX do dojo
- **Assinaturas recorrentes** nativas (mensalidades)
- **Onboarding de subcontas** via API

A loja AMT Fight Wear (checkout de produtos) **continua no Mercado Pago** — nada muda para o cliente final da loja.

## Escopo desta migração

**Dentro do escopo:**
- Mensalidades de alunos (matrícula + recorrência)
- Split contábil AMT ↔ Dojo
- Repasse automático ao dojo (subconta Asaas + saque PIX)
- Carteira e extrato do AMT Pay
- Webhook de confirmação de pagamento

**Fora do escopo (mantém MP):**
- Loja AMT Fight Wear
- AMT Store dentro do Dojo Manager (usa checkout da loja)
- Custom Shop

## Arquitetura alvo

```text
┌─────────────────────────────────────────────────────┐
│  Aluno paga mensalidade                             │
│  (PIX / Cartão / Boleto via Asaas Checkout)         │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│  Cobrança Asaas com SPLIT nativo:                   │
│    - 95% (ou %) → subconta Asaas do DOJO            │
│    - 5% (ou %) → conta principal AMT                │
└────────────────────┬────────────────────────────────┘
                     ↓
      ┌──────────────┴──────────────┐
      ↓                             ↓
  Subconta Dojo                  Conta AMT
  (crédito D+1)                  (crédito D+1)
      ↓
  Saque PIX automático
  para chave PIX cadastrada
```

## Fases de entrega

### Fase 1 — Fundação Asaas (backend)
1. Criar `src/lib/asaas/client.server.ts` — HTTP client tipado (Bearer token, base URL sandbox/prod).
2. Criar `src/lib/asaas/asaas.server.ts` com wrappers para:
   - `createCustomer`, `createSubaccount` (subconta do dojo)
   - `createCharge` com split, `createSubscription`
   - `createTransfer` (PIX Out)
   - `getBalance`, `listTransactions`
3. Migration: adicionar em `dojo_academy_profile`:
   - `asaas_subaccount_id`, `asaas_wallet_id`, `asaas_api_key_encrypted`
   - `pix_key`, `pix_key_type`
4. Migration: adicionar em `dojo_invoices`:
   - `asaas_charge_id`, `asaas_invoice_url`, `split_config` (JSONB)
5. Configurar secret `ASAAS_WALLET_ID_AMT` (Wallet ID master da AMT — necessário para receber o percentual do split).

### Fase 2 — Onboarding automático de dojos
1. Ao concluir cadastro do dojo (ou botão "Ativar AMT Pay"):
   - Criar subconta Asaas via API (CPF/CNPJ, dados do responsável, endereço)
   - Guardar `wallet_id` retornado em `dojo_academy_profile`
   - Retornar link de KYC do Asaas se pendente
2. UI: nova aba "Configurar recebimento" no AMT Pay com formulário unificado (dados fiscais + chave PIX).

### Fase 3 — Refatorar cobrança de mensalidades
1. Substituir `enrollStudentWithPlan` para criar cobrança Asaas com split:
   - `split: [{ walletId: dojoWalletId, percentualValue: 95 }]`
   - Restante (5%) fica automaticamente na conta AMT
2. Substituir `subscription.functions.ts` para usar `POST /subscriptions` do Asaas (recorrência nativa com retry).
3. Criar rota pública `src/routes/api/public/hooks/asaas.ts`:
   - Validar `asaas-access-token` header contra `ASAAS_WEBHOOK_TOKEN`
   - Atualizar `dojo_invoices` no evento `PAYMENT_CONFIRMED`
   - Registrar entrada em `dojo_wallet_transactions` (log contábil apenas)

### Fase 4 — Repasse PIX automático
1. Cadastro de chave PIX no perfil do dojo (`pix_key`, `pix_key_type` com validação).
2. Refatorar `WithdrawDialog.tsx`:
   - Consulta saldo real via `getBalance(dojoWalletId)`
   - Ao solicitar saque, chama `createTransfer` do Asaas
   - Atualiza `dojo_withdrawals` com `asaas_transfer_id` e `status`
3. Webhook Asaas `TRANSFER_DONE` marca saque como confirmado.
4. Opcional: cron de repasse automático semanal (checkbox no perfil).

### Fase 5 — Descomissionar MP no AMT Pay
1. Remover `src/lib/store/mercadopago.functions.ts` **apenas** das rotas de mensalidade — manter para a loja.
2. Remover código de "split contábil interno" no webhook MP (rotas de mensalidade).
3. Manter tabela `dojo_split_transactions` como legado histórico (não apagar dados).
4. Atualizar UI do AMT Pay (`dojo.app.integrations.tsx`) para:
   - Banner: "Fonte: Asaas (tempo real)"
   - Card de saldo consultando Asaas ao vivo

### Fase 6 — Documentação e migração de dados
1. Script de migração: para cada dojo ativo, criar subconta Asaas (com aprovação do dono via aceite de termos).
2. Assinaturas MP existentes ficam ativas até vencimento; novas mensalidades vão para Asaas.
3. Atualizar `mem://` com a decisão arquitetural.

## Secrets necessários

| Secret | Origem | Status |
|---|---|---|
| `ASAAS_API_KEY` | Painel Asaas → Integrações → API Key produção | ✅ já configurado |
| `ASAAS_WEBHOOK_TOKEN` | Painel Asaas → Notificações → Token | ✅ já configurado |
| `ASAAS_WALLET_ID_AMT` | Painel Asaas → Minha conta → Wallet ID | ⚠️ **falta configurar** |
| `ASAAS_ENV` | `production` ou `sandbox` | ⚠️ **falta configurar** |

## Webhook a configurar no painel Asaas

URL: `https://dojomanager.amtfightwear.com.br/api/public/hooks/asaas`

Eventos: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `TRANSFER_DONE`, `TRANSFER_FAILED`.

## Riscos e mitigação

- **Dojos existentes sem subconta Asaas:** manter fallback para MP até que o dono complete o KYC do Asaas.
- **Falha no split (dojo sem `wallet_id`):** cobrança cai 100% na AMT + alerta no painel para configurar.
- **Recorrência já ativa no MP:** não interromper; apenas rotear NOVAS cobranças para Asaas.
- **Chave PIX inválida:** validar formato antes de salvar; Asaas também valida antes de transferir.

## Decisões que preciso confirmar antes de começar

1. **Percentual de split padrão:** 5% AMT / 95% dojo? Ou você quer configurável por dojo (tabela `dojo_split_config` já existe)?
2. **Ambiente inicial:** começamos em `sandbox` do Asaas para eu testar, depois viramos a chave para `production`?
3. **Migração de alunos com assinatura ativa no MP:** deixa expirar naturalmente (recomendado) ou cancela e recria no Asaas?
4. **Onde você quer que eu envie o formulário de secret?** Preciso do `ASAAS_WALLET_ID_AMT` (você pega no painel Asaas → Minha conta → seção Split / Wallet ID) e do `ASAAS_ENV` (`sandbox` ou `production`).
