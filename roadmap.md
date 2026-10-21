# Implantação guiada

## Auditoria de estoque AMT Fight Wear
- [ ] Comparar estoque administrativo, variantes por tamanho e disponibilidade pública.
- [ ] Corrigir a causa da divergência sem inventar estoque por tamanho.
- [ ] Executar regressões e verificar novamente a seleção e inclusão no carrinho.

- [x] Assistente claro e não bloqueante, aberto para donos sem alunos e retomável — SetupWizardModal.tsx.
- [x] Dados do dojo, planos, turmas e cadastro simplificado/importação de alunos usando operações existentes — steps/StepIdentity, StepStructure, StepStudents, StepReady.
- [x] Progresso persistente e isolado do onboarding AMT Pay; nenhuma geração automática de dados de exemplo — dojo_setup_progress / setup.functions.ts.
- [x] Quatro testes de validação e verificação autenticada: fechar/retomar, salvar identidade, plano, turma, aluno e importar CSV; conclusão e leitura do resumo. Registros temporários removidos.