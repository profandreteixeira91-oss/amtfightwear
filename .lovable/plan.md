## Objetivo

Permitir que apenas administradores editem visualmente, sobre o próprio pré-visualizador, a posição e o tamanho dos elementos de customização (slots de patch/bordado/etiqueta e zonas de cor retangulares) — inclusive as variantes por modalidade (ex.: faixa Judô vs. Jiu-Jitsu). Os valores ficam salvos no banco e passam a alimentar tanto o editor do cliente quanto o preview.

## Escopo

Editar visualmente:
1. **Slots** (`custom_shop_patch_slots`): `x_pct`, `y_pct`, `w_pct` — arrastar para mover, alça de canto para redimensionar.
2. **Zonas** (`custom_shop_zones`): novas colunas `x_pct`, `y_pct`, `w_pct`, `h_pct` para tratar cada zona como um retângulo tintável (substitui os `ZONES` hardcoded do frontend). Formas atuais complexas (V da gola, mangas etc.) viram um ou mais retângulos.
3. **Variantes por modalidade** (faixa Judô/Jiu-Jitsu): nova tabela `custom_shop_variants` (kind, key, label, base_image_url) + colunas `variant_key` em `zones` e `slots` para permitir layouts distintos por variante compartilhando o mesmo template.

Fora do escopo: edição de formas poligonais livres (curvas SVG), múltiplos retângulos por zona na mesma UI de arraste (guardaremos apenas um retângulo por zona por variante), edição de patches/tecidos.

## Fluxo do usuário admin

1. Admin abre `/loja/custom-shop/faixa` (ou outro produto).
2. Se `has_role(uid, 'admin')` = true, aparece botão flutuante "Editar layout" no canto do pré-visualizador.
3. Ao ativar:
   - Overlay editor cobre o preview; cada slot vira um retângulo tracejado arrastável com alça de resize; cada zona vira um retângulo colorido semi-transparente também arrastável/redimensionável.
   - Seletor de variante no topo (para faixa: Jiu-Jitsu / Judô) — troca quais linhas do banco estão sendo editadas.
   - Painel lateral lista slots e zonas com valores numéricos (x/y/w/h em %) e permite editar por input também.
   - Botões: **Salvar**, **Cancelar**, **Restaurar padrão**.
4. Ao salvar, chama server function admin-only que faz upsert em `custom_shop_zones` e `custom_shop_patch_slots` para a variante ativa; queries do template são invalidadas e o cliente já vê as novas posições.

## Alterações técnicas

### Banco (migração)
- `ALTER TABLE custom_shop_zones` adicionar `variant_key text`, `x_pct numeric`, `y_pct numeric`, `w_pct numeric`, `h_pct numeric` (nullable inicialmente, depois preenchido com defaults compatíveis com o layout atual).
- `ALTER TABLE custom_shop_patch_slots` adicionar `variant_key text`.
- Nova tabela `custom_shop_variants(template_id, key, label, base_image_url)` com GRANT/RLS (leitura pública, escrita só admin).
- Seed: variantes `default` para todos os templates + `judo` para faixa; migrar zonas/slots atuais para `variant_key = 'default'`; inserir linhas específicas para `judo` (corpo, ponta e slot da ponta).
- RLS de escrita em `custom_shop_zones`, `custom_shop_patch_slots`, `custom_shop_variants`: `has_role(auth.uid(), 'admin')`.

### Server functions (`src/lib/customshop.functions.ts`)
- `getCustomTemplate` passa a aceitar `variantKey` opcional e retorna zonas/slots filtrados + lista de variantes + `base_image_url` da variante.
- Novas funções admin (`.middleware([requireSupabaseAuth])` + verificação `has_role`):
  - `updateCustomLayout({ template_id, variant_key, zones: [...], slots: [...] })` — upsert transacional.
  - `resetCustomLayout` — restaura defaults do seed.

### Frontend
- `loja.custom-shop.$kind.tsx`:
  - `BuilderPreview` renderiza zonas como retângulos `x/y/w/h` do banco (com `mix-blend-mode: multiply`) em vez do dicionário `ZONES` hardcoded — remove `JUDO_FAIXA_ZONES`/`remapJudoSlots`.
  - Novo hook `useIsAdmin` lê `user_roles` via server fn autenticada.
  - Novo componente `LayoutEditorOverlay` (renderizado só se admin + modo edição): retângulos SVG com handles, drag via `pointerdown`/`pointermove` convertendo pixels → % do container, painel lateral com inputs numéricos e "Salvar/Cancelar/Reset".
  - Seletor de variante (quando `variants.length > 1`) fica ativo tanto no editor admin quanto no fluxo do cliente (Modalidade da faixa já é isso — passa a ler `variants` do banco).

### Segurança
- Todas as mutations passam por server fn com `requireSupabaseAuth` + checagem `has_role('admin')`; RLS reforça no banco.
- Leitura pública das novas colunas mantida.

## Diagrama do overlay

```text
+---------------------------------------------------+
|  [Variante: Judô ▼]     [Salvar] [Cancelar] [↺]  |
|---------------------------------------------------|
|                                                   |
|   [imagem base]                                   |
|     ┌──── zona corpo ─────┐                       |
|     │                     │                       |
|     └─────────────────────┘◉ (handle resize)      |
|                     ┌─slot ponta─┐                |
|                     │            │◉               |
|                     └────────────┘                |
+---------------------------------------------------+
| Painel: lista de slots/zonas com x,y,w,h numéricos|
+---------------------------------------------------+
```

## Passos de implementação

1. Migração SQL (schema + seed + RLS admin).
2. Atualizar `getCustomTemplate` + criar `updateCustomLayout` / `resetCustomLayout` + `checkIsAdmin` server fn.
3. Refatorar `BuilderPreview` para ler zonas do banco (retângulos) e suportar `variantKey`.
4. Implementar `LayoutEditorOverlay` (drag/resize + painel + salvar).
5. Ligar seletor de variante da faixa (Modalidade) às variantes vindas do banco.
6. Testar como admin (drag, salvar, refresh) e como cliente (só visualiza).