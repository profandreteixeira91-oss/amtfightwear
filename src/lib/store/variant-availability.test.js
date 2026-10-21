import { describe, expect, test } from 'bun:test';
import { selectAvailableVariant, stockAfterGeneralEdit } from './variant-availability.ts';

describe('stocked sizes and sparse colors', () => {
  const variants = [
    { id: 'm0', size: 'M0 - 200cm', color: 'BRANCO', stock: 20 },
    { id: 'm2', size: 'M2 - 225cm', color: null, stock: 20 },
    { id: 'a1', size: 'A1 - 270cm', color: 'PRETO', stock: 20 },
    { id: 'empty', size: 'A5', color: null, stock: 0 },
  ];
  test('a size without a color remains selectable with BRANCO selected', () => {
    expect(selectAvailableVariant(variants, { size: 'M2 - 225cm', color: 'BRANCO' })?.id).toBe('m2');
  });
  test('a stocked size can select its real color instead of being locked', () => {
    expect(selectAvailableVariant(variants, { size: 'A1 - 270cm' })?.color).toBe('PRETO');
  });
  test('zero and inactive stock do not become available from general stock', () => {
    expect(selectAvailableVariant(variants, { size: 'A5' })).toBeUndefined();
    expect(selectAvailableVariant([{ size: 'A2', color: null, stock: 20, active: false }], {})).toBeUndefined();
  });
  test('general stock edit is not overwritten by unchanged variant drafts', () => {
    expect(stockAfterGeneralEdit(variants[0], variants[0], 30, 20)).toBe(30);
  });
  test('explicit size stock remains authoritative', () => {
    expect(stockAfterGeneralEdit({ ...variants[0], stock: 5 }, variants[0], 30, 20)).toBe(5);
    expect(stockAfterGeneralEdit(variants[0], variants[0], 20, 20)).toBe(20);
  });
});