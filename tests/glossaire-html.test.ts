import { describe, expect, it } from 'vitest';
import { esc, ligne, type Entree } from '@/lib/glossaire-html';

const entree = (over: Partial<Entree> = {}): Entree => ({
  cle: 'k',
  arabe: 'بكرة',
  translitteration: 'bokra',
  francais: 'Demain',
  audio: '/audio/vocab/abc.mp3',
  sources: [{ m: 'module-03', mt: 'Les jours', l: 'uuid-1', lt: 'Leçon', d: 17, i: 'v1' }],
  ...over,
});

describe('esc', () => {
  it('échappe les cinq caractères spéciaux du HTML', () => {
    expect(esc(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});

describe('ligne', () => {
  it("garde une balise glissée dans le contenu à l'état de texte", () => {
    const html = ligne(
      entree({
        francais: '<img src=x onerror=alert(1)>',
        translitteration: '"><script>alert(1)</script>',
      })
    );
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('pose le bouton d’écoute seulement quand le mot a un son', () => {
    expect(ligne(entree())).toContain('data-son="/audio/vocab/abc.mp3"');
    expect(ligne(entree({ audio: null }))).not.toContain('<button');
  });

  it('lie chaque leçon source, par son jour ou par le titre du module', () => {
    const html = ligne(
      entree({
        sources: [
          { m: 'module-03', mt: 'Les jours', l: 'uuid-1', lt: 'L', d: 17, i: 'v1' },
          { m: 'calendar-core', mt: 'Le calendrier', l: 'uuid-2', lt: 'L', d: null, i: 'v2' },
        ],
      })
    );
    expect(html).toContain('<a href="/modules/module-03/uuid-1#mot-v1">Jour 17</a>');
    expect(html).toContain('<a href="/modules/calendar-core/uuid-2#mot-v2">Le calendrier</a>');
    expect(html).toContain('data-themes="module-03 calendar-core"');
  });

  it('met un tiret quand le mot n’a pas d’écriture arabe', () => {
    expect(ligne(entree({ arabe: null }))).toContain('dir="rtl">—</span>');
  });
});
