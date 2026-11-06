import { describe, expect, it } from 'vitest';
import { cardRows, repeatedGroup } from '@/lib/table-cards';

describe('repeatedGroup', () => {
  it('reconnaît deux séries identiques côte à côte, à la casse et aux espaces près', () => {
    expect(repeatedGroup(['Chiffre', 'Romanisation', ' chiffre', 'ROMANISATION'])).toBe(2);
  });
  it('ignore un tableau dont les colonnes sont différentes ou en nombre impair', () => {
    expect(repeatedGroup(['Possession', 'Suffixe', 'Masc.', 'Fém.'])).toBeNull();
    expect(repeatedGroup(['A', 'B', 'C'])).toBeNull();
    expect(repeatedGroup(['A', 'B'])).toBeNull();
  });
});

describe('cardRows', () => {
  const headers = ['Chiffre', 'Romanisation', 'Chiffre', 'Romanisation'];

  it('donne une carte par nombre, dans l’ordre des nombres : série de gauche, puis de droite', () => {
    const r = cardRows(headers, [
      ['0 — Sifr', 'Zéro', '6 — Setta', 'Six'],
      ['1 — Wa7ed', 'Un', '7 — Sab3a', 'Sept'],
    ]);
    expect(r.headers).toEqual(['Chiffre', 'Romanisation']);
    expect(r.rows.map((x) => x[0])).toEqual(['0 — Sifr', '1 — Wa7ed', '6 — Setta', '7 — Sab3a']);
    expect(r.rows[0]).toEqual(['0 — Sifr', 'Zéro']);
  });

  it('écarte un groupe entièrement vide', () => {
    const r = cardRows(headers, [['9 — Tes3a', 'Neuf', '—', '']]);
    expect(r.rows).toEqual([['9 — Tes3a', 'Neuf']]);
  });

  it('laisse un tableau ordinaire tel quel', () => {
    const h = ['Possession', 'Suffixe', 'Masc.', 'Fém.'];
    const rows = [['Mon', '-i', 'Kitabi', '3arabiyyeti']];
    expect(cardRows(h, rows)).toEqual({ headers: h, rows });
  });
});
