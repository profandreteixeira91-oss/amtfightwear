## Objetivo

Corrigir o editor de modelos de contrato para exibir claramente as variáveis disponíveis de **Responsável legal** na URL informada, sem alterar banco, cadastro ou geração dos contratos.

## Implementação

- Renomear a categoria compartilhada de variáveis de “Responsável” para “Responsável legal”.
- Fazer o menu superior **Inserir** consumir o mesmo catálogo central já usado pelo botão **Variáveis**, eliminando a lista paralela que omitiu essa categoria.
- Exibir nesse menu somente as variáveis realmente armazenadas hoje no cadastro do aluno: nome e telefone do responsável legal.
- Preservar as variáveis legadas de CPF, RG e parentesco no catálogo secundário para não quebrar modelos existentes, mas não apresentá-las como dados disponíveis enquanto não houver campos correspondentes no cadastro/banco.

## Validação

- Confirmar na tela do editor que “Responsável legal” aparece tanto no menu **Inserir** quanto no seletor **Variáveis**.
- Confirmar que nome e telefone podem ser inseridos no documento.
- Executar a verificação de tipos e conferir o diagnóstico da aplicação após a alteração.

## Impacto

Somente apresentação e fonte do catálogo no editor de contratos. Sem alteração de rotas, permissões, banco, contratos já salvos ou demais módulos.
