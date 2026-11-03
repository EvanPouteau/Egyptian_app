/**
 * Comparaison d'une réponse tapée au clavier avec la forme attendue, en Arabizi.
 *
 * L'Arabizi n'a pas d'orthographe officielle : le même mot s'écrit « baroo7 », « barou7 »,
 * « baru7 » ou « barooh » selon qui l'écrit. Exiger la graphie exacte du corpus
 * transformerait un exercice de conjugaison en exercice de copie. On juge donc en deux
 * passes :
 *
 * - `exact`  : la réponse correspond une fois la casse, la ponctuation et les séparateurs
 *              retirés (« Ma-ro7t-sh » = « maro7tsh » = « ma ro7t sh »).
 * - `close`  : elle ne diffère plus que par des variantes connues de transcription
 *              (7/h, voyelles doublées, u/o, i/e). Comptée juste, mais l'écran affiche la
 *              graphie du cours — sinon on entérine une orthographe approximative.
 * - `wrong`  : autre chose.
 *
 * Les deux passes sont pures et déterministes : elles tournent aussi bien côté serveur
 * (génération, tests) que dans le navigateur pendant l'exercice.
 */

/** Translittération académique → Arabizi. Même table que `scripts/normalize-arabizi.ts`. */
const ACADEMIC: Record<string, string> = {
  ʿ: '3',
  ʾ: '2',
  ḥ: '7',
  ṣ: 's',
  ṭ: 't',
  ḍ: 'd',
  ẓ: 'z',
  ġ: 'gh',
  ḫ: 'kh',
  š: 'sh',
  ǧ: 'g',
  ā: 'a',
  ī: 'i',
  ū: 'u',
  ē: 'e',
  ō: 'o',
};

const ACADEMIC_PATTERN = new RegExp(`[${Object.keys(ACADEMIC).join('')}]`, 'gi');

/**
 * Forme canonique : ce qui reste quand on retire tout ce qui ne porte pas de son.
 *
 * Les séparateurs sont supprimés et non remplacés par un espace : le trait d'union de
 * l'Arabizi est décoratif et personne ne le place au même endroit (« el-beit », « el beit »,
 * « elbeit » désignent le même mot).
 */
export function normalizeStrict(raw: string): string {
  // La table académique passe AVANT le retrait des accents : décomposé, « ḥ » devenait
  // « h » + point souscrit, le point était retiré et la table ne voyait plus qu'un « h »
  // (« ḥ » → « h » au lieu de « 7 », « š » → « s » au lieu de « sh »). Trouvé par
  // tests/arabizi.test.ts. NFC d'abord, pour une saisie déjà décomposée.
  return raw
    .normalize('NFC')
    .toLowerCase()
    .replace(ACADEMIC_PATTERN, (ch) => ACADEMIC[ch.toLowerCase()] ?? ch)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents français saisis par habitude (é, è, ê…)
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Forme relâchée : neutralise les variantes de transcription réellement observées.
 *
 * L'ordre compte. On réduit d'abord les doublons (« baroo7 » → « baro7 »), puis on fusionne
 * les voyelles interchangeables (u↔o, i↔e), puis on réduit à nouveau — « barou7 » ne
 * devient « baro7 » qu'après que le `u` est passé à `o`, ce qui crée le doublon.
 */
export function normalizeLoose(raw: string): string {
  return normalizeStrict(raw)
    .replace(/5/g, 'kh')
    .replace(/7/g, 'h') // le ḥ râpeux, que beaucoup tapent « h » faute de réflexe
    .replace(/3/g, 'a') // le ʿayn, souvent omis ou rendu par la voyelle qui le suit
    .replace(/2/g, '') // le coup de glotte, presque jamais noté par les débutants
    .replace(/(.)\1+/g, '$1')
    .replace(/u/g, 'o')
    .replace(/i/g, 'e')
    .replace(/(.)\1+/g, '$1');
}

export type Verdict = 'exact' | 'close' | 'wrong';

/**
 * Juge une réponse. `accepted` liste les variantes que le corpus considère équivalentes
 * (ex. une forme avec et sans pronom explicite) ; elles sont jugées au même niveau que la
 * réponse principale.
 */
export function judgeAnswer(given: string, expected: string, accepted: string[] = []): Verdict {
  const candidates = [expected, ...accepted];
  const typed = normalizeStrict(given);
  if (typed.length === 0) return 'wrong';

  if (candidates.some((c) => normalizeStrict(c) === typed)) return 'exact';

  const loose = normalizeLoose(given);
  if (candidates.some((c) => normalizeLoose(c) === loose)) return 'close';

  return 'wrong';
}
