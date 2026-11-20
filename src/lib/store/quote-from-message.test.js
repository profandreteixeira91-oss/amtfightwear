import { describe, expect, test } from 'bun:test';
import { parseQuoteMessage, sizeKey, swapProduct } from './quote-from-message.ts';

const FAIXA_SIZES = ['M0 - 200cm', 'M1 - 215cm', 'M2 - 225cm', 'M3 - 235cm', 'M4 - 240cm', 'A0 - 255cm', 'A1 - 270cm',
  'A2 - 290cm', 'A3 - 300cm', 'A4 - 320cm', 'A5 - 340cm'].map((size) => ({ size, price: null }));
const KIMONO_SIZES = ['M0', 'M1', 'M2', 'M3', 'M4', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'].map((size) => ({ size, price: null }));
const RASH_SIZES = ['PP', 'P', 'M', 'G', 'GG'].map((size) => ({ size, price: null }));

let n = 0;
const p = (name, price, category, parent, sizes = FAIXA_SIZES) => ({ id: `p${++n}`, name, price, category, parent_category: parent, sizes, slug: null, image_url: null });

const CATALOGO = [
  p('FAIXA JIU-JITSU AZUL - LINHA PREMIUM', 99.9, 'Faixas Padrão - BJJ Linha Premium', 'Faixas BJJ Linha Premium'),
  p('FAIXA JIU-JITSU AZUL - LINHA PRO', 54.9, 'Faixas Padrão - BJJ Linha Pro', 'Faixas BJJ Linha Pro'),
  p('FAIXA JIU-JITSU AZUL - LINHA TRAINING', 33.9, 'Faixas Padrão - BJJ Linha Training', 'Faixas BJJ Linha Training'),
  p('FAIXA JIU-JITSU BRANCA - LINHA TRAINING', 33.9, 'Faixas Padrão - BJJ Linha Training', 'Faixas BJJ Linha Training'),
  p('FAIXA JIU-JITSU AZUL BORDADO KANJI BJJ - LINHA PRO', 59.9, 'Faixas Bordadas - BJJ Linha Pro', 'Faixas BJJ Linha Pro'),
  p('FAIXA JIU-JITSU AZUL BORDADA PERSONALIZADA - LINHA PREMIUM', 109.9, 'Faixas Bordadas Personalizadas - BJJ Linha Premium', 'Faixas BJJ Linha Premium'),
  p('FAIXA JIU-JITSU ROXA - LINHA PRO', 54.9, 'Faixas Padrão - BJJ Linha Pro', 'Faixas BJJ Linha Pro'),
  p('FAIXA JIU-JITSU PRETA PONTEIRA VERMELHA BORDADO KANJI JJ - LINHA PREMIUM', 104.9, 'Faixas Bordadas - BJJ Linha Premium', 'Faixas BJJ Linha Premium'),
  p('FAIXA JIU-JITSU PRETA PONTEIRA BRANCA BORDADO KANJI JJ - LINHA PREMIUM', 104.9, 'Faixas Bordadas - BJJ Linha Premium', 'Faixas BJJ Linha Premium'),
  p('FAIXA JIU-JITSU CINZA COM BRANCO INFANTIL - LINHA PRO', 54.9, 'Faixas Padrão - BJJ Linha Pro', 'Faixas BJJ Linha Pro'),
  p('FAIXA JIU-JITSU CINZA INFANTIL - LINHA PRO', 54.9, 'Faixas Padrão - BJJ Linha Pro', 'Faixas BJJ Linha Pro'),
  p('FAIXA JUDÔ AZUL - LINHA PRO', 54.9, 'Faixas Padrão - Judô Linha Pro', 'Judô - Linha Pro'),
  p('FAIXA JUDÔ AZUL CLARA - LINHA PRO', 54.9, 'Faixas Padrão - Judô Linha Pro', 'Judô - Linha Pro'),
  p('FAIXA JUDÔ AMARELA PONTA LARANJA - LINHA PRO', 54.9, 'Faixas Padrão - Judô Linha Pro', 'Judô - Linha Pro'),
  p('FAIXA JUDÔ AMARELA - LINHA PRO', 54.9, 'Faixas Padrão - Judô Linha Pro', 'Judô - Linha Pro'),
  p('KIMONO DE JIU-JITSU AMT LANUS PREMIUM SERIES PRETO ADULTO', 499.9, 'Adulto', 'Kimono Trançado Premium', KIMONO_SIZES),
  p('KIMONO DE JIU-JITSU AMT LANUS PREMIUM SERIES BRANCO ADULTO', 489.9, 'Adulto', 'Kimono Trançado Premium', KIMONO_SIZES),
  p('KIMONO DE JIU-JITSU AMT LANUS PREMIUM SERIES AZUL ROYAL ADULTO', 499.9, 'Adulto', 'Kimono Trançado Premium', KIMONO_SIZES),
  p('KIMONO DE JIU-JITSU AMT LANUS PREMIUM SERIES PRETO INFANTIL', 439.9, 'Infantil', 'Kimono Trançado Premium',
    ['M0', 'M1', 'M2', 'M3', 'M4'].map((size) => ({ size, price: size === 'M4' ? 449.9 : null }))),
  p('Rashguard Manga Curta Básica AMT Fight Wear', 89.9, 'Rashguard Básica Adulto', 'Rashguard Básica', RASH_SIZES),
  p('Rashguard Manga Longa Básica AMT Fight Wear', 99.9, 'Rashguard Básica Adulto', 'Rashguard Básica', RASH_SIZES),
];

const nomes = (r) => r.lines.map((l) => [l.name, l.quantity]);

describe('orçamento a partir da mensagem', () => {
  test('faixa com modalidade, linha, cor, tamanho e quantidade', () => {
    const r = parseQuoteMessage('Boa tarde! Quero 2 faixas azuis de jiu jitsu linha pro tamanho A2', CATALOGO);
    expect(nomes(r)).toEqual([['FAIXA JIU-JITSU AZUL - LINHA PRO — Tam. A2 - 290cm', 2]]);
    expect(r.lines[0].unit_price).toBe(54.9);
    expect(r.lines[0].understood).toMatchObject({ kind: 'faixa', modality: 'jiujitsu', line: 'pro' });
    expect(r.lines[0].confidence).toBe('alta');
  });

  test('grade de tamanhos de um mesmo produto em vários trechos', () => {
    const r = parseQuoteMessage('Faixa branca bjj training:\n5 A1\n3 A2\nA3 x 2', CATALOGO);
    expect(nomes(r)).toEqual([
      ['FAIXA JIU-JITSU BRANCA - LINHA TRAINING — Tam. A1 - 270cm', 5],
      ['FAIXA JIU-JITSU BRANCA - LINHA TRAINING — Tam. A2 - 290cm', 3],
      ['FAIXA JIU-JITSU BRANCA - LINHA TRAINING — Tam. A3 - 300cm', 2],
    ]);
  });

  test('vários produtos na mesma frase e modalidade dita uma vez', () => {
    const r = parseQuoteMessage('Sou professor de judô, preciso de 10 faixas azuis pro M2 e 4 faixas amarelas ponta laranja pro M1', CATALOGO);
    expect(nomes(r)).toEqual([
      ['FAIXA JUDÔ AZUL - LINHA PRO — Tam. M2 - 225cm', 10],
      ['FAIXA JUDÔ AMARELA PONTA LARANJA - LINHA PRO — Tam. M1 - 215cm', 4],
    ]);
  });

  test('kimono: cor e tamanho, adulto por padrão e infantil quando dito', () => {
    const r = parseQuoteMessage('quanto fica um kimono preto A2? e um kimono preto infantil M4 pro meu filho', CATALOGO);
    expect(nomes(r)).toEqual([
      ['KIMONO DE JIU-JITSU AMT LANUS PREMIUM SERIES PRETO ADULTO — Tam. A2', 1],
      ['KIMONO DE JIU-JITSU AMT LANUS PREMIUM SERIES PRETO INFANTIL — Tam. M4', 1],
    ]);
    expect(r.lines[1].unit_price).toBe(449.9); // preço próprio do tamanho
  });

  test('faixa preta ponteira vermelha e bordado', () => {
    const r = parseQuoteMessage('1 faixa preta ponteira vermelha bordada A3', CATALOGO);
    expect(r.lines[0].name).toBe('FAIXA JIU-JITSU PRETA PONTEIRA VERMELHA BORDADO KANJI JJ - LINHA PREMIUM — Tam. A3 - 300cm');
  });

  test('faixa personalizada pede os nomes', () => {
    const r = parseQuoteMessage('3 faixas azul com nome bordado premium A1', CATALOGO);
    expect(r.lines[0].name).toContain('BORDADA PERSONALIZADA - LINHA PREMIUM');
    expect(r.lines[0].issues.join(' ')).toContain('nomes');
  });

  test('infantil com cor composta', () => {
    const r = parseQuoteMessage('2 faixas cinza com branco infantil M1', CATALOGO);
    expect(r.lines[0].name).toBe('FAIXA JIU-JITSU CINZA COM BRANCO INFANTIL - LINHA PRO — Tam. M1 - 215cm');
  });

  test('rashguard com tamanho em letra', () => {
    const r = parseQuoteMessage('2 rash manga longa tamanho G', CATALOGO);
    expect(nomes(r)).toEqual([['Rashguard Manga Longa Básica AMT Fight Wear — Tam. G', 2]]);
  });

  test('sem linha: escolhe e avisa, com os outros modelos para trocar', () => {
    const r = parseQuoteMessage('faixa azul A2', CATALOGO);
    const l = r.lines[0];
    expect(l.understood.line).toBe(null);
    expect(l.issues.join(' ')).toContain('linha');
    expect(l.alternatives.map((a) => a.name)).toContain('FAIXA JIU-JITSU AZUL - LINHA PREMIUM');
    const trocada = swapProduct(l, CATALOGO.find((x) => x.name === 'FAIXA JIU-JITSU AZUL - LINHA PREMIUM'));
    expect(trocada.name).toBe('FAIXA JIU-JITSU AZUL - LINHA PREMIUM — Tam. A2 - 290cm');
    expect(trocada.unit_price).toBe(99.9);
  });

  test('sem tamanho e saudações ficam de fora', () => {
    const r = parseQuoteMessage('Oi\nBom dia\nQuero um kimono branco', CATALOGO);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].issues).toContain('Tamanho não informado.');
    expect(r.ignored).toEqual([]);
  });

  test('texto sem produto não gera item', () => {
    const r = parseQuoteMessage('Vocês entregam em Maceió?', CATALOGO);
    expect(r.lines).toHaveLength(0);
    expect(r.ignored).toEqual(['voces entregam em maceio']);
  });

  test('quantidade antes da cor, um item por linha e linha dita no fim vale para todos', () => {
    const r = parseQuoteMessage('Faixas de judô:\n8 amarelas ponta laranja M2\n10 azuis M3\nlinha pro', CATALOGO);
    expect(nomes(r)).toEqual([
      ['FAIXA JUDÔ AMARELA PONTA LARANJA - LINHA PRO — Tam. M2 - 225cm', 8],
      ['FAIXA JUDÔ AZUL - LINHA PRO — Tam. M3 - 235cm', 10],
    ]);
  });

  test('"e 1 roxa A2" e "e um branco A1" viram outro item do mesmo produto', () => {
    const r = parseQuoteMessage('2 faixas azuis pro A3 e 1 roxa A2', CATALOGO);
    expect(nomes(r)).toEqual([
      ['FAIXA JIU-JITSU AZUL - LINHA PRO — Tam. A3 - 300cm', 2],
      ['FAIXA JIU-JITSU ROXA - LINHA PRO — Tam. A2 - 290cm', 1],
    ]);
    const k = parseQuoteMessage('kimono azul royal A3 e um branco A1', CATALOGO);
    expect(k.lines.map((l) => l.name)).toEqual([
      'KIMONO DE JIU-JITSU AMT LANUS PREMIUM SERIES AZUL ROYAL ADULTO — Tam. A3',
      'KIMONO DE JIU-JITSU AMT LANUS PREMIUM SERIES BRANCO ADULTO — Tam. A1',
    ]);
  });

  test('linha que o catálogo não tem: usa a mais próxima e avisa', () => {
    const r = parseQuoteMessage('5 faixas brancas premium A2', CATALOGO);
    expect(r.lines[0].name).toBe('FAIXA JIU-JITSU BRANCA - LINHA TRAINING — Tam. A2 - 290cm');
    expect(r.lines[0].issues.join(' ')).toContain('Não há este modelo na Linha Premium');
  });

  test('linha das faixas não vai para o kimono e pergunta solta fica de fora', () => {
    const r = parseQuoteMessage('10 faixas azuis A3 linha pro\nE um kimono preto A2\nVocês entregam em Maceió?', CATALOGO);
    expect(r.lines[1].name).toBe('KIMONO DE JIU-JITSU AMT LANUS PREMIUM SERIES PRETO ADULTO — Tam. A2');
    expect(r.lines[1].understood.line).toBe(null);
    expect(r.lines[1].issues).toEqual([]);
    expect(r.ignored).toEqual(['voces entregam em maceio']);
  });

  test('tamanho normalizado', () => {
    expect(sizeKey('A2 - 290cm')).toBe('A2');
    expect(sizeKey('gg')).toBe('GG');
  });
});
