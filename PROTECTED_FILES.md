# PROTECTED_FILES.md

Versão: 1.0

Status: OBRIGATÓRIO

---

# OBJETIVO

Este documento define quais arquivos, diretórios, componentes e camadas da aplicação possuem proteção arquitetural.

Arquivos classificados como protegidos não poderão ser modificados sem autorização explícita ou sem análise completa de impacto.

Toda IA deverá consultar este documento antes de alterar qualquer arquivo.

---

# NÍVEIS DE PROTEÇÃO

🔴 CRÍTICO

Alteração proibida.

Somente mediante autorização explícita.

---

🟠 ALTO

Alteração permitida apenas após análise completa de impacto.

---

🟡 MÉDIO

Alteração permitida quando limitada ao escopo solicitado.

---

🟢 LOCAL

Alteração permitida.

---

# CAMADA 1 — BOOTSTRAP DA APLICAÇÃO

## src/main.tsx

Proteção

🔴 CRÍTICA

Responsável por:

Inicialização

Providers

Router

Tema

Supabase

É proibido alterar para resolver problemas locais.

---

## src/App.tsx

🔴 CRÍTICA

Responsável por:

Inicialização da aplicação

Layout raiz

Providers

Nunca modificar sem autorização.

---

# CAMADA 2 — ROTEAMENTO

## src/routes

🔴 CRÍTICA

Não alterar:

Estrutura

Navegação

Guards

Loaders

Breadcrumbs

Menu principal

Rotas existentes

Alterações somente quando a solicitação envolver explicitamente rotas.

---

# CAMADA 3 — LAYOUT

## Sidebar

🔴 CRÍTICA

Utilizada por praticamente todo o sistema.

É proibido alterar:

largura

estrutura

navegação

itens

responsividade

tema

sem autorização.

---

## Header

🔴 CRÍTICA

Não alterar:

estrutura

ações globais

perfil

tema

pesquisa

atalhos

---

## Layout Principal

🔴 CRÍTICA

Nunca alterar para corrigir páginas específicas.

---

# CAMADA 4 — PROVIDERS

Todos os Providers possuem proteção máxima.

Exemplos:

AuthProvider

ThemeProvider

QueryProvider

SupabaseProvider

PermissionProvider

TenantProvider

FeatureProvider

Nunca alterar sem análise.

---

# CAMADA 5 — CONTEXTS

Todos os Contexts compartilhados.

Proteção

🟠 ALTA

Antes de modificar verificar:

Todos os consumidores.

Todos os Providers.

Todos os Hooks.

---

# CAMADA 6 — COMPONENTES UI

src/components/ui

Proteção

🔴 CRÍTICA

Inclui:

Button

Input

Dialog

Modal

Card

Table

DataTable

Calendar

Select

Toast

Tabs

Badge

Popover

Tooltip

Checkbox

Switch

Radio

Command

Accordion

Todos pertencem ao Design System.

É proibido criar variantes incompatíveis.

---

# CAMADA 7 — COMPONENTES COMPARTILHADOS

src/components

Proteção

🟠 ALTA

Antes de alterar verificar:

Quantidade de consumidores.

Rotas.

Dependências.

Imports.

---

# CAMADA 8 — HOOKS

src/hooks

Proteção

🟠 ALTA

Nunca alterar Hook compartilhado sem:

análise de impacto

lista de consumidores

testes

---

# CAMADA 9 — SERVICES

src/services

Proteção

🟠 ALTA

Inclui:

Supabase

APIs

Integrações

Storage

Auth

Upload

Nunca alterar sem identificar consumidores.

---

# CAMADA 10 — LIB

src/lib

Proteção

🟠 ALTA

Infraestrutura compartilhada.

É proibido utilizar esta pasta para resolver problemas locais.

---

# CAMADA 11 — FEATURES

src/features

Proteção

🟡 MÉDIA

Alterações permitidas desde que:

restritas ao módulo

não afetem outros módulos

---

# CAMADA 12 — ASSETS

src/assets

🟢 LOCAL

Alterações livres.

---

# CAMADA 13 — SUPABASE

supabase/

Proteção

🔴 CRÍTICA

Nunca alterar:

migrations antigas

policies

triggers

functions

views

sem análise.

Sempre criar nova migration.

---

# CAMADA 14 — EXTENSION

extension/

Proteção

🟠 ALTA

Toda alteração deverá preservar compatibilidade.

---

# CAMADA 15 — PWA

Manifest

Service Worker

Offline Cache

Proteção

🟠 ALTA

Nunca alterar sem testes.

---

# ARQUIVOS IMUTÁVEIS

Os arquivos abaixo somente poderão ser modificados mediante autorização explícita.

App.tsx

main.tsx

Router

Sidebar

Header

Layout Principal

ThemeProvider

AuthProvider

PermissionProvider

Design System

Providers

Contexts Globais

Banco de Dados

Policies

---

# REGRA DE OURO

Antes de alterar qualquer arquivo responder:

Este arquivo é protegido?

Qual seu nível?

Quem utiliza este arquivo?

Quantos módulos dependem dele?

Existe componente reutilizado?

Existe Hook compartilhado?

Existe Service compartilhado?

Existe impacto arquitetural?

Se qualquer resposta indicar risco elevado, interromper a implementação.

---

# MATRIZ DE DECISÃO

Arquivo protegido?

↓

SIM

↓

Existe autorização explícita?

↓

NÃO

↓

Interromper implementação.
