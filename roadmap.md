# Implantação guiada

## Melhor Envio no admin
- [ ] Completar seleção de agência e validação prévia dos dados de envio nos dois acessos administrativos.
- [ ] Verificar exigências das transportadoras, testes e fluxo autenticado sem comprar frete.
- [x] Auditar remetente, contratação, pagamento e impressão de etiquetas; cadastro e saldo consultados na conta real.
- [x] Corrigir fluxo, validações e confirmação de pagamento com bloqueio durável contra duplicidade.
- [x] Quatro testes de frete, cinco de estoque; admin autenticado, endereços reais, saldo, cotação e bloqueio de origem conferidos.
- [ ] Compra e impressão reais aguardam escolha do remetente correto e saldo na carteira; não foram realizadas compras.

## Bloqueios de alunos trancados
- [x] Restringir check-in a alunos ativos no banco; tentativa real de aluno trancado recusada, histórico preservado.
- [x] Bloquear acesso ao app no banco, middleware e guard, com revalidação de sessões existentes.
- [x] Seis testes e identidade de aluno trancado recusada no banco; verificação visual autenticada interrompida no pedido anterior.

## Auditoria de estoque AMT Fight Wear
- [x] Comparar estoque administrativo, variantes e disponibilidade pública: 310 produtos ativos e 3.476 variantes com estoque; bloqueio causado por combinações esparsas de tamanho/cor.
- [x] Corrigir seleção e preservar edição de estoque geral contra sobrescrita por variantes antigas; sem alteração de dados ou permissões.
- [x] Cinco testes passaram; quatro tamanhos reais conferidos no carrinho e seleção móvel validada; build OK. Salvamento administrativo coberto por teste da regra, não por gravação autenticada no navegador.

- [x] Assistente claro e não bloqueante, aberto para donos sem alunos e retomável — SetupWizardModal.tsx.
- [x] Dados do dojo, planos, turmas e cadastro simplificado/importação de alunos usando operações existentes — steps/StepIdentity, StepStructure, StepStudents, StepReady.
- [x] Progresso persistente e isolado do onboarding AMT Pay; nenhuma geração automática de dados de exemplo — dojo_setup_progress / setup.functions.ts.
- [x] Quatro testes de validação e verificação autenticada: fechar/retomar, salvar identidade, plano, turma, aluno e importar CSV; conclusão e leitura do resumo. Registros temporários removidos.