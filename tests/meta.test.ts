import { describe, expect, it } from 'vitest';
import { describeLesson } from '@/lib/meta';

describe('describeLesson', () => {
  it('prend le premier paragraphe de prose, sans sa mise en forme', () => {
    const md = [
      '## Titre',
      '',
      '| a | b |',
      '|---|---|',
      '',
      "En égyptien, le **gim** se prononce comme le g de « gare » : c'est la marque la plus audible du dialecte du Caire.",
    ].join('\n');
    expect(describeLesson(md, 'Leçon', 'Module')).toBe(
      "En égyptien, le gim se prononce comme le g de « gare » : c'est la marque la plus audible du dialecte du Caire."
    );
  });

  it('coupe vers 155 caractères, sur un mot', () => {
    const long = 'Une phrase assez longue pour dépasser la limite. '.repeat(6);
    const d = describeLesson(long, 'Leçon', 'Module');
    expect(d.length).toBeLessThanOrEqual(155);
    expect(d.endsWith('…')).toBe(true);
    expect(d).not.toMatch(/\s…$/);
  });

  it("sans prose, cite les premiers mots de la leçon", () => {
    const d = describeLesson('| a | b |', 'Les jours', 'Calendrier', [
      { transliteration: 'bokra', french: 'Demain' },
      { transliteration: 'embare7', french: 'Hier' },
    ]);
    expect(d).toBe('Leçon « Les jours » : bokra (demain), embare7 (hier)… Arabe égyptien du Caire, avec prononciation.');
  });

  it('sans prose ni mots, situe la leçon dans son module', () => {
    expect(describeLesson('## Titre', 'Aller', 'Conjugaisons')).toContain('module « Conjugaisons »');
  });
});
