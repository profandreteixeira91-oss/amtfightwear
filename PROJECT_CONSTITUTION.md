# PROJECT CONSTITUTION

Versão: 1.0

Status: OBRIGATÓRIO

Autoridade: Máxima

---

# PREÂMBULO

Este documento estabelece as normas permanentes para desenvolvimento do projeto.

Toda IA, desenvolvedor, colaborador ou ferramenta automatizada deverá obedecer integralmente estas regras.

O descumprimento de qualquer artigo torna a implementação inválida.

---

# TÍTULO I

## DOS PRINCÍPIOS FUNDAMENTAIS

Art. 1º

O funcionamento do sistema possui prioridade absoluta sobre qualquer melhoria estética.

---

Art. 2º

Nenhuma implementação poderá reduzir funcionalidades existentes.

---

Art. 3º

Toda alteração deverá preservar retrocompatibilidade.

---

Art. 4º

Toda implementação deverá minimizar alterações.

---

Art. 5º

É proibido alterar arquivos fora do escopo solicitado.

---

# TÍTULO II

## DOS ARQUIVOS PROTEGIDOS

São considerados patrimônio permanente do projeto.

App.tsx

main.tsx

Router

Providers

Contexts

Theme

Sidebar

Header

Navigation

Dashboard Base

DataTable Base

Toast

Modal Base

Dialog Base

Authentication

Authorization

Todos estes arquivos possuem proteção máxima.

---

Art. 6º

Arquivos protegidos somente poderão ser alterados quando o pedido mencionar explicitamente o componente.

Exemplo válido:

"Refatore a Sidebar."

Exemplo inválido:

"Corrija o Financeiro."

Neste caso a Sidebar não poderá ser alterada.

---

# TÍTULO III

## DOS COMPONENTES

Art. 7º

Nenhum componente reutilizável poderá ser modificado sem análise de impacto.

---

Art. 8º

Antes de alterar um componente deverá ser identificado:

todos os consumidores

todas as rotas

todos os módulos

todas as dependências

---

Art. 9º

Caso um componente seja utilizado por múltiplos módulos, a implementação deverá priorizar extensão em vez de modificação.

---

# TÍTULO IV

## DAS ROTAS

É proibido:

alterar URL

alterar guards

alterar loaders

alterar menus

alterar breadcrumbs

alterar permissões

sem autorização explícita.

---

# TÍTULO V

## DO BANCO

É proibido:

remover tabelas

remover colunas

editar migrations antigas

alterar RLS

alterar triggers

alterar funções SQL

sem análise completa.

---

# TÍTULO VI

## DAS IMPLEMENTAÇÕES

Toda implementação seguirá obrigatoriamente:

Ler documentação

↓

Localizar arquivos

↓

Mapear dependências

↓

Analisar impacto

↓

Planejar

↓

Implementar

↓

Executar testes

↓

Documentar alterações

---

# TÍTULO VII

## DA ANÁLISE DE IMPACTO

Toda implementação deverá responder:

Quais arquivos serão alterados?

Quais módulos serão afetados?

Quais componentes serão afetados?

Quais hooks?

Quais services?

Quais tabelas?

Quais APIs?

Quais integrações?

Quais riscos existem?

Caso alguma resposta seja desconhecida, a implementação deverá ser interrompida.

---

# TÍTULO VIII

## DAS PROIBIÇÕES

É proibido:

alterar Layout Global

alterar Sidebar

alterar Header

alterar Providers

alterar Router

alterar Banco

alterar APIs

alterar Componentes Compartilhados

para resolver problemas locais.

---

# TÍTULO IX

## DO DESIGN SYSTEM

É proibido:

criar novos padrões visuais

criar novos botões

criar novas cores

criar novos espaçamentos

criar novos inputs

sem atualização oficial do Design System.

---

# TÍTULO X

## DA RESPONSABILIDADE

Toda implementação deverá apresentar:

Arquivos modificados

Arquivos protegidos preservados

Dependências verificadas

Testes realizados

Riscos identificados
