# DEPENDENCY_MAP.md

Versão: 1.0

Status: Obrigatório

---

# OBJETIVO

Este documento define todas as dependências entre módulos do sistema.

Toda alteração deverá consultar este mapa antes da implementação.

Nenhum módulo poderá ser alterado isoladamente sem verificar suas dependências.

---

# REGRA PRINCIPAL

Sempre analisar:

Dependências Diretas

↓

Dependências Indiretas

↓

Componentes Compartilhados

↓

Banco

↓

Integrações

↓

Permissões

↓

Layout

Somente depois implementar.

---

# MAPA GERAL

```

Portal Público

↓

Autenticação

↓

Dashboard

↓

Módulos

↓

Banco

↓

Integrações

```

---

# DASHBOARD

Depende de:

Usuários

Permissões

Financeiro

Pedidos

Produção

Relatórios

Notificações

Analytics

Nunca alterar Dashboard sem validar todos estes módulos.

---

# CATÁLOGO

Depende de:

Produtos

Categorias

Imagens

Estoque

Marketplace

SEO

Fiscal

Importação

Exportação

Analytics

Ao alterar Catálogo verificar obrigatoriamente:

Cards

Filtros

Pesquisa

Paginação

Produtos

Cache

---

# PRODUTOS

Relacionamentos:

Categorias

Estoque

Fiscal

Marketplace

Pedidos

Produção

Imagens

SEO

Nunca alterar Produto sem validar:

Pedidos

Produção

Catálogo

Fiscal

---

# PEDIDOS

Relacionamentos:

Clientes

Produtos

Pagamento

Fiscal

Financeiro

Produção

Expedição

Notificações

Relatórios

Ao alterar Pedido verificar:

Estoque

Produção

Financeiro

Fiscal

---

# PRODUÇÃO

Relacionamentos:

Pedidos

Produtos

Estoque

Matéria-prima

Expedição

Fiscal

Relatórios

Nunca alterar Produção isoladamente.

---

# ESTOQUE

Relacionamentos:

Produtos

Pedidos

Produção

Compras

Fiscal

Marketplace

Relatórios

Toda movimentação deverá preservar integridade.

---

# FISCAL

Relacionamentos:

Pedidos

Produtos

Clientes

Transportadoras

NCM

CFOP

CEST

NF-e

Financeiro

Nunca alterar Fiscal sem validar emissão completa.

---

# FINANCEIRO

Relacionamentos:

Pedidos

Fiscal

Clientes

Fornecedores

Mensalidades

Assinaturas

AMT Pay

Mercado Pago

Asaas

PIX

Boletos

Nunca alterar regras financeiras sem validar cobranças.

---

# CLIENTES

Relacionamentos:

Pedidos

Financeiro

Fiscal

CRM

Leads

Mensagens

Relatórios

---

# USUÁRIOS

Relacionamentos:

Autenticação

Permissões

Perfis

Dashboard

Logs

Notificações

---

# PERMISSÕES

Relacionamentos:

Todos os módulos.

Proteção máxima.

---

# DOJO MANAGER

Relacionamentos:

Alunos

Graduações

Aulas

Check-in

Avaliações

Mensalidades

Financeiro

Certificados

Planos

Contratos

Nunca alterar isoladamente.

---

# ALUNOS

Relacionamentos:

Turmas

Planos

Pagamentos

Graduações

Avaliações

Presenças

Contratos

Financeiro

---

# CHECK-IN

Relacionamentos:

Aluno

Turma

Agenda

QR Code

Foto

Gympass

TotalPass

Financeiro

---

# CERTIFICADOS

Relacionamentos:

Aluno

Graduação

Instrutor

Assinatura

PDF

Histórico

---

# AMT PAY

Relacionamentos:

Mercado Pago

Asaas

Assinaturas

Financeiro

Planos

PIX

Boletos

Cartão

Webhook

---

# TRÁFEGO PAGO

Relacionamentos:

Meta Ads

Google Ads

Pixel

Conversões

Leads

Pedidos

Analytics

---

# RELATÓRIOS

Relacionamentos:

Todos os módulos.
