import { describe, expect, test } from 'bun:test';
import { scaleProductPrice, setProductPrice } from './product-price.server.ts';

// Cliente falso: tabelas em memória com o subconjunto de filtros que o módulo usa.
function fakeDb(tables) {
  return {
    tables,
    from(name) {
      const rows = tables[name];
      const filters = [];
      let op = 'select';
      let patch = null;
      const q = {
        select() { return q; },
        update(p) { op = 'update'; patch = p; return q; },
        eq(col, v) { filters.push((r) => r[col] === v); return q; },
        in(col, vs) { filters.push((r) => vs.includes(r[col])); return q; },
        not(col) { filters.push((r) => r[col] !== null); return q; },
        maybeSingle() {
          const r = rows.filter((x) => filters.every((f) => f(x)));
          return Promise.resolve({ data: r[0] ? { ...r[0] } : null, error: null });
        },
        then(res) {
          const hit = rows.filter((x) => filters.every((f) => f(x)));
          if (op === 'update') hit.forEach((r) => Object.assign(r, patch));
          return Promise.resolve({ data: hit.map((x) => ({ ...x })), error: null }).then(res);
        },
      };
      return q;
    },
  };
}

const belt = () =>
  fakeDb({
    products: [{ id: 'p', price: 80 }],
    store_product_variants: [
      { id: 'a0', product_id: 'p', price: 80 },
      { id: 'a5', product_id: 'p', price: 95 },
      { id: 'm0', product_id: 'p', price: null },
      { id: 'x', product_id: 'other', price: 80 },
    ],
  });
const prices = (db) => Object.fromEntries(db.tables.store_product_variants.map((v) => [v.id, v.price]));

describe('preço do produto e das variações', () => {
  test('variações que acompanhavam o produto mudam; preço por tamanho fica', async () => {
    const db = belt();
    const r = await setProductPrice(db, 'p', 89.9);
    expect(db.tables.products[0].price).toBe(89.9);
    expect(prices(db)).toEqual({ a0: 89.9, a5: 95, m0: null, x: 80 });
    expect(r.ownPriced).toBe(1);
  });
  test('reajuste percentual leva junto os preços por tamanho', async () => {
    const db = belt();
    await scaleProductPrice(db, 'p', 1.1);
    expect(db.tables.products[0].price).toBe(88);
    expect(prices(db)).toEqual({ a0: 88, a5: 104.5, m0: null, x: 80 });
  });
});
