import { describe, expect, it } from 'vitest';
import { parseSeed, seededShuffle } from '@/lib/shuffle';

describe('seededShuffle', () => {
  const items = Array.from({ length: 20 }, (_, i) => i);

  it('donne le même ordre pour la même graine (serveur et hydratation concordent)', () => {
    expect(seededShuffle(items, 42)).toEqual(seededShuffle(items, 42));
  });
  it('change d’ordre avec la graine', () => {
    expect(seededShuffle(items, 1)).not.toEqual(seededShuffle(items, 2));
  });
  it('ne perd ni ne duplique aucun élément, et ne modifie pas l’original', () => {
    const copy = [...items];
    expect([...seededShuffle(items, 7)].sort((a, b) => a - b)).toEqual(items);
    expect(items).toEqual(copy);
  });
});

describe('parseSeed', () => {
  it('lit un entier, ou rien', () => {
    expect(parseSeed('123')).toBe(123);
    expect(parseSeed(['5', '6'])).toBe(5);
    expect(parseSeed(undefined)).toBeNull();
    expect(parseSeed('abc')).toBeNull();
  });
});
