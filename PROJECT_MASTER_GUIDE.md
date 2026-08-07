# PROJECT_MASTER_GUIDE.md

> Versão: 1.0
> Status: Documento Oficial da Arquitetura
> Projeto: AMT Dojo Manager
> Autoridade: Este documento define as regras oficiais para desenvolvimento, manutenção, refatoração e evolução do sistema.

---

# CAPÍTULO 1 — FINALIDADE

## 1.1 Objetivo

Este documento é a autoridade máxima sobre a arquitetura do sistema.

Toda alteração realizada por desenvolvedores humanos, Inteligências Artificiais ou ferramentas automatizadas deverá obedecer obrigatoriamente às regras aqui descritas.

Nenhuma decisão técnica poderá contrariar este documento sem autorização explícita do arquiteto responsável pelo projeto.

---

## 1.2 Missão

Garantir que o sistema permaneça:

- Escalável
- Modular
- Seguro
- Consistente
- Reutilizável
- Retrocompatível
- Fácil de manter
- Visualmente uniforme

---

## 1.3 Escopo

Este documento aplica-se a:

✓ Front-end

✓ Back-end

✓ Banco de Dados

✓ APIs

✓ Integrações

✓ Componentes

✓ Hooks

✓ Contexts

✓ Providers

✓ Layouts

✓ Design System

✓ Rotas

✓ Serviços

✓ Módulos

✓ Extensão Chrome

✓ Aplicativo PWA

✓ IA

---

# CAPÍTULO 2 — PRINCÍPIOS DA ARQUITETURA

Toda decisão técnica deverá respeitar obrigatoriamente os princípios abaixo.

## Artigo 1

Preservar a estabilidade do sistema sempre terá prioridade sobre adicionar novas funcionalidades.

---

## Artigo 2

Nenhuma alteração poderá degradar a experiência do usuário.

---

## Artigo 3

Toda funcionalidade existente deve permanecer operacional após qualquer alteração.

---

## Artigo 4

Toda implementação deverá reutilizar componentes existentes sempre que possível.

---

## Artigo 5

Duplicação de código é proibida.

---

## Artigo 6

Toda alteração deverá possuir impacto previsível.

---

## Artigo 7

Alterações devem atingir o menor número possível de arquivos.

---

## Artigo 8

Todo componente deverá possuir responsabilidade única.

---

## Artigo 9

Toda regra de negócio deverá permanecer centralizada.

---

## Artigo 10

Toda alteração deverá preservar retrocompatibilidade.

---

# CAPÍTULO 3 — CONSTITUIÇÃO DO PROJETO

As regras abaixo possuem caráter obrigatório.

Sua violação é considerada erro crítico.

---

## Artigo 11

É proibido alterar qualquer arquivo fora do escopo solicitado.

---

## Artigo 12

É proibido remover funcionalidades existentes.

---

## Artigo 13

É proibido alterar componentes globais para resolver problemas locais.

---

## Artigo 14

É proibido modificar Layouts Compartilhados sem autorização explícita.

---

## Artigo 15

É proibido alterar o banco de dados sem análise de impacto.

---

## Artigo 16

É proibido alterar APIs existentes sem justificativa técnica.

---

## Artigo 17

É proibido alterar rotas existentes sem autorização.

---

## Artigo 18

É proibido alterar permissões sem análise completa.

---

## Artigo 19

É proibido criar componentes duplicados.

---

## Artigo 20

É proibido criar estilos paralelos quando existir componente oficial.

---

# CAPÍTULO 4 — HIERARQUIA DA ARQUITETURA

Toda alteração deverá respeitar esta hierarquia.

Banco de Dados

↓

Supabase

↓

Integrações

↓

Services

↓

Hooks

↓

Contexts

↓

Providers

↓

Layouts

↓

Pages

↓

Componentes

↓

Interface

Nenhuma camada poderá assumir responsabilidades pertencentes à camada inferior.

---

# CAPÍTULO 5 — ESTRUTURA OFICIAL

A estrutura oficial do projeto é composta por:

src/

components/

routes/

hooks/

contexts/

providers/

services/

lib/

integrations/

assets/

data/

styles/

public/

supabase/

extension/

Cada diretório possui responsabilidade específica.

É proibido criar estruturas paralelas sem justificativa arquitetural.

---

# CAPÍTULO 6 — CLASSIFICAÇÃO DOS ARQUIVOS

Todos os arquivos deverão ser classificados em quatro níveis.

## Nível 1 — Crítico

Exemplos:

App.tsx

main.tsx

Router

Providers

Theme Provider

Authentication

Authorization

Layouts

Sidebar

Header

Esses arquivos possuem proteção máxima.

---

## Nível 2 — Compartilhado

Hooks

Services

Contexts

Lib

Utils

Integrações

Componentes reutilizados

Necessitam análise de impacto.

---

## Nível 3 — Modular

Arquivos exclusivos de um módulo.

Podem ser alterados desde que não afetem dependências externas.

---

## Nível 4 — Local

Componentes utilizados apenas por uma página.

Possuem menor risco.

---

# CAPÍTULO 7 — PROTEÇÃO DOS COMPONENTES

São considerados componentes protegidos:

- Sidebar
- Header
- Navigation
- Breadcrumb
- Dashboard Base
- DataTable Base
- Dialog Base
- Toast System
- Theme
- Providers
- Layout Principal
- Sistema de Login
- Sistema de Permissões

Nenhum desses componentes poderá ser alterado para resolver problemas específicos de um módulo.

---

# CAPÍTULO 8 — FLUXO OBRIGATÓRIO DE IMPLEMENTAÇÃO

Toda alteração deverá seguir obrigatoriamente o seguinte processo:

1. Ler a documentação oficial.
2. Compreender o escopo solicitado.
3. Localizar todos os arquivos envolvidos.
4. Identificar dependências.
5. Identificar componentes compartilhados.
6. Avaliar impactos.
7. Planejar a implementação.
8. Implementar apenas o solicitado.
9. Executar validações.
10. Documentar as alterações.

Qualquer implementação que ignore este fluxo é considerada inválida.

---

# CAPÍTULO 9 — CHECKLIST OBRIGATÓRIO

Antes de modificar qualquer arquivo, responder:

- Qual é o objetivo da alteração?
- Quais arquivos serão modificados?
- Existem componentes compartilhados?
- Existe reutilização?
- Existem dependências ocultas?
- Há impacto em outros módulos?
- Há impacto no banco?
- Há impacto em APIs?
- Há impacto no Design System?

Se qualquer resposta indicar risco elevado, a implementação deverá ser interrompida até que a análise de impacto seja concluída.

---

# CAPÍTULO 10 — REGRA DE OURO

Toda implementação deverá obedecer rigorosamente a seguinte ordem de prioridade:

1. Preservar o funcionamento do sistema.
2. Preservar a arquitetura.
3. Preservar o Design System.
4. Preservar componentes compartilhados.
5. Preservar integrações.
6. Preservar banco de dados.
7. Preservar APIs.
8. Alterar exclusivamente o solicitado.
9. Minimizar a quantidade de arquivos modificados.
10. Garantir retrocompatibilidade total.
