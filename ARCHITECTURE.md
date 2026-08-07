# ARCHITECTURE.md

> Documento Oficial da Arquitetura
>
> Este documento define a arquitetura oficial do AMT Dojo Manager.
>
> Toda implementação deverá seguir rigorosamente esta documentação.

---

# 1. VISÃO GERAL

O AMT Dojo Manager é uma plataforma SaaS modular desenvolvida utilizando arquitetura baseada em componentes, separação por responsabilidades e reutilização máxima de código.

A arquitetura foi projetada para permitir crescimento contínuo sem necessidade de refatorações estruturais.

Os princípios fundamentais são:

• Alta coesão

• Baixo acoplamento

• Componentização

• Escalabilidade

• Reutilização

• Performance

• Segurança

• Manutenibilidade

---

# 2. CAMADAS DA APLICAÇÃO

Toda funcionalidade deverá respeitar obrigatoriamente a arquitetura abaixo.

```
Usuário

↓

Interface

↓

Componentes

↓

Layouts

↓

Pages

↓

Hooks

↓

Services

↓

Integrações

↓

Supabase

↓

Banco de Dados
```

É proibido pular camadas.

Exemplo:

❌ Componentes acessando banco diretamente.

❌ Layout contendo regra de negócio.

❌ Página implementando acesso direto ao Supabase.

---

# 3. RESPONSABILIDADE DAS CAMADAS

## Interface

Responsável exclusivamente pela renderização.

Nunca deverá possuir regra de negócio.

---

## Componentes

Responsáveis pela construção da interface reutilizável.

Devem ser independentes.

Não devem conhecer detalhes do banco.

---

## Layouts

Responsáveis apenas pela estrutura visual.

Exemplos:

Sidebar

Header

Navbar

Breadcrumb

Footer

Containers

Jamais deverão possuir regras específicas de módulos.

---

## Pages

Responsáveis pela composição.

Uma página organiza componentes.

Nunca implementa lógica complexa.

---

## Hooks

Responsáveis por encapsular lógica.

Exemplos:

consultas

mutações

estado

efeitos

cache

Toda lógica repetitiva deve existir em hooks.

---

## Services

Responsáveis pela comunicação externa.

Exemplos:

Supabase

REST

Storage

Auth

Uploads

Nenhuma página deverá acessar APIs diretamente.

---

## Integrações

Responsáveis pela comunicação com sistemas externos.

Mercado Pago

Meta Ads

Google

Asaas

Webhooks

IA

---

## Banco

Responsável exclusivamente pela persistência.

Nunca deverá conter lógica de interface.

---

# 4. ORGANIZAÇÃO DOS DIRETÓRIOS

Cada pasta possui responsabilidade única.

## src/components

Somente componentes reutilizáveis.

---

## src/routes

Somente páginas.

---

## src/hooks

Somente hooks.

---

## src/services

Somente comunicação externa.

---

## src/lib

Infraestrutura compartilhada.

Nunca implementar regra de negócio.

---

## src/contexts

Estado global.

---

## src/providers

Inicialização.

---

## src/features

Componentes específicos de módulos.

---

## src/assets

Recursos estáticos.

---

## supabase

Infraestrutura do banco.

Migrations

Policies

Functions

Storage

---

# 5. DEPENDÊNCIAS

A direção correta das dependências é:

```
Page

↓

Hook

↓

Service

↓

Supabase
```

Nunca o contrário.

---

# 6. COMPONENTES GLOBAIS

São considerados componentes globais:

Sidebar

Header

Theme

Router

Providers

Toast

Dialog

DataTable

Button

Input

Form

Modal

Calendar

Esses componentes possuem proteção máxima.

---

# 7. DESIGN SYSTEM

Todo componente deverá seguir o Design System.

É proibido:

criar novas cores

criar novos espaçamentos

criar novas tipografias

criar novos padrões de botão

criar novos padrões de tabela

sem atualização oficial do Design System.

---

# 8. ARQUITETURA MODULAR

Cada módulo deverá ser independente.

Exemplo:

Financeiro

↓

Componentes próprios

↓

Hooks próprios

↓

Services próprios

↓

Rotas próprias

↓

Permissões próprias

Nenhum módulo deverá modificar diretamente outro módulo.

---

# 9. REUTILIZAÇÃO

Antes de criar qualquer componente novo, verificar:

Existe componente semelhante?

Existe hook semelhante?

Existe service semelhante?

Existe tabela semelhante?

Existe integração semelhante?

Se existir, reutilizar.

---

# 10. ACOPLAMENTO

É proibido:

Componentes conhecerem banco.

Layouts conhecerem regras.

Sidebar conhecer Financeiro.

Header conhecer Produção.

Pages conhecer SQL.

---

# 11. ESCALABILIDADE

Toda implementação nova deverá permitir:

novos módulos

novos layouts

novas integrações

novos usuários

novos planos

sem alterar arquitetura existente.

---

# 12. ANÁLISE DE IMPACTO

Antes de modificar qualquer arquivo, identificar:

Dependências diretas.

Dependências indiretas.

Componentes consumidores.

Hooks consumidores.

Services consumidores.

Rotas afetadas.

Permissões afetadas.

Banco afetado.

Integrações afetadas.

---

# 13. FLUXO OBRIGATÓRIO

Toda alteração seguirá obrigatoriamente:

Ler documentação

↓

Entender arquitetura

↓

Localizar arquivos

↓

Analisar dependências

↓

Analisar impacto

↓

Planejar

↓

Implementar
