import { describe, expect, it } from 'vitest';
import { openGraphFor } from '@/lib/meta';
import { courseData, lessonData } from '@/lib/structured-data';

const mod = { id: 'module-01', title: "L'alphabet", description: null, level: 'A1' };

describe('données structurées', () => {
  it('décrit un module comme un cours gratuit, avec son niveau', () => {
    const c = courseData(mod);
    expect(c['@type']).toBe('Course');
    expect(c.url).toBe('https://egyptian-arabic-app-phi.vercel.app/modules/module-01');
    expect(c.educationalLevel).toBe('A1');
    expect(c.description).toContain("L'alphabet");
  });

  it('n’annonce pas de niveau pour un module de référence', () => {
    expect(courseData({ ...mod, level: 'REF' }).educationalLevel).toBeUndefined();
  });

  it('donne à une leçon son cours et un fil d’Ariane en trois étapes', () => {
    const d = lessonData(mod, { id: 'uuid', title: 'Les fondations' }, 'Description');
    const [lecon, fil] = d['@graph'];
    expect(lecon.isPartOf).toMatchObject({ '@type': 'Course', name: "L'alphabet" });
    expect(fil.itemListElement?.map((i) => i.name)).toEqual(['Modules', "L'alphabet", 'Les fondations']);
  });
});

describe('openGraphFor', () => {
  it('redonne nom du site, langue, adresse absolue et image', () => {
    const og = openGraphFor('T', 'D', '/modules/module-01');
    expect(og).toMatchObject({
      type: 'website',
      locale: 'fr_FR',
      siteName: 'Arabe égyptien',
      url: 'https://egyptian-arabic-app-phi.vercel.app/modules/module-01',
      title: 'T',
      description: 'D',
    });
    expect(og.images[0]).toMatchObject({ url: '/opengraph-image.png', width: 1200, height: 630 });
  });

  it('n’annonce aucune adresse sans chemin', () => {
    expect(openGraphFor('T', 'D')).not.toHaveProperty('url');
  });
});
