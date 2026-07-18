# Editor de Certificados — Evolução para WYSIWYG Profissional

## Estado atual

- `src/routes/dojo.app.certificates.tsx` (331 linhas): editor simples com HTML/CSS em textarea e variáveis via chips.
- `src/components/dojo/CertificatePreview.tsx` (251 linhas): renderiza HTML+CSS e substitui `{{variaveis}}`.
- Backend: `dojo_certificate_templates` (html_body, css, variables, is_default, category, name) e `dojo_certificates`.

Compatibilidade: o novo editor **manterá o campo `html_body`** como fonte de verdade renderizada — para cada template criado no modo visual, geramos HTML/CSS equivalente no salvamento. Templates antigos continuam abrindo no modo "HTML avançado".

## Escopo (por fase, entregas navegáveis)

Dada a complexidade (equivalente a mini-Canva), vou dividir em 3 fases. Cada fase é entregável e usável isoladamente. Só sigo para a próxima após validação sua.

### Fase 1 — Canvas WYSIWYG + Drag/Drop essencial (esta entrega)

Layout de 4 áreas (topbar, painel esquerdo, canvas A4, painel direito).

Elementos suportados nesta fase:
- Texto (com variáveis inline via `{{var}}`)
- Imagem (URL/upload para bucket existente)
- Logo / Assinatura (atalhos de imagem)
- Linha, Retângulo, Círculo
- QR Code (código de validação do certificado)
- Data (elemento tipado)

Interações:
- Arrastar da paleta para o canvas
- Selecionar, mover, redimensionar, rotacionar
- Snap à grade + guias inteligentes de alinhamento com outros elementos
- Réguas horizontal/vertical
- Zoom 25/50/75/100/125/150/200%
- Undo/Redo (histórico em memória)
- Duplicar / Excluir / Bloquear / Ocultar
- Painel de camadas (mover ordem, renomear, lock, hide)
- Painel de propriedades por tipo (fonte, tamanho, cor, negrito, itálico, sublinhado, alinhamento, opacidade, rotação, posição, tamanho, camada)
- Painel de variáveis categorizado (Academia, Aluno, Professor, Graduação, Certificado, Sistema) com busca e inserção por clique/duplo-clique
- Salvamento automático (debounce 2s) no `html_body` + JSON estruturado em `variables.editor_schema`
- Preview com dados reais de um aluno selecionado
- Exportar PDF (via `window.print` com CSS @page A4) e PNG (html-to-image)

Persistência:
- Reutilizo `dojo_certificate_templates`.
- `html_body`: HTML/CSS gerado para retrocompatibilidade com `CertificatePreview`.
- `variables` (jsonb): estende com `{ editor_schema: {...}, favorites: [...], recent: [...] }` — não quebra o schema atual.

### Fase 2 — Recursos avançados

- Múltiplas assinaturas com bloco composto (imagem + nome + cargo + linha)
- Selos e marca d'água
- Alinhamento múltiplo (esquerda/centro/direita/topo/base) e distribuição
- Seleção múltipla + agrupamento
- Atalhos de teclado (Ctrl+D, Ctrl+Z, Ctrl+Shift+Z, Del, setas, Ctrl+G)
- Menus contextuais (botão direito)
- Biblioteca de modelos com categorias e "definir padrão"
- Duplicar template
- Exportação JPEG

### Fase 3 — Colaboração e histórico

- Tabela `dojo_certificate_template_versions` com autor, timestamp, comentário e snapshot
- Restaurar versão anterior
- Tabela (estrutura) — componente novo

## Arquivos previstos (Fase 1)

- `src/routes/dojo.app.certificates.tsx` — troca listagem+editor pelo novo shell
- `src/components/dojo/certificate-editor/` (novo):
  - `CertificateEditor.tsx` — orquestrador
  - `Topbar.tsx`, `LeftPalette.tsx`, `Canvas.tsx`, `RightInspector.tsx`, `LayersPanel.tsx`, `VariablesPanel.tsx`
  - `elements/` — renderers por tipo (`TextEl`, `ImageEl`, `ShapeEl`, `QrEl`, `DateEl`)
  - `state.ts` — store com Zustand (já disponível no projeto) para elementos, seleção, histórico
  - `serialize.ts` — schema JSON ↔ HTML/CSS
- `src/lib/dojo/certificates.functions.ts` — pequenas adições se necessário (upload proxy para bucket, geração de PDF server-side é opcional)

Dependências novas:
- `qrcode` (client, tiny) para QR
- `html-to-image` para exportar PNG
- Zustand já presente? Verifico; caso contrário, uso `useReducer` sem adicionar dependência.

## Nota técnica

Editor com canvas HTML absoluto posicionado (não Fabric/Konva) — mais fácil manter, renderização por div/span com `transform: translate + rotate`, e serialização direta para HTML final estático. Isso garante que o `CertificatePreview` existente continue renderizando sem mudanças.

## Fora do escopo (agora)

- Tabela dinâmica com dados de banco
- Colaboração em tempo real
- Templates da comunidade / marketplace

## Confirmação

Confirma que sigo com a **Fase 1** como descrita? Ou prefere ajustar prioridades (ex.: incluir múltiplas assinaturas / seleção múltipla já na fase 1)?
