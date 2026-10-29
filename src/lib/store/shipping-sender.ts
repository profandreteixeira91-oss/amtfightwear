import { z } from "zod";

const digits = (value: string): string => value.replace(/\D/g, "");

export function shippingDocument(value: string): { document: string } | { company_document: string } {
  const doc = digits(value);
  if (!/^\d{11}$|^\d{14}$/.test(doc) || /^(\d)\1+$/.test(doc)) throw new Error("Informe um CPF ou CNPJ válido para o envio.");
  const valid = doc.length === 11
    ? [9, 10].every((length) => {
        const sum = [...doc.slice(0, length)].reduce((s, d, i) => s + Number(d) * (length + 1 - i), 0);
        return Number(doc[length]) === ((sum * 10) % 11) % 10;
      })
    : [12, 13].every((length) => {
        const sum = [...doc.slice(0, length)].reduce((s, d, i) => s + Number(d) * ((length - 1 - i) % 8 + 2), 0);
        const remainder = sum % 11;
        return Number(doc[length]) === (remainder < 2 ? 0 : 11 - remainder);
      });
  if (!valid) throw new Error("CPF ou CNPJ inválido. Confira o documento antes de contratar o frete.");
  return doc.length === 11 ? { document: doc } : { company_document: doc };
}

export const SenderProfileSchema = z.object({
  name: z.string().nullish(), firstname: z.string().nullish(), lastname: z.string().nullish(),
  email: z.string().email(), phone: z.string().min(1), document: z.string().nullish(), company_document: z.string().nullish(),
});
export const SenderAddressSchema = z.object({
  id: z.number(), label: z.string().nullish(), postal_code: z.string(), address: z.string().min(1),
  number: z.string().min(1), complement: z.string().nullish(), district: z.string().min(1),
  city: z.object({ city: z.string().min(1), state: z.object({ state_abbr: z.string().length(2) }) }),
});
export const SenderAddressesSchema = z.union([
  z.array(SenderAddressSchema), z.object({ data: z.array(SenderAddressSchema) }).transform((v) => v.data),
]);

export function buildShippingSender(profile: unknown, addresses: unknown, originZip: string): Record<string, string> {
  const person = SenderProfileSchema.parse(profile);
  const address = SenderAddressesSchema.parse(addresses).find((a) => digits(a.postal_code) === digits(originZip));
  if (!address) throw new Error("O CEP de origem não corresponde ao cadastro do Melhor Envio. Selecione o endereço real em Administração → Envio.");
  const name = person.name || [person.firstname, person.lastname].filter(Boolean).join(" ");
  if (!name) throw new Error("O cadastro do remetente no Melhor Envio está sem nome.");
  return {
    name, phone: digits(person.phone), email: person.email,
    ...shippingDocument(person.company_document || person.document || ""),
    address: address.address, number: address.number, complement: address.complement || "",
    district: address.district, city: address.city.city, state_abbr: address.city.state.state_abbr,
    postal_code: digits(address.postal_code), country_id: "BR",
  };
}