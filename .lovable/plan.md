# Refatoração AMT Pay — Split de Pagamento centralizado

## Novo conceito

AMT Pay deixa de ser um **hub de integrações** (Asaas/MP/Pagar.me configurados pelo dono do dojo) e passa a ser um **módulo de pagamento próprio**, operando 100% no **Mercado Pago corporativo da AMT Fight Wear** com **split** (Marketplace/Oauth) para cada dojo cliente.

- O dojo **não conecta mais** gateway próprio.
- Toda cobrança (mensalidades, matrículas, avulsos) é processada pela conta MP da AMT.
- O valor é **automaticamente dividido** entre AMT (taxa da plataforma) e o dojo (repasse), configurável por operação.
- Saques do dojo continuam via AMT Pay (agora saldo interno, não mais consulta a gateway externo).

## Arquitetura do split

```text
Aluno paga R$ 200 (mensalidade)
        ↓
Mercado Pago AMT Fight Wear (conta única)
        ↓
   Split configurado
   ├── AMT: R$ X (taxa da plataforma - % ou fixo)
   └── Dojo: R$ (200 - X - MDR MP)  →  saldo AMT Pay do dojo
        ↓
Dojo solicita saque → transferência PIX AMT → conta bancária cadastrada
```

## Escopo desta entrega

### 1. Módulo AMT Pay — remoção de integrações

- Remover completamente:
  - `AMTPayWizard.tsx` (assistente de conexão de gateways).
  - `GatewayAccountsPanel.tsx` (cards de contas Asaas/MP/Pagar.me).
  - Aba/tela de "Modo Avançado" com API Keys.
  - Adapters em `src/lib/dojo/gateway-adapters/*` (Asaas/MP externos).
- Manter tabelas `dojo_gateway_history` e `dojo_payment_gateways` como **histórico read-only** (para dojos que já usaram); não permitir novas conexões.

### 2. Nova estrutura de split

- Migration criando:
  - `dojo_split_config` — configuração de split por dojo (percentual/fixo da AMT, tipo de operação: mensalidade / matrícula / avulso, ativo).
  - `dojo_split_transactions` — registro de cada transação: `mp_payment_id`, `gross_amount`, `mp_fee`, `amt_fee`, `dojo_net`, `status`, `student_id`, `invoice_id`, `type`.
  - Ajuste em `dojo_wallet_transactions` para referenciar `split_transaction_id`.
- Grants + RLS: dojo lê o próprio; AMT (role admin) lê tudo.

### 3. Configuração central (AMT admin)

- Nova rota `/admin/amt-pay-config` (visível apenas para role `admin` da AMT):
  - Definir taxa padrão da plataforma (% + fixo).
  - Override por dojo.
  - Ver todas as transações e volumes.

### 4. Painel do dojo (`/dojo/app/amt-pay`)

Redesenhar totalmente a rota `dojo.app.integrations.tsx` (renomear conceitualmente):

- **Aba Visão Geral**: saldo disponível (do wallet interno), a receber, taxa da plataforma configurada, últimas transações.
- **Aba Extrato**: transações vindas do split (não mais do gateway externo). Cada linha mostra: bruto, taxa MP, taxa AMT, líquido.
- **Aba Saques**: fluxo mantido (`WithdrawDialog`), agora contra saldo interno.
- **Aba Configuração**: apenas dados bancários e chave PIX para saque. Sem "conectar gateway".

### 5. Motor de cobrança

- Refatorar `mercadopago.functions.ts` para usar credenciais **únicas da AMT** (secrets já existentes: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `MERCADOPAGO_PUBLIC_KEY`).
- Ao criar cobrança de mensalidade/matrícula, incluir metadata `{ dojo_owner_id, invoice_id, type }`.
- Novo endpoint público `/api/public/webhooks/mercadopago-split` que:
  1. Valida assinatura MP.
  2. Ao receber `payment.approved`, calcula split conforme `dojo_split_config`.
  3. Grava `dojo_split_transactions`.
  4. Credita saldo no wallet do dojo (`dojo_wallet_transactions` tipo `credit`).
  5. Marca invoice como paga.

### 6. Fluxos afetados

- `enrollStudentWithPlan` — segue gerando link MP, mas via conta AMT com metadata do dojo.
- Faturas recorrentes: mesma coisa.
- Loja AMT (dojo store checkout): mantém-se; o split já é diferente (produtos da AMT), não misturar.

## Fora do escopo (para próxima fase)

- Split via API oficial Marketplace do MP (OAuth). Nesta fase implementamos split **contábil** (uma conta MP recebe tudo e distribuímos internamente). O usuário confirma que essa abordagem inicial serve, dado que o dono da conta MP é a AMT.
- Emissão automática de nota fiscal.
- Reconciliação com extrato bancário da AMT.

## Estrutura técnica (detalhes)

- Tabelas novas seguem regra: `CREATE TABLE` → `GRANT` → `ENABLE RLS` → `POLICY`.
- Função `has_role(auth.uid(), 'admin')` para políticas AMT.
- `.functions.ts` finos, helpers em `.server.ts`.
- Sem novos gateway adapters.

## Confirmações necessárias

1. **Split contábil** (conta única AMT recebe tudo, distribuição interna via saldo) está OK como v1? Ou você já quer o **Split MP Marketplace via OAuth** (dojo autoriza a AMT a fazer split direto na API do MP — mais complexo, exige homologação MP)?
2. Confirma que a **taxa da plataforma** é configurável no admin da AMT (não pelo dojo)?
3. Manter o histórico das antigas conexões de gateway como read-only, ou apagar tudo?
