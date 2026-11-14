import { describe, expect, test } from "bun:test";
import {
  analyzePrice,
  breakEvenPrice,
  fixedExpensePercent,
  idealPrice,
  itemTotal,
  parseDecimal,
  productionCost,
  roundToNinety,
} from "./product-costs.ts";

const percents = { taxes: 6, gateway: 4, commission: 0, marketing: 10, reserve: 0, profit: 20 };

describe("custo de produção", () => {
  test("cada item soma quantidade × custo unitário com a perda", () => {
    expect(
      itemTotal({
        name: "Tecido",
        type: "material",
        quantity: 2,
        unit_cost: 30,
        waste_percent: 10,
      }),
    ).toBeCloseTo(66);
    expect(
      productionCost([
        { name: "Tecido", type: "material", quantity: 2, unit_cost: 30, waste_percent: 10 },
        { name: "Costura", type: "labor", quantity: 1, unit_cost: 34 },
      ]),
    ).toBeCloseTo(100);
  });
});

describe("preço ideal (markup divisor)", () => {
  test("percentuais incidem sobre o preço, não sobre o custo", () => {
    // 100 / (1 - 0,40) = 166,67 — e a 166,67 sobra exatamente 20% de lucro
    const price = idealPrice(100, percents);
    expect(price).toBeCloseTo(166.67, 2);
    expect(analyzePrice(price, 100, percents).margin).toBeCloseTo(20);
  });
  test("rateio de despesas fixas entra no divisor", () => {
    expect(idealPrice(100, percents, 10)).toBeCloseTo(200);
    expect(analyzePrice(200, 100, percents, 10).profit).toBeCloseTo(40);
  });
  test("equilíbrio deixa lucro zero", () => {
    const be = breakEvenPrice(100, percents);
    expect(analyzePrice(be, 100, percents).profit).toBeCloseTo(0);
  });
  test("percentuais em 100% ou mais não têm preço possível", () => {
    expect(idealPrice(100, { ...percents, profit: 80 })).toBeNull();
    expect(idealPrice(0, percents)).toBeNull();
  });
});

describe("auxiliares", () => {
  test("arredonda para o próximo final ,90", () => {
    expect(roundToNinety(287.3)).toBe(287.9);
    expect(roundToNinety(287.95)).toBe(288.9);
    expect(roundToNinety(287.9)).toBe(287.9);
  });
  test("despesas fixas viram percentual do faturamento", () => {
    expect(fixedExpensePercent(2000, 20000)).toBeCloseTo(10);
    expect(fixedExpensePercent(2000, 0)).toBeNull();
  });
  test("aceita vírgula decimal e milhar com ponto", () => {
    expect(parseDecimal("12,50")).toBe(12.5);
    expect(parseDecimal("1.234,5")).toBe(1234.5);
    expect(parseDecimal("3.5")).toBe(3.5);
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
  });
});
