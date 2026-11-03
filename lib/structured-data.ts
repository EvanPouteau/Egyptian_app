import { SITE } from '@/lib/site-config';

/**
 * Données structurées schema.org (rendues par components/JsonLd.tsx).
 *
 * Elles disent aux moteurs de recherche ce qu'est chaque page — le site, un cours
 * (module), une leçon de ce cours — et donnent le fil d'Ariane Modules › module › leçon,
 * que Google peut afficher à la place de l'adresse (des UUID, peu parlants).
 */

const url = (path: string) => new URL(path, SITE.url).toString();

const provider = { '@type': 'Organization', name: SITE.name, url: SITE.url };

export function websiteData(description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description,
    inLanguage: 'fr',
  };
}

type ModuleInfo = { id: string; title: string; description: string | null; level: string };

/** Le niveau du cadre européen, quand le module en a un (pas la référence « REF »). */
const cecrl = (level: string) => (/^[ABC][12]$/.test(level) ? level : undefined);

export function courseData(mod: ModuleInfo) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: mod.title,
    description: mod.description ?? `Module « ${mod.title} » pour apprendre l'arabe égyptien du Caire.`,
    url: url(`/modules/${mod.id}`),
    inLanguage: 'fr',
    educationalLevel: cecrl(mod.level),
    isAccessibleForFree: true,
    provider,
  };
}

export function lessonData(
  mod: ModuleInfo,
  lesson: { id: string; title: string },
  description: string
) {
  const lessonUrl = url(`/modules/${mod.id}/${lesson.id}`);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LearningResource',
        name: lesson.title,
        description,
        url: lessonUrl,
        inLanguage: 'fr',
        learningResourceType: 'Leçon',
        educationalLevel: cecrl(mod.level),
        isAccessibleForFree: true,
        isPartOf: { '@type': 'Course', name: mod.title, url: url(`/modules/${mod.id}`) },
        provider,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Modules', item: url('/modules') },
          { '@type': 'ListItem', position: 2, name: mod.title, item: url(`/modules/${mod.id}`) },
          { '@type': 'ListItem', position: 3, name: lesson.title, item: lessonUrl },
        ],
      },
    ],
  };
}
