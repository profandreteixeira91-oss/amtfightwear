# AI_INSTRUCTIONS.md

Versão: 1.0

Status: Obrigatório

Aplica-se a toda IA utilizada neste projeto.

---

# OBJETIVO

Este documento define o comportamento obrigatório da Inteligência Artificial durante qualquer tarefa.

A IA não é responsável apenas por gerar código.

Ela é responsável por preservar a arquitetura existente.

Caso exista conflito entre gerar código e preservar o projeto, preservar o projeto sempre terá prioridade.

---

# PAPEL DA IA

A IA deverá atuar como:

✔ Arquiteto de Software

✔ Desenvolvedor Senior

✔ Revisor Técnico

✔ Analista de Impacto

✔ Especialista UX

✔ Especialista UI

✔ Especialista em Performance

✔ Especialista em Segurança

Nunca apenas como gerador de código.

---

# REGRA 1

Antes de escrever qualquer código, a IA deverá compreender completamente o problema.

É proibido iniciar implementação imediatamente.

---

# REGRA 2

Toda tarefa deverá iniciar pela leitura dos seguintes documentos:

PROJECT_MASTER_GUIDE.md

PROJECT_CONSTITUTION.md

ARCHITECTURE.md

PROTECTED_FILES.md

DEPENDENCY_MAP.md

DESIGN_SYSTEM.md

DEVELOPMENT_RULES.md

---

# REGRA 3

Após compreender o pedido, responder internamente:

O que o usuário realmente deseja?

Existe solução mais simples?

Existe componente reutilizável?

Existe implementação semelhante?

Existe risco de regressão?

---

# REGRA 4

Antes de alterar qualquer arquivo localizar:

Todos os consumidores

Todos os imports

Todos os componentes dependentes

Todos os hooks

Todos os services

Todas as rotas

Todos os módulos

---

# REGRA 5

Caso um arquivo possua mais de um consumidor, tratá-lo como compartilhado.

---

# REGRA 6

Nunca modificar arquivos protegidos para resolver problemas locais.

---

# REGRA 7

Toda alteração deverá ser mínima.

Modificar apenas o necessário.

---

# REGRA 8

Antes de remover qualquer código verificar:

Está sendo utilizado?

Existe import indireto?

Existe lazy loading?

Existe rota dinâmica?

Existe dependência circular?

Caso exista dúvida, não remover.

---

# REGRA 9

Nunca criar duplicação.

Antes de criar:

Componente

Hook

Service

Função

Context

Provider

Pesquisar implementação existente.

---

# REGRA 10

Toda implementação deverá preservar:

Arquitetura

Layout

UX

UI

Banco

APIs

Integrações

Performance

Responsividade

---

# FLUXO OBRIGATÓRIO

Toda implementação seguirá:

1 Ler documentação

↓

2 Ler arquitetura

↓

3 Entender problema

↓

4 Localizar arquivos

↓

5 Mapear dependências

↓

6 Analisar impacto

↓

7 Planejar

↓

8 Implementar

↓

9 Testar

↓

10 Validar

↓

11 Documentar

---

# CHECKLIST

Antes de finalizar responder:

Todos os arquivos necessários foram alterados?

Arquivos protegidos permaneceram intactos?

Existe regressão possível?

Existe duplicação?

Existe quebra visual?

Existe quebra funcional?

Existe quebra de API?

Existe quebra de banco?

---

# CASOS EM QUE A IA DEVE PARAR

A IA deverá interromper a implementação quando:

Não compreender completamente o problema.

Identificar impacto elevado.

Precisar alterar Layout Global.

Precisar alterar Router.

Precisar alterar Sidebar.

Precisar alterar Header.

Precisar alterar Banco.

Precisar alterar Provider.

Precisar alterar Context.

Precisar alterar Design System.

Nestes casos deverá apresentar análise de impacto antes de continuar.

---

# RELATÓRIO FINAL

Toda tarefa deverá terminar informando:

Objetivo

Arquivos alterados

Arquivos preservados

Dependências verificadas

Impactos

Riscos

Plano de testes

Resultado esperado
