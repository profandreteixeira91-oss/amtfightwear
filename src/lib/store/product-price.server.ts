/**
 * Preço do produto × preço das variações.
 *
 * A loja cobra `variante.price ?? produto.price`. Uma variação "acompanha" o produto quando
 * não tem preço (herda) ou quando o preço dela é igual ao preço do produto; com preço
 * diferente (ex.: faixa A5 mais cara que a A0) ela tem preço próprio.
 *
 * Ao trocar o preço do produto, as variações que acompanhavam passam ao novo preço e as de
 * preço próprio ficam como estão. Antes todas eram sobrescritas, apagando preços por tamanho.
 */

// Cliente Supabase (com RLS do admin ou service role); tipado frouxo para servir aos dois.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

const round2 = (v: number) => Math.round(v * 100) / 100;
export const samePrice = (a: number, b: number) => Math.abs(a - b) < 0.005;

/** Atualiza as variações que acompanhavam `oldPrice`. Devolve quantas têm preço próprio. */
export async function syncFollowingVariantPrices(
  sb: Db,
  productId: string,
  oldPrice: number,
  newPrice: number,
): Promise<{ updated: number; ownPriced: number }> {
  const { data: vars, error } = await sb
    .from("store_product_variants")
    .select("id, price")
    .eq("product_id", productId);
  if (error) throw new Error(error.message);
  const rows = (vars ?? []) as { id: string; price: number | null }[];
  const following = rows
    .filter((v) => v.price !== null && samePrice(Number(v.price), oldPrice))
    .map((v) => v.id);
  const ownPriced = rows.filter(
    (v) => v.price !== null && !samePrice(Number(v.price), oldPrice),
  ).length;
  if (following.length > 0 && !samePrice(oldPrice, newPrice)) {
    const { error: upErr } = await sb
      .from("store_product_variants")
      .update({ price: round2(newPrice) })
      .in("id", following);
    if (upErr) throw new Error(upErr.message);
  }
  return { updated: following.length, ownPriced };
}

/** Troca o preço do produto e das variações que o acompanhavam. */
export async function setProductPrice(sb: Db, productId: string, newPrice: number) {
  const { data: prod, error } = await sb
    .from("products")
    .select("price")
    .eq("id", productId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!prod) throw new Error("Produto não encontrado");
  const price = round2(newPrice);
  const { error: upErr } = await sb.from("products").update({ price }).eq("id", productId);
  if (upErr) throw new Error(upErr.message);
  const sync = await syncFollowingVariantPrices(sb, productId, Number(prod.price), price);
  return { price, ownPriced: sync.ownPriced };
}

/** Reajuste percentual: aplica o fator ao produto e a todas as variações com preço. */
export async function scaleProductPrice(sb: Db, productId: string, factor: number) {
  const { data: prod, error } = await sb
    .from("products")
    .select("price")
    .eq("id", productId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!prod) throw new Error("Produto não encontrado");
  const price = round2(Number(prod.price) * factor);
  const { error: upErr } = await sb.from("products").update({ price }).eq("id", productId);
  if (upErr) throw new Error(upErr.message);

  const { data: vars, error: vErr } = await sb
    .from("store_product_variants")
    .select("id, price")
    .eq("product_id", productId)
    .not("price", "is", null);
  if (vErr) throw new Error(vErr.message);
  for (const v of (vars ?? []) as { id: string; price: number }[]) {
    const { error: e } = await sb
      .from("store_product_variants")
      .update({ price: round2(Number(v.price) * factor) })
      .eq("id", v.id);
    if (e) throw new Error(e.message);
  }
  return { price };
}
