import { SITE } from '@/lib/site-config';

/**
 * Les champs Open Graph d'une page (aperçu d'un lien partagé sur LinkedIn, Facebook,
 * WhatsApp…). Next ne fusionne pas `openGraph` avec celui de la mise en page : une page
 * qui en déclare un doit tout redonner, image comprise (mesuré : sans elle, les modules
 * et les leçons partaient sans aperçu), d'où cette fonction commune. L'image est
 * `app/opengraph-image.png`, que Next sert à cette adresse.
 *
 * Sans `path`, pas d'`og:url` : la mise en page l'aurait sinon transmis à toutes les pages
 * qui ne redéfinissent rien, et un lien vers le glossaire se serait présenté comme
 * l'accueil.
 */
export function openGraphFor(title: string, description: string, path?: string) {
  return {
    type: 'website' as const,
    locale: 'fr_FR',
    siteName: SITE.name,
    ...(path ? { url: new URL(path, SITE.url).toString() } : {}),
    title,
    description,
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: OG_IMAGE_ALT }],
  };
}

/** Le texte de `app/opengraph-image.alt.txt`, pour les pages qui redonnent l'image. */
const OG_IMAGE_ALT =
  "Arabe égyptien : « Parler l'arabe du Caire, pas celui des manuels. » Les quatre lettres de l'Arabizi : ع = 3, ح = 7, خ = 5, ق = 2.";

/**
 * Meta description d'une leçon, tirée de son contenu.
 *
 * Mesuré (Lighthouse, 02/11/2026) : les leçons n'avaient pas de description propre — elles
 * héritaient de la phrase générique du site, identique sur 141 pages. On prend le premier
 * paragraphe de prose du markdown (ni titre, ni tableau, ni citation, ni liste), débarrassé
 * de sa mise en forme, coupé proprement vers 155 caractères : la longueur qu'affichent les
 * moteurs de recherche. Trop court (une ligne d'introduction), on le complète d'une phrase
 * qui situe la leçon.
 */
const MAX = 155;

function plain(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // liens : on garde le texte
    .replace(/[*_`]+/g, '') // gras, italique, code
    .replace(/\s+/g, ' ')
    .trim();
}

function cut(text: string): string {
  if (text.length <= MAX) return text;
  const room = text.slice(0, MAX - 1);
  const space = room.lastIndexOf(' ');
  return `${room.slice(0, space > 80 ? space : room.length).replace(/[\s,;:—–-]+$/, '')}…`;
}

export function describeLesson(
  markdown: string,
  lessonTitle: string,
  moduleTitle: string,
  words: { transliteration: string; french: string }[] = []
): string {
  const paragraph = markdown
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !/^(#|\||>|[-*+] |\d+[.)] |```|<)/.test(p));
  const text = paragraph ? plain(paragraph) : '';
  if (text.length >= 70) return cut(text);

  // Pas d'introduction en prose (la moitié des leçons s'ouvrent sur un tableau) : les
  // premiers mots de la leçon disent mieux ce qu'on y apprend qu'une phrase générique.
  const sample = words
    .slice(0, 4)
    .map((w) => `${w.transliteration} (${w.french.toLowerCase()})`)
    .join(', ');
  const context = sample
    ? `Leçon « ${lessonTitle} » : ${sample}… Arabe égyptien du Caire, avec prononciation.`
    : `Leçon « ${lessonTitle} » du module « ${moduleTitle} », pour apprendre l'arabe égyptien du Caire.`;
  return cut(text ? `${text} ${context}` : context);
}
