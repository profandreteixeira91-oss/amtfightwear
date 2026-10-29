import { describe, expect, it } from "vitest";
import { agencyRequired, assertAgency, recipientIssues, packageIssues, normalizeRecipient } from "./shipping-preflight";

describe("pré-validação da contratação", () => {
  it("Total Express exige agência quando a regra agency_id está presente", () => {
    expect(agencyRequired({ requirements: { rules: { "options.agency_id": ["required"] } } })).toBe(true);
    expect(() => assertAgency(true, undefined, [{ id: 10 }])).toThrow();
    expect(() => assertAgency(true, 11, [{ id: 10 }])).toThrow();
    expect(() => assertAgency(true, 10, [{ id: 10 }])).not.toThrow();
  });
  it("serviço sem agência não exige seleção", () => {
    expect(agencyRequired({ rules: { options: { receipt: {} } } })).toBe(false);
    expect(() => assertAgency(false, undefined, [])).not.toThrow();
  });
  it("aponta todos os dados obrigatórios faltantes antes de contratar", () => {
    expect(recipientIssues({})).toEqual(["Nome", "E-mail", "Telefone", "CPF/CNPJ", "Rua", "Número", "Bairro", "Cidade", "CEP", "UF"]);
    expect(recipientIssues({ name: "Cliente", email: "cliente@example.com", phone: "11999999999", document: "52998224725", address: "Rua", number: "10", district: "Centro", city: "Santos", postal_code: "11035190", state_abbr: "SP" })).toEqual([]);
  });
  it("bloqueia volume e valor declarado fora dos limites reais do serviço", () => {
    const service = { restrictions: { insurance_value: { min: 1, max: 15000, max_dec: 1000 }, formats: { box: { weight: { min: 0.001, max: 30 }, width: { min: 1, max: 80 }, height: { min: 1, max: 120 }, length: { min: 1, max: 60 }, sum: 260 } } } };
    expect(packageIssues(service, [{ weight: 1, width: 20, height: 5, length: 30 }], 64.9)).toEqual([]);
    expect(packageIssues(service, [{ weight: 31, width: 20, height: 5, length: 30 }], 1001)).toHaveLength(2);
  });
  it("preserva aliases de endereço legado ao preencher a revisão", () => {
    expect(normalizeRecipient({ customer_name: "Cliente", customer_email: "cliente@example.com", customer_phone: null, customer_document: null, shipping_address: { logradouro: "Rua", numero: "10", bairro: "Centro", cidade: "Santos", zipcode: "11035-190", uf: "sp" } })).toMatchObject({ address: "Rua", number: "10", district: "Centro", city: "Santos", postal_code: "11035190", state_abbr: "SP" });
  });
});