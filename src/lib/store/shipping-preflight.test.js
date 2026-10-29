import { describe, expect, it } from "vitest";
import { agencyRequired, assertAgency, recipientIssues } from "./shipping-preflight";

describe("pré-validação da contratação", () => {
  it("Total Express exige agência quando a regra agency_id está presente", () => {
    expect(agencyRequired({ rules: { options: { agency_id: { required: true } } } })).toBe(true);
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
});