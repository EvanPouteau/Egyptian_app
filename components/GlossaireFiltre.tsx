'use client';

import { useRef, useState } from 'react';
import { foldArabic, foldArabizi, foldLatin, isArabic } from '@/lib/search';

/**
 * Le texte cherchable de chaque entrée : arabe, Arabizi (sous ses deux formes) et
 * français, repliés comme la requête. Calculé une fois, au premier filtrage, à partir de
 * ce qui est affiché : le serveur l'écrivait auparavant dans un `data-mot` sur chacune
 * des 544 lignes, soit des dizaines de Ko envoyés deux fois pour un champ que la plupart
 * des visiteurs ne touchent pas.
 */
let index: Map<HTMLElement, string> | null = null;

function texteCherchable(el: HTMLElement) {
  const texte = (cls: string) => el.querySelector(`.${cls}`)?.textContent ?? '';
  const translit = texte('glossaire-translit');
  return [
    foldLatin(translit),
    foldArabizi(translit),
    foldLatin(texte('glossaire-francais')),
    foldArabic(texte('glossaire-arabe').replace('—', '')),
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Filtre du glossaire.
 *
 * Le composant ne rend QUE les contrôles : le champ, les thèmes et le compteur. Les 543
 * entrées, elles, sont rendues par le serveur (voir app/glossaire/page.tsx) et ce filtre
 * se borne à les masquer. Les recevoir en props aurait fait voyager tout le vocabulaire
 * deux fois — une fois en HTML, une fois dans la charge React.
 *
 * Manipuler des nœuds que React ne possède pas est acceptable ici précisément parce qu'il
 * ne les possède pas : ce sont des enfants statiques d'un Server Component, jamais
 * re-rendus, donc aucun risque que React écrase ce que le filtre a posé.
 */
export default function GlossaireFiltre({
  total,
  themes,
}: {
  total: number;
  themes: [string, { titre: string; n: number }][];
}) {
  const [requete, setRequete] = useState('');
  const [theme, setTheme] = useState<string | null>(null);
  const [visibles, setVisibles] = useState(total);
  const champRef = useRef<HTMLInputElement>(null);

  /**
   * Applique les deux critères d'un coup et met à jour le compteur.
   *
   * Appelé depuis les gestionnaires d'événements, jamais depuis un effet : le HTML rendu
   * par le serveur montre déjà toutes les entrées, il n'y a donc rien à synchroniser au
   * montage — et un `setState` dans le corps d'un effet déclencherait un rendu en cascade
   * inutile à chaque arrivée sur la page.
   */
  function appliquer(q: string, th: string | null) {
    const terme = q.trim();
    const aiguille = terme ? (isArabic(terme) ? foldArabic(terme) : foldLatin(terme)) : '';

    // Reconstruit si la liste a changé de nœuds (navigation aller-retour vers la page).
    const lignes = document.querySelectorAll<HTMLElement>('#glossaire > li');
    if (!index || !index.has(lignes[0])) {
      index = new Map([...lignes].map((el) => [el, texteCherchable(el)]));
    }

    let n = 0;
    for (const el of lignes) {
      const correspond =
        (!aiguille || index.get(el)!.includes(aiguille)) &&
        (!th || (el.dataset.themes ?? '').split(' ').includes(th));
      el.hidden = !correspond;
      if (correspond) n++;
    }

    const vide = document.getElementById('glossaire-vide');
    if (vide) vide.hidden = n > 0;
    setVisibles(n);
  }

  return (
    <div className="mt-8">
      <div className="search-field pop-field">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={champRef}
          type="search"
          value={requete}
          onChange={(e) => {
            setRequete(e.target.value);
            appliquer(e.target.value, theme);
          }}
          placeholder="Filtrer : français, arabe ou Arabizi…"
          autoComplete="off"
          spellCheck={false}
          // `size={1}` neutralise la largeur intrinsèque native d'un champ (environ vingt
          // caractères), que `min-width: 0` ne suffit pas à annuler : elle remontait
          // jusqu'au `<main>` et élargissait la page. La largeur réelle vient du flex.
          size={1}
          aria-label="Filtrer le glossaire"
          aria-describedby="glossaire-compte"
          className="search-input"
        />
        {requete && (
          <button
            type="button"
            onClick={() => {
              setRequete('');
              appliquer('', theme);
              champRef.current?.focus();
            }}
            className="shrink-0 rounded-full px-2 py-1 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
          >
            Effacer
          </button>
        )}
      </div>

      {/* Une liste déroulante et non une rangée de puces : il y a 29 modules, et autant
          de puces occupaient plus de hauteur que les premiers résultats sur mobile. Le
          `<select>` natif reste aussi entièrement pilotable au clavier, sans code. */}
      {/* Empilé jusqu'à 640 px : côte à côte, le libellé et le menu additionnaient leurs
          largeurs minimales et poussaient la page à 414 px sur un écran de 375 (mesuré). */}
      <label className="mt-3 flex flex-col gap-1.5 text-sm sm:flex-row sm:items-center sm:gap-2">
        <span className="shrink-0 text-[var(--muted)]">Limiter à un module :</span>
        <select
          value={theme ?? ''}
          onChange={(e) => {
            const suivant = e.target.value || null;
            setTheme(suivant);
            appliquer(requete, suivant);
          }}
          className="glossaire-select"
        >
          <option value="">Tous les modules ({total})</option>
          {themes.map(([id, t]) => (
            <option key={id} value={id}>
              {t.titre} ({t.n})
            </option>
          ))}
        </select>
      </label>

      <p id="glossaire-compte" aria-live="polite" className="mt-4 text-sm text-[var(--muted)]">
        {visibles === total
          ? `${total} mots`
          : `${visibles} mot${visibles > 1 ? 's' : ''} sur ${total}`}
      </p>
    </div>
  );
}
