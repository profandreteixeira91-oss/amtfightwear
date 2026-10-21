import { expect, test } from 'bun:test';
import { buildShippingSender, shippingDocument } from './shipping-sender.ts';

const address = { postal_code: '01001-000', address: 'Rua de teste', number: '42', district: 'Centro', city: { city: 'São Paulo', state: { state_abbr: 'SP' } } };
const profile = { name: 'Remetente de teste', email: 'sender@example.com', document: '529.982.247-25', phone: { phone: '11999999999' }, address };
test('rejects the exact fabricated sender CPF causing the 422', () => {
  expect(() => shippingDocument('00000000000')).toThrow();
});
test('normalizes valid CPF and validates its check digits', () => {
  expect(shippingDocument(profile.document)).toEqual({ document: '52998224725' });
  expect(() => shippingDocument('52998224726')).toThrow();
});
test('CNPJ uses company_document rather than the CPF field', () => {
  expect(shippingDocument('11.222.333/0001-81')).toEqual({ company_document: '11222333000181' });
});
test('sender address and identity come from the connected account', () => {
  expect(buildShippingSender(profile, [], '01001000')).toMatchObject({ document: '52998224725', address: 'Rua de teste', number: '42', state_abbr: 'SP' });
});
test('refuses to combine an unrelated origin ZIP with the account address', () => {
  expect(() => buildShippingSender(profile, [], '57020000')).toThrow('CEP de origem');
});
test('selects registered origin address and never borrows recipient data', () => {
  const other = { ...address, postal_code: '57020000', number: '77' };
  expect(buildShippingSender(profile, [other], '57020000').number).toBe('77');
});