
## Objetivo
Nesta v1, o **AMT Pay** deixa de manter saldo local e passa a ser uma **camada de leitura/comando** sobre o gateway conectado (Asaas / Mercado Pago). Toda consulta financeira é feita ao vivo no gateway. Nenhum saldo é persistido localmente.

## Arquitetura

```text
UI (Dashboard, Carteira, Saques, Extrato)
        ↓
AMT Pay Service (amtpay.functions.ts)
        ↓
Gateway Adapter (interface comum)
   ├─ Asaas Adapter       (suporta balance + transfers + statement via API)
   └─ Mercado Pago Adapter (v1: capacidades limitadas → "Gerenciar no gateway")
        ↓
API oficial do gateway
```

Nenhum outro módulo (Financeiro, Planos, Alunos, Cobranças) fala com o gateway diretamente — sempre via AMT Pay Service.

## Interface do adaptador

Cada adapter implementa:
- `capabilities` → `{ balance, statement, withdrawals, editBankAccount, chooseWithdrawalPixKey, dashboardUrl }`
- `getBalance()` → `{ available, pending, blocked, currency }`
- `getStatement({ from, to })` → lista normalizada de lançamentos (data, tipo, método, valor bruto, taxa, líquido, descrição, referência)
- `getReceiptsSummary()` → recebimentos hoje/mês, contagem PIX/boleto/cartão
- `listWithdrawals()` → transferências/saques do próprio gateway
- `requestWithdrawal({ amount, pixKey?, pixKeyType? })` → cria transferência PIX no gateway
- `getBankAccountInfo()` → dados da conta configurada no gateway (quando expostos)

## Mudanças por arquivo

**Novos**
- `src/lib/dojo/gateway-adapters/types.ts` — tipos + interface `GatewayAdapter`
- `src/lib/dojo/gateway-adapters/asaas.server.ts` — chamadas a `/v3/finance/balance`, `/v3/financialTransactions`, `/v3/transfers`
- `src/lib/dojo/gateway-adapters/mercadopago.server.ts` — v1 devolve `capabilities` limitadas + `dashboardUrl` para gestão manual
- `src/lib/dojo/gateway-adapters/index.server.ts` — `resolveAdapter(ownerId)` que lê `dojo_payment_gateways` e devolve o adapter certo

**Refatorados (`src/lib/dojo/amtpay.functions.ts`)**
- `getGatewayCapabilities` (novo) — UI pergunta o que exibir/ocultar
- `getWalletBalance` — passa a chamar `adapter.getBalance()`
- `getWalletDashboard` — saldo + resumo de recebimentos vêm do adapter; `openInvoices` / `overdueAmount` / `activeSubscriptions` continuam vindo do DM (dados internos, não do gateway)
- `listWalletTransactions` / `getWalletChart` — passam a chamar `adapter.getStatement()` e agregam a série de 30 dias em memória
- `listWithdrawals` — chama `adapter.listWithdrawals()`; mantém `dojo_withdrawals` só como log de auditoria das solicitações feitas pelo AMT Pay
- `requestWithdrawal` — chama `adapter.requestWithdrawal()`; grava registro de auditoria em `dojo_withdrawals` com o `provider_id` retornado; sem reserva local de saldo
- Remove leitura de `dojo_wallet_balance` / `dojo_wallet_transactions` como fonte oficial (view/tabelas continuam existindo, sem uso — não vamos apagar nesta v1)
- Conta bancária: se `capabilities.editBankAccount = true` (Asaas), UI edita normalmente; se `false` (MP), `saveBankAccount` bloqueia e UI mostra botão **"Gerenciar Conta no Gateway"** com `dashboardUrl`

**UI (`src/components/dojo/amtpay/*` + `dojo.app.integrations.tsx`)**
- Carrega `getGatewayCapabilities` no topo e passa via prop
- `WithdrawDialog`: se o gateway permitir, mostra campo opcional de chave PIX alternativa
- `BankAccountDialog`: fica somente-leitura + link "Gerenciar no gateway" quando `editBankAccount = false`
- Banner "Fonte: Asaas · atualizado há Xs" com botão de atualizar

## Regras
- Nenhum valor financeiro é persistido como saldo oficial no Supabase nesta v1
- Multi-tenant: adapter é sempre resolvido por `ownerId` do contexto autenticado
- Se não houver gateway ativo, todas as funções retornam estado vazio + orientação para conectar

## Evolução futura (fora do escopo desta v1)
Adaptadores adicionais (Pagar.me, Stripe), carteira própria com split, repasses automáticos — encaixam sem tocar nos módulos consumidores porque tudo passa pelo AMT Pay Service.
