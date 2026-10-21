export type StockVariant = {
  id?: string;
  size: string | null;
  color: string | null;
  stock: number;
  active?: boolean;
};

export function selectAvailableVariant<T extends StockVariant>(
  variants: readonly T[],
  selection: { size?: string | null; color?: string | null },
): T | undefined {
  const available = variants.filter(v => v.active !== false && v.stock > 0);
  const matches = available.filter(v =>
    (!selection.size || v.size === selection.size) &&
    (!selection.color || v.color === selection.color || v.color === null),
  );
  return matches.find(v => v.color === selection.color) ?? matches[0];
}

/** A changed general stock is a bulk edit; explicit individual edits win. */
export function stockAfterGeneralEdit(
  draft: StockVariant,
  original: StockVariant | undefined,
  generalStock: number,
  previousGeneralStock: number,
): number {
  if (generalStock === previousGeneralStock || !original || draft.stock !== original.stock) return draft.stock;
  return generalStock;
}