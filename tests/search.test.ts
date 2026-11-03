import { describe, expect, it } from 'vitest';
import { foldArabic, foldArabizi, foldLatin, searchVocab, type VocabHit } from '@/lib/search';

const hit = (t: string, f: string, a: string | null = null): VocabHit => ({
  i: t,
  a,
  t,
  f,
  m: 'module-01',
  mt: 'Module',
  l: 'l',
  lt: 'Leçon',
  d: 1,
});

describe('normalisations', () => {
  it('français sans accents ni casse', () => {
    expect(foldLatin('Égyptien ')).toBe('egyptien');
  });
  it('Arabizi sans ses chiffres', () => {
    expect(foldArabizi('3ayn')).toBe('ayn');
  });
  it('arabe sans voyelles courtes, alef et ta marbouta unifiés', () => {
    expect(foldArabic('إِسْوِد')).toBe(foldArabic('اسود'));
    expect(foldArabic('قهوة')).toBe('قهوه');
  });
});

describe('searchVocab', () => {
  const index = [hit('el-sabt elli fat', 'samedi dernier'), hit('sabt', 'samedi'), hit('bokra', 'demain', 'بكرة')];

  it("préfère l'égalité, puis le début de mot", () => {
    expect(searchVocab(index, 'sab').map((h) => h.t)).toEqual(['sabt', 'el-sabt elli fat']);
  });
  it('trouve dans les trois écritures', () => {
    expect(searchVocab(index, 'bokra')[0].t).toBe('bokra');
    expect(searchVocab(index, 'demain')[0].t).toBe('bokra');
    expect(searchVocab(index, 'بكره')[0].t).toBe('bokra');
  });
  it('ne renvoie rien pour une requête vide', () => {
    expect(searchVocab(index, '  ')).toEqual([]);
  });
});
