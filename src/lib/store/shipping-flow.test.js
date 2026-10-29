import { describe, expect, it } from "vitest";
import { assertCheckoutPaid, isShippingPaid, labelUrl } from "./shipping-flow";
import { buildShippingSender, shippingDocument } from "./shipping-sender";

describe("Melhor Envio", () => {
  it("recusa CPF fictício e distingue CNPJ", () => {
    expect(() => shippingDocument("00000000000")).toThrow();
    expect(shippingDocument("529.982.247-25")).toEqual({ document: "52998224725" });
    expect(shippingDocument("11.222.333/0001-81")).toEqual({ company_document: "11222333000181" });
  });
  it("remetente precisa corresponder ao CEP real, sem endereço inventado", () => {
    const profile = { name: "Remetente", email: "teste@example.com", phone: "11999999999", document: "52998224725" };
    const addresses = { data: [{ id: 1, postal_code: "11035190", address: "Rua real", number: "20", district: "Centro", city: { city: "Santos", state: { state_abbr: "SP" } } }] };
    expect(() => buildShippingSender(profile, addresses, "57020000")).toThrow();
    expect(buildShippingSender(profile, addresses, "11035190").address).toBe("Rua real");
  });
  it("pagamento só é confirmado para todos os envios retornados como pagos", () => {
    expect(() => assertCheckoutPaid([{ id: "a", status: "pending" }], ["a"])).toThrow();
    expect(() => assertCheckoutPaid([{ id: "a", status: "paid" }], ["a", "b"])).toThrow();
    expect(() => assertCheckoutPaid([{ id: "a", status: "paid" }], ["a"])).not.toThrow();
    expect(isShippingPaid("released")).toBe(true);
  });
  it("impressão exige URL HTTPS do Melhor Envio", () => {
    expect(() => labelUrl({})).toThrow();
    expect(() => labelUrl({ url: "javascript:alert(1)" })).toThrow();
    expect(labelUrl({ url: "https://www.melhorenvio.com.br/print/x" })).toBe("https://www.melhorenvio.com.br/print/x");
  });
});