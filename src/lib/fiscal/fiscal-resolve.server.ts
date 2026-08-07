/**
 * Resolve dados fiscais dos itens diretamente do catálogo.
 *
 * Ordem de precedência (por item):
 *   1. Campos fiscais do próprio produto (products)
 *   2. Campos fiscais herdados da categoria (store_categories)
 *   3. Padrões nacionais de venda de mercadoria (CFOP 5102/6102, unidade UN)
 *
 * O NCM não tem padrão: é o único campo que realmente bloqueia a emissão
 * quando não existe nem no produto nem na categoria.
 */

export type ResolvedFiscalItem = {
  item: any;
  product_name: string;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  origem: string;
  unit_commercial: string;
  unit_taxable: string;
};

const clean = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
  return s.length > 0 ? s : null;
};

export async function resolveItemsFiscal(
  supabase: any,
  items: any[],
  opts: { interstate: boolean },
): Promise<{ resolved: ResolvedFiscalItem[]; missingNcm: string[] }> {
  const productIds = Array.from(
    new Set(items.map((i) => i?.product_id).filter((v): v is string => typeof v === "string" && v.length > 0)),
  );
  const skus = Array.from(
    new Set(items.map((i) => clean(i?.sku)).filter((v): v is string => !!v)),
  );

  const [byId, bySku] = await Promise.all([
    productIds.length
      ? supabase
          .from("products")
          .select("id, name, sku, category_id, ncm, cest, cfop, cfop_internal, cfop_interstate, origem, unidade, unit_commercial, unit_taxable")
          .in("id", productIds)
      : Promise.resolve({ data: [], error: null }),
    skus.length
      ? supabase
          .from("products")
          .select("id, name, sku, category_id, ncm, cest, cfop, cfop_internal, cfop_interstate, origem, unidade, unit_commercial, unit_taxable")
          .in("sku", skus)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (byId.error) throw new Error(`Falha ao ler dados fiscais do catálogo: ${byId.error.message}`);
  if (bySku.error) throw new Error(`Falha ao ler dados fiscais do catálogo: ${bySku.error.message}`);

  const products: any[] = [...((byId.data as any[]) || []), ...((bySku.data as any[]) || [])];
  const prodById = new Map<string, any>();
  const prodBySku = new Map<string, any>();
  for (const p of products) {
    prodById.set(p.id, p);
    const sku = clean(p.sku);
    if (sku && !prodBySku.has(sku)) prodBySku.set(sku, p);
  }

  const categoryIds = Array.from(
    new Set(products.map((p) => p.category_id).filter((v): v is string => !!v)),
  );
  let catMap = new Map<string, any>();
  if (categoryIds.length) {
    const catRes = await supabase
      .from("store_categories")
      .select("id, ncm, cest, cfop, origem, unidade")
      .in("id", categoryIds);
    if (catRes.error) throw new Error(`Falha ao ler dados fiscais da categoria: ${catRes.error.message}`);
    catMap = new Map(((catRes.data as any[]) || []).map((c: any) => [c.id, c]));
  }

  const resolved: ResolvedFiscalItem[] = [];
  const missingNcm: string[] = [];

  for (const item of items) {
    const sku = clean(item?.sku);
    const prod =
      (item?.product_id ? prodById.get(item.product_id) : undefined) ??
      (sku ? prodBySku.get(sku) : undefined);
    const cat = prod?.category_id ? catMap.get(prod.category_id) : undefined;

    const name = clean(item?.product_name) || clean(item?.name) || clean(prod?.name) || "sem nome";

    const ncm = clean(prod?.ncm) ?? clean(cat?.ncm);
    const cest = clean(prod?.cest) ?? clean(cat?.cest);
    const cfop =
      (opts.interstate
        ? clean(prod?.cfop_interstate) ?? clean(cat?.cfop) ?? "6102"
        : clean(prod?.cfop_internal) ?? clean(prod?.cfop) ?? clean(cat?.cfop) ?? "5102");
    const origem = clean(prod?.origem) ?? clean(cat?.origem) ?? "0";
    const unitCommercial = clean(prod?.unit_commercial) ?? clean(prod?.unidade) ?? clean(cat?.unidade) ?? "UN";
    const unitTaxable = clean(prod?.unit_taxable) ?? unitCommercial;

    if (!ncm) missingNcm.push(name);

    resolved.push({
      item,
      product_name: name,
      ncm,
      cest,
      cfop,
      origem,
      unit_commercial: unitCommercial,
      unit_taxable: unitTaxable,
    });
  }

  return { resolved, missingNcm };
}
