/**
 * Le HTML des lignes du glossaire (voir app/glossaire/page.tsx).
 *
 * Une liste en JSX, même rendue par le serveur, est hydratée élément par élément : React
 * parcourt les ~3 900 nœuds de la liste au chargement pour les rattacher à son arbre,
 * alors que rien n'y est interactif — le filtre ne fait que masquer des lignes et les
 * boutons d'écoute ont un écouteur commun (GlossaireSons). Posée par
 * `dangerouslySetInnerHTML`, la liste est un seul nœud pour React.
 *
 * Contrepartie : plus d'échappement automatique. TOUT ce qui vient du contenu passe par
 * `esc` (tests/glossaire-html.test.ts vérifie qu'une balise dans un mot reste du texte).
 */

export type Entree = {
  cle: string;
  arabe: string | null;
  translitteration: string;
  francais: string;
  audio: string | null;
  /** Toutes les leçons où le mot apparaît — un mot peut être enseigné à deux endroits. */
  sources: { m: string; mt: string; l: string; lt: string; d: number | null; i: string }[];
};

/** Échappe un texte pour le HTML, contenu comme valeur d'attribut entre guillemets. */
export function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Une entrée du glossaire.
 *
 * Le bouton suit l'Arabizi plutôt que l'arabe : la colonne arabe fait 6,5 rem, un bouton
 * de 40 px y repousserait les expressions longues sur deux lignes.
 */
export function ligne(e: Entree): string {
  const themes = esc(e.sources.map((s) => s.m).join(' '));
  const son = e.audio
    ? `<button type="button" class="glossaire-son" data-son="${esc(e.audio)}" aria-label="Écouter la prononciation de ${esc(e.translitteration)}"></button>`
    : '';
  const sources = e.sources
    .map(
      (s) =>
        `<a href="/modules/${esc(s.m)}/${esc(s.l)}#mot-${esc(s.i)}">${esc(s.d !== null ? `Jour ${s.d}` : s.mt)}</a>`
    )
    .join('');
  return (
    `<li class="glossaire-entree" data-themes="${themes}">` +
    `<span class="arabic glossaire-arabe" dir="rtl">${esc(e.arabe ?? '—')}</span>` +
    `<span class="glossaire-translit">${esc(e.translitteration)}${son}</span>` +
    `<span class="glossaire-francais">${esc(e.francais)}</span>` +
    `<span class="glossaire-sources">${sources}</span>` +
    `</li>`
  );
}
