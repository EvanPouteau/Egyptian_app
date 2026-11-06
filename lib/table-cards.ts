/**
 * Cartes des tableaux de leçon sur téléphone (components/LessonViewer.tsx).
 *
 * Certains tableaux placent deux séries côte à côte pour tenir en largeur : « Chiffre |
 * Romanisation | Chiffre | Romanisation », une ligne portant « 0 — Sifr » ET « 6 — Setta ».
 * En carte, une ligne = une carte : les deux nombres se retrouvaient dans la même carte,
 * mélangés (signalé par l'éditeur sur la leçon des chiffres, module 6). On détecte ces
 * tableaux — un groupe de colonnes répété à l'identique — et on donne une carte à chaque
 * groupe. L'ordre est celui des lignes (0, 6, 1, 7…), le même que celui du tableau lu de
 * gauche à droite, ligne après ligne.
 */

/** Longueur du groupe répété, ou `null` si les colonnes ne se répètent pas. */
export function repeatedGroup(headers: readonly string[]): number | null {
  if (headers.length < 4 || headers.length % 2 !== 0) return null;
  const half = headers.length / 2;
  const norm = (h: string) => h.trim().toLowerCase();
  for (let i = 0; i < half; i++) if (norm(headers[i]) !== norm(headers[i + half])) return null;
  return half;
}

/** Une valeur vide ou un simple tiret n'apporte rien. */
const isBlank = (v: string) => !v || /^[—–-]$/.test(v.trim());

/**
 * Les lignes à mettre en cartes : celles du tableau, ou, pour un tableau à colonnes
 * répétées, une ligne par groupe (un groupe entièrement vide est écarté, par exemple la
 * moitié droite d'une dernière ligne incomplète).
 */
export function cardRows(headers: readonly string[], rows: readonly string[][]) {
  const size = repeatedGroup(headers);
  if (size === null) return { headers: [...headers], rows: rows.map((r) => [...r]) };

  const out: string[][] = [];
  for (const row of rows) {
    for (let g = 0; g < 2; g++) {
      const group = row.slice(g * size, (g + 1) * size);
      if (group.every(isBlank)) continue;
      out.push(group);
    }
  }
  return { headers: headers.slice(0, size), rows: out };
}
