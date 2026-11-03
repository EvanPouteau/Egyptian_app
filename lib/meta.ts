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
