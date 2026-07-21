## Escopo

Refatorar completamente o módulo **Gerador de Certificados** (`/dojo/app/certificates`) em um editor visual profissional inspirado no Canva, focado em certificados de artes marciais. Nenhum outro módulo será tocado.

Dado o tamanho da especificação (mais de 200 itens funcionais), proponho entregar em **3 fases sequenciais**, cada uma auto-contida e utilizável. Você aprova a Fase 1 e vamos avançando.

## Arquitetura geral

- **Canvas SVG/HTML customizado** (sem depender de bibliotecas pesadas como Fabric.js/Konva no bundle inicial) — mais leve, aderente ao design do Dojo Manager e responsivo.
- **Estado central em Zustand** com histórico (undo/redo) e autosave debounced.
- **Modelo de dados** `TemplateDoc` versionado em JSON, salvo em `dojo_certificate_templates.fields`.
- **Renderização unificada** entre editor, preview público (`/certificate/$hash`) e PDF, usando o mesmo componente de camadas.

### Schema (migration única na Fase 1)

Expandir tabelas existentes sem quebrar dados:
- `dojo_certificate_templates`: adicionar `document jsonb` (novo doc), `page_size text`, `orientation text`, `tags text[]`, `favorite bool`, `preview_url text`, `version int`.
- Nova tabela `dojo_certificate_template_versions` para histórico.
- Nova tabela `dojo_certificate_assets` para logos/assinaturas/selos reutilizáveis.
- `dojo_certificates`: adicionar `validation_code text unique`, `hash_signature text`, `serial_number text`, `pdf_url` já existe.

## Fase 1 — Editor visual profissional (núcleo)

Entregável: um editor funcional que substitui o atual, com fluxo salvar/exportar completo.

**Rotas:**
- `/dojo/app/certificates` — dashboard com abas: **Modelos**, **Emitidos**, **Lote**.
- `/dojo/app/certificates/editor/$id` — editor em tela cheia.
- `/dojo/app/certificates/editor/new` — criação a partir de template ou em branco.

**Editor (`CertificateStudio`):**
- Layout 3 colunas: sidebar esquerda (biblioteca), canvas central, painel direito (propriedades).
- Topbar: Novo, Salvar, Salvar como modelo, Duplicar, Desfazer, Refazer, Zoom (25/50/75/100/150/200%), Visualizar, Exportar PDF, Exportar PNG, Imprimir, Histórico.
- Canvas: réguas, grid opcional, snap a guias, margens visíveis, drag & drop, seleção múltipla, resize handles, rotação, alinhamento inteligente entre elementos (linhas magenta ao arrastar).
- Painel de camadas com renomear, ocultar, bloquear, reordenar, agrupar.
- Autosave debounced (2s) + indicador "Salvo às HH:mm".
- Undo/redo com limite de 100 estados.

**Elementos suportados (Fase 1):**
- **Texto** (com editor rich: fonte, tamanho, peso, itálico, sublinhado, cor, alinhamento, espaçamento, altura de linha, sombra, contorno, rotação, opacidade, caixa alta/baixa).
- **Variáveis** (chip inserido no texto: `{{nome_aluno}}`, `{{faixa_atual}}`, `{{nova_faixa}}`, `{{academia}}`, `{{data_emissao}}`, `{{numero_certificado}}`, `{{codigo_validacao}}`, +30 outras da lista).
- **Imagem** (upload para bucket `dojo-certificates`, crop básico, opacidade, brilho/contraste via CSS filter).
- **Logo da academia** (auto-vinculado ao `dojo_academy_profile.logo_url`).
- **Assinatura** (upload PNG ou galeria salva em `dojo_certificate_assets`).
- **QR Code** (gerado via `qrcode` package, aponta para `/certificate/$hash` ou URL custom).
- **Formas** (retângulo, círculo, elipse, linha, seta) com fill/stroke/border-radius.
- **Fundo da página** (cor, imagem, marca d'água).

**Página:**
- A4 retrato/paisagem, Carta, Ofício, Personalizado. Margens e sangria configuráveis.

**Tipografia:**
- Fontes web pré-carregadas: Inter, Playfair Display, Cormorant, Cinzel, Great Vibes, Montserrat, Bebas Neue, Merriweather, Poppins, Roboto, DM Serif, Libre Baskerville (12 fontes profissionais para certificados). Busca e favoritos.

**Exportação:**
- **PDF**: renderiza doc em SVG → `svg2pdf.js` ou HTML → `html2canvas + jsPDF` em alta resolução (300 DPI).
- **PNG/JPEG**: `html-to-image`.
- **Imprimir**: usa `openBrandedPrintDocument` (já existe no projeto) com o SVG renderizado.

**Modelos iniciais (seed via migration):**
- 6 templates prontos: Graduação Faixa, Graduação Grau, Participação Evento, Curso, Seminário, Reconhecimento — em duas variações visuais cada (clássico e moderno).

## Fase 2 — Geração, validação e lote

Entregável: emissão real de certificados com validação pública robusta.

- **Substituição de variáveis** ao emitir: contexto do aluno + academia + graduação, com fallbacks.
- **Numeração automática** (`serial_number` sequencial por owner) e `validation_code` (nanoid 12 chars).
- **Hash de integridade** (SHA-256 dos valores + template).
- **Página pública `/certificate/$hash`**: reformulada com preview renderizado idêntico ao editor + selo "Autêntico" + dados de validação.
- **Geração em lote**: modal para selecionar turma, faixa, graduação ou lista de alunos → gera N certificados em paralelo, com progress bar, salva em `dojo_certificates`, oferece download em ZIP.
- **Histórico de versões** do template (autosave grava snapshot a cada N alterações).

## Fase 3 — Recursos avançados

Entregável: paridade com editores profissionais.

- Máscaras e recortes de imagem, filtros avançados.
- Biblioteca de ícones (Lucide como catálogo pesquisável).
- Biblioteca de elementos gráficos (molduras, divisores, ornamentos SVG).
- Combinações de fontes sugeridas.
- Compartilhar template com outros dojos (marketplace interno opcional).
- Estrutura para "Remover fundo" de imagens (endpoint stub aguardando integração futura).
- Modo apresentação (F11, tela cheia).
- Atalhos de teclado completos (Ctrl+Z, Ctrl+D duplicar, Ctrl+G agrupar, Del, setas, etc.).

## Detalhes técnicos

```text
src/routes/
  dojo.app.certificates.tsx                (dashboard - refatorado)
  dojo.app.certificates.editor.$id.tsx     (editor full-screen)
  certificate.$hash.tsx                    (público - refatorado na Fase 2)

src/components/dojo/certificates/
  studio/
    CertificateStudio.tsx        (root do editor)
    Canvas.tsx                   (área de edição + réguas + grid)
    LayerRenderer.tsx            (renderiza cada tipo de elemento)
    Topbar.tsx
    LeftSidebar.tsx              (biblioteca de elementos)
    RightPanel.tsx               (propriedades do selecionado)
    LayersPanel.tsx
    PageSetup.tsx
    VariableChip.tsx
    QRCodeElement.tsx
    ...
  useStudioStore.ts              (Zustand: doc, selection, history, zoom)
  serializer.ts                  (doc <-> DB JSON)
  variables.ts                   (catálogo de {{variáveis}} + resolver)
  exporter.ts                    (PDF/PNG/JPEG)
  renderer.tsx                   (SSR-safe, usado no preview público)

src/lib/dojo/certificates/
  templates.functions.ts         (CRUD templates + versões)
  issue.functions.ts             (emissão individual + lote + validação)
  assets.functions.ts            (logos/assinaturas reutilizáveis)
```

Bibliotecas a adicionar: `zustand`, `qrcode`, `html-to-image`, `jspdf`, `nanoid` (verificar já instaladas antes).

## Migração de dados

- Templates existentes (`fields` no formato antigo) recebem migração one-shot para o novo `document` mantendo compatibilidade — o editor detecta versão e converte on-the-fly na primeira abertura.
- Certificados já emitidos continuam válidos; recebem `validation_code` gerado se estiver nulo.

## O que fica de fora (fase futura, se pedir)

- Colaboração em tempo real multi-usuário.
- Marketplace público de templates entre academias diferentes.
- IA generativa de layouts (usuário já vetou IA no módulo Avaliações; confirmar se quer aqui).

## Próximo passo

Aprove esta fase 1 e eu já começo pela migration + `CertificateStudio` funcional (Topbar, Canvas, Textos, Variáveis, Imagens, Logo, QR Code, Formas, Exportação PDF/PNG, Salvar). Fases 2 e 3 seguem em turnos subsequentes.
