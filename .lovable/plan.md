
# Refatoração: Unidades e Filiais (revisado)

Renomeia o módulo **Unidades** para **Unidades e Filiais**, com duas abas:

```text
/dojo/app/units
├─ Unidades Próprias   (integradas: filtram todos os módulos)
└─ Filiais (Afiliados) (institucional: cadastro + financeiro + contrato + certificado)
```

Sem novo dashboard: o dashboard principal (`/dojo/app`) recebe um **seletor de unidade** ("Todas as unidades" ou uma específica) que já reaproveita a arquitetura multi-tenant existente.

---

## 1) Unidades Próprias

### Schema — expandir `dojo_units` (backwards-compatible)
Todas as colunas novas nullable, sem breaking change:
- Fiscais: `trade_name`, `legal_name`, `cnpj`, `state_registration`, `opened_at`
- Responsável: `manager_name`, `manager_cpf`, `manager_rg`
- Endereço: `zip`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`, `country`
- Contato: `phone2`, `whatsapp`, `email`, `website`, `socials` (jsonb)
- Mídia: `logo_url`, `banner_url`, `facade_url`, `gallery_urls[]`
- Operacional: `hours` (jsonb), `modalities[]`, `age_ranges[]`, `coordinator_ids[]`, `admin_ids[]`
- `metadata` jsonb

### Escopo por unidade nos módulos
Já existe `unit_id` em `dojo_students`. Vou:
- Adicionar `unit_id uuid` opcional (nullable) em: `dojo_classes`, `dojo_invoices`, `dojo_attendance`, `dojo_certificates`, `dojo_graduations`, `dojo_lesson_plans`, `dojo_sales` (não force NOT NULL — dados legados ficam sem unidade)
- Criar `UnitScopeProvider` (contexto React + persistência localStorage) e `UnitSwitcher` (dropdown "Todas as unidades" + lista) posicionado no topbar do Dojo
- Hook `useCurrentUnitId()` consumido pelos server fns via novo parâmetro opcional `unitId` — quando presente, adiciona `.eq('unit_id', unitId)` na query; quando ausente, mostra tudo

### Permissões por unidade
Nova tabela `dojo_unit_members(user_id, unit_id, role)` + helper SQL `has_unit_access()` + RLS. Dono mantém acesso total.

### UI
- Wizard de cadastro (4 passos: Dados gerais / Endereço + Contato / Identidade Visual + Operacional / Permissões)
- Página de detalhe `/dojo/app/units/$id` com abas: Visão geral, Dados, Equipe, Configurações
- KPIs da unidade específica na página de detalhe (reutilizando queries já existentes com `unitId` fixo)

### Dashboard principal
Adicionar o `UnitSwitcher` no topo de `/dojo/app` (dashboard principal). Todas as queries do dashboard passam a aceitar `unitId?` opcional, refletindo automaticamente a seleção.

---

## 2) Filiais (Afiliados) — módulo novo

Institucional, **não integra** com students/classes/attendance. Integra com **Financeiro** e reaproveita o **gerador de certificados existente**.

### Schema
- `dojo_affiliates` — dados da academia + responsável + status (ativo/suspenso/cancelado/em_analise) + `affiliation_number` único por owner + `joined_at`, `expires_at` + mídia + professor responsável (jsonb: nome, modalidade, faixa, dan, tempo, certificações)
- `dojo_affiliate_contracts` — HTML + variáveis + status assinatura + PDF gerado (preparado para e-sign)
- **Financeiro integrado:** cobranças de filiação usam a tabela existente `dojo_invoices` com dois campos novos:
  - `affiliate_id uuid` (FK → `dojo_affiliates`)
  - `source text` (`'student' | 'affiliate' | 'sale'`) — default `'student'`
  
  Assim os pagamentos aparecem automaticamente em Receitas / Contas a receber / Fluxo de caixa do módulo Financeiro, com filtro opcional "Origem: Filiação" quando o usuário quer ver só a rede de afiliados. Zero código novo no ledger — reutiliza `recordInvoicePaymentToLedger`.

### Certificado de Afiliado (reuso total)
Não crio gerador novo. Em vez disso:
- Adicionar a categoria `"afiliado"` em `dojo_certificate_templates.category` (já é text livre, sem migração)
- No **CertificateStudio existente**, expor as variáveis de afiliado (`{{affiliate_name}}`, `{{academy_name}}`, `{{city}}`, `{{state}}`, `{{affiliation_number}}`, `{{issued_at}}`, `{{expires_at}}`, `{{organization_name}}`, `{{qr_code}}`, `{{unique_code}}`) na paleta de tokens quando `category === "afiliado"`
- Botão **"Emitir certificado"** na página do afiliado abre um dialog para escolher qual template de categoria "afiliado" usar, gera o certificado e persiste em `dojo_certificates` (com `affiliate_id` opcional na tabela, ou usa `student_id = null` + `metadata`)

### Contrato de Filiação
- Botão "Gerar Contrato de Filiação" com **modelo base fixo** (8 cláusulas: Objeto, Direitos, Obrigações do Afiliado, Obrigações da Organização, Pagamentos, Vigência, Rescisão, Foro) preenchido com variáveis `{{organization_name}}`, `{{affiliate_name}}`, `{{cpf}}`, `{{cnpj}}`, `{{address}}`, `{{city}}`, `{{state}}`, `{{affiliation_number}}`, `{{signed_at}}`
- Visualizar / Imprimir / PDF / DOCX (docx via `docx` npm ou via HTML→Word)
- Estrutura preparada para assinatura eletrônica (`signature_data` jsonb reservado)

### UI
- Lista de afiliados com filtros (cidade, estado, situação, modalidade, professor, data)
- Detalhe `/dojo/app/units/affiliates/$id` com abas: Dados, Professor Responsável, Identidade Visual, **Financeiro**, Contrato, Certificado, Histórico
- Aba Financeiro do afiliado: lista de cobranças (via `dojo_invoices where affiliate_id = $id`) com botão "Nova cobrança" (mensal / anual / avulsa) — usa o motor de cobrança existente do AMT Pay

---

## 3) Busca e filtros

Barra de busca em ambas as abas por nome, cidade, estado, professor, responsável, CPF, CNPJ, nº filiação, situação.

---

## Execução

Sequência (sem pausas intermediárias):

1. Migration 1: expandir `dojo_units` + `dojo_unit_members` + `has_unit_access()` + RLS
2. Migration 2: adicionar `unit_id` nas 7 tabelas core + FK
3. Migration 3: `dojo_affiliates` + `dojo_affiliate_contracts` + adicionar `affiliate_id` + `source` em `dojo_invoices` + policies + GRANTs
4. Server fns: `units.functions.ts` (expandido), `affiliates.functions.ts`, `affiliate-contracts.functions.ts`
5. `UnitScopeProvider` + `UnitSwitcher` + topbar do Dojo + integração no dashboard `/dojo/app`
6. Rota `/dojo/app/units` com abas + lista + wizard + detalhe da unidade
7. Rota `/dojo/app/units/affiliates` + detalhe do afiliado (todas as abas incluindo Financeiro reutilizando componentes de invoice)
8. Presets de token do afiliado no `CertificateStudio` + botão "Emitir certificado" no afiliado
9. Editor de contrato de afiliação com modelo base + export PDF/DOCX
10. Filtro "Origem: Filiação" no módulo Financeiro

### Fora de escopo desta rodada
- Aplicar `useCurrentUnitId()` em **cada** módulo existente (students/finance/schedule/…). Vou preparar a infra (coluna + switcher + hook) e adaptar apenas o **dashboard principal** nesta rodada. Cada módulo restante vira uma tarefa separada quando você quiser propagar. Se preferir que eu propague tudo agora, me diga e ampliamos o escopo.

Aprovar para eu executar?
