# Implantação guiada

## Erro de documento no Melhor Envio
- [x] Identificar origem: CPF fictício e endereço inventado em adminMelhorEnvioAddToCart.
- [x] Usar identidade/endereço da conta Melhor Envio e validar CPF/CNPJ no remetente e destinatário — shipping-sender.ts / shipping.functions.ts.
- [x] Reauditar cadastro conectado e payload: documento válido; 11 testes passaram; sem compra de etiqueta ou criação de pedido.
- [ ] Validar inclusão real de envio: CEP de origem 57020000 não corresponde a endereço cadastrado no Melhor Envio; usuário precisa cadastrar o endereço de postagem ou ajustar o CEP. Publicação também pendente.

## Auditoria de estoque AMT Fight Wear
- [x] Comparar estoque administrativo, variantes e disponibilidade pública: 310 produtos ativos e 3.476 variantes com estoque; bloqueio causado por combinações esparsas de tamanho/cor.
- [x] Corrigir seleção e preservar edição de estoque geral contra sobrescrita por variantes antigas; sem alteração de dados ou permissões.
- [x] Cinco testes passaram; quatro tamanhos reais conferidos no carrinho e seleção móvel validada; build OK. Salvamento administrativo coberto por teste da regra, não por gravação autenticada no navegador.

- [x] Assistente claro e não bloqueante, aberto para donos sem alunos e retomável — SetupWizardModal.tsx.
- [x] Dados do dojo, planos, turmas e cadastro simplificado/importação de alunos usando operações existentes — steps/StepIdentity, StepStructure, StepStudents, StepReady.
- [x] Progresso persistente e isolado do onboarding AMT Pay; nenhuma geração automática de dados de exemplo — dojo_setup_progress / setup.functions.ts.
- [x] Quatro testes de validação e verificação autenticada: fechar/retomar, salvar identidade, plano, turma, aluno e importar CSV; conclusão e leitura do resumo. Registros temporários removidos.