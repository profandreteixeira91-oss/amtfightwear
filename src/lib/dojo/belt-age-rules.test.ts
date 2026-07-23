import { describe, expect, test } from "bun:test";
import { ageCategory, suggestNextBelt } from "./belt-age-rules";

const belts = [
  { id: "white", name: "Branca", modality: "jiu-jitsu", max_degrees: 4, sort_order: 1 },
  { id: "grey-white", name: "Cinza com Branco", modality: "jiu-jitsu", max_degrees: 4, sort_order: 2 },
  { id: "grey", name: "Cinza", modality: "jiu-jitsu", max_degrees: 4, sort_order: 3 },
  { id: "grey-black", name: "Cinza com Preto", modality: "jiu-jitsu", max_degrees: 4, sort_order: 4 },
  { id: "yellow-white", name: "Amarela com Branco", modality: "jiu-jitsu", max_degrees: 4, sort_order: 5 },
  { id: "yellow", name: "Amarela", modality: "jiu-jitsu", max_degrees: 4, sort_order: 6 },
  { id: "yellow-black", name: "Amarela com Preto", modality: "jiu-jitsu", max_degrees: 4, sort_order: 7 },
  { id: "orange-white", name: "Laranja com Branco", modality: "jiu-jitsu", max_degrees: 4, sort_order: 8 },
  { id: "orange", name: "Laranja", modality: "jiu-jitsu", max_degrees: 4, sort_order: 9 },
  { id: "orange-black", name: "Laranja com Preto", modality: "jiu-jitsu", max_degrees: 4, sort_order: 10 },
  { id: "green-white", name: "Verde com Branco", modality: "jiu-jitsu", max_degrees: 4, sort_order: 11 },
  { id: "green", name: "Verde", modality: "jiu-jitsu", max_degrees: 4, sort_order: 12 },
  { id: "green-black", name: "Verde com Preto", modality: "jiu-jitsu", max_degrees: 4, sort_order: 13 },
  { id: "blue", name: "Azul", modality: "jiu-jitsu", max_degrees: 4, sort_order: 14 },
  { id: "purple", name: "Roxa", modality: "jiu-jitsu", max_degrees: 4, sort_order: 15 },
  { id: "brown", name: "Marrom", modality: "jiu-jitsu", max_degrees: 4, sort_order: 16 },
  { id: "black", name: "Preta", modality: "jiu-jitsu", max_degrees: 7, sort_order: 17 },
];

describe("suggestNextBelt", () => {
  test("promove faixa branca 4º grau para faixa azul sem grau", () => {
    expect(suggestNextBelt({
      current: { belt: belts[0], degree: 4 }, belts, modality: "jiu-jitsu", age: 23,
    })).toEqual({ beltId: "blue", degree: 0 });
  });

  test("promove faixa azul 2º grau para faixa azul 3º grau", () => {
    expect(suggestNextBelt({
      current: { belt: belts[13], degree: 2 }, belts, modality: "jiu-jitsu", age: 28,
    })).toEqual({ beltId: "blue", degree: 3 });
  });

  test("reconhece a faixa atual pelo nome quando o relacionamento não traz id", () => {
    expect(suggestNextBelt({
      current: { belt: { id: "", name: "Roxa", modality: "jiu-jitsu", max_degrees: 4 }, degree: 3 },
      belts, modality: "jiu-jitsu", age: 37,
    })).toEqual({ beltId: "purple", degree: 4 });
  });

  test("aluno infantil na branca entra na primeira faixa infantil", () => {
    expect(suggestNextBelt({
      current: { belt: belts[0], degree: 2 }, belts, modality: "jiu-jitsu", age: 10,
    })).toEqual({ beltId: "grey-white", degree: 0 });
  });

  test("aluno infantil progride graus antes de trocar de faixa", () => {
    expect(suggestNextBelt({
      current: { belt: belts[1], degree: 2 }, belts, modality: "jiu-jitsu", age: 9,
    })).toEqual({ beltId: "grey-white", degree: 3 });
  });

  test("aluno infantil no último grau avança na sequência infantil", () => {
    expect(suggestNextBelt({
      current: { belt: belts[1], degree: 4 }, belts, modality: "jiu-jitsu", age: 9,
    })).toEqual({ beltId: "grey", degree: 0 });
  });

  test("15 anos já usa a sequência adulta", () => {
    expect(ageCategory(14)).toBe("kids");
    expect(ageCategory(15)).toBe("adult");
  });
});