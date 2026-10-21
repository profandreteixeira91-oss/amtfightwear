import { z } from 'zod';

const digits = (value: string): string => value.replace(/\D/g, '');

export function shippingDocument(value: string): { document: string } | { company_document: string } {
  const number = digits(value);
  const length = number.length;
  if (![11, 14].includes(length) || /^(\d)\1+$/.test(number)) throw new Error('CPF/CNPJ do remetente ou destinatário inválido.');
  const check = (base: string, weights: number[]): number => {
    const sum = [...base].reduce((total, digit, index) => total + Number(digit) * (weights[index] ?? 0), 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const weights = length === 11 ? [10,9,8,7,6,5,4,3,2] : [5,4,3,2,9,8,7,6,5,4,3,2];
  const base = number.slice(0, -2);
  const first = check(base, weights);
  const secondWeights = length === 11 ? [11,...weights] : [6,...weights];
  const second = check(base + first, secondWeights);
  if (number !== base + first + second) throw new Error('CPF/CNPJ do remetente ou destinatário inválido.');
  return length === 11 ? { document: number } : { company_document: number };
}

const addressSchema = z.object({
  postal_code: z.string(), address: z.string().min(1), number: z.string().min(1),
  complement: z.string().nullish(), district: z.string().min(1),
  city: z.object({ city: z.string().min(1), state: z.object({ state_abbr: z.string().length(2) }) }),
});
const profileSchema = z.object({
  name: z.string().min(1), email: z.string().email(), document: z.string(),
  phone: z.object({ phone: z.string().min(1) }), address: addressSchema.nullish(),
});

export function buildShippingSender(profileInput: unknown, addressesInput: unknown[], originZip: string) {
  const profile = profileSchema.safeParse(profileInput);
  if (!profile.success) throw new Error('Complete os dados do remetente na conta conectada do Melhor Envio.');
  const identity = shippingDocument(profile.data.document);
  const addresses = [profile.data.address, ...addressesInput].flatMap(value => {
    const parsed = addressSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
  const address = addresses.find(value => digits(value.postal_code) === digits(originZip));
  if (!address) throw new Error('O CEP de origem em Administração → Envio não corresponde a um endereço cadastrado no Melhor Envio. Cadastre o endereço real de postagem no Melhor Envio ou ajuste o CEP de origem.');
  return {
    name: profile.data.name, email: profile.data.email, phone: digits(profile.data.phone.phone),
    ...identity, address: address.address, number: address.number,
    complement: address.complement ?? '', district: address.district,
    city: address.city.city, state_abbr: address.city.state.state_abbr,
    postal_code: digits(address.postal_code), country_id: 'BR',
  };
}