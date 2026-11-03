import type { Metadata } from 'next';
import GlossaireFiltre from '@/components/GlossaireFiltre';
import GlossaireSons from '@/components/GlossaireSons';
import { vocabAudioSrc } from '@/lib/vocab-audio';
import { getModules } from '@/lib/content';
import { getVocabIndex } from '@/lib/vocab-index';
import { foldArabic, foldLatin, type VocabHit } from '@/lib/search';
import { ligne, type Entree } from '@/lib/glossaire-html';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Glossaire',
  description:
    "Tout le vocabulaire du site réuni : chaque mot en arabe, en Arabizi et en français, avec la leçon où il est enseigné. Recherche dans les trois écritures.",
};

/**
 * Regroupe les entrées identiques.
 *
 * Un même mot est parfois enseigné dans deux modules — قلب au module 01 et dans la
 * référence du corps, المدرسة dans les lieux publics et dans l'école. Les lister deux fois
 * dans un glossaire donnerait l'impression d'un doublon oublié ; on affiche une entrée et
 * on cite ses deux emplacements.
 */
function grouper(index: VocabHit[]): Entree[] {
  const parCle = new Map<string, Entree>();

  for (const hit of index) {
    const cle = `${foldArabic(hit.a ?? '')}|${foldLatin(hit.f)}|${foldLatin(hit.t)}`;
    const source = { m: hit.m, mt: hit.mt, l: hit.l, lt: hit.lt, d: hit.d, i: hit.i };

    const existante = parCle.get(cle);
    if (existante) existante.sources.push(source);
    else
      parCle.set(cle, {
        cle,
        arabe: hit.a,
        translitteration: hit.t,
        francais: hit.f,
        audio: vocabAudioSrc(hit.a),
        sources: [source],
      });
  }

  // Ordre alphabétique français : le glossaire se lit d'abord comme un
  // français → égyptien. Le sens inverse est couvert par le champ de recherche, qui
  // accepte aussi bien l'arabe que l'Arabizi.
  //
  // La ponctuation de tête est ignorée : sans cela, « Ramadan généreux » — dont la
  // traduction commence par un guillemet — se retrouvait en première position du
  // glossaire, avant le A. `numeric` garde les nombres dans l'ordre humain (2 avant 10).
  const cleTri = (s: string) => s.replace(/^[^\p{L}\p{N}]+/u, '');
  return [...parCle.values()].sort((a, b) =>
    cleTri(a.francais).localeCompare(cleTri(b.francais), 'fr', {
      sensitivity: 'base',
      numeric: true,
    })
  );
}

export default async function GlossairePage() {
  const index = await getVocabIndex();
  const entrees = grouper(index);

  // Un thème par module, avec son nombre de mots. L'ordre suit celui du programme
  // (`order_index`) et non l'alphabet des traductions : sans cette requête, les thèmes
  // sortaient dans l'ordre d'apparition des mots dans le glossaire, c'est-à-dire au
  // hasard.
  const rang = new Map((await getModules()).map((m) => [m.id, m.order_index]));

  const compte = new Map<string, { titre: string; n: number }>();
  for (const e of entrees) {
    for (const s of e.sources) {
      const t = compte.get(s.m) ?? { titre: s.mt, n: 0 };
      t.n += 1;
      compte.set(s.m, t);
    }
  }
  const themes = [...compte.entries()].sort(
    (a, b) => (rang.get(a[0]) ?? 999) - (rang.get(b[0]) ?? 999)
  );

  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-10 sm:px-8">
      <header>
        <p className="eyebrow">Tout le vocabulaire</p>
        <h1 className="display mt-2 text-4xl">Glossaire</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-[var(--muted)]">
          Les {entrees.length} mots du site réunis en une page, classés par ordre
          alphabétique français. Cherchez dans les trois écritures — « demain », « bokra »
          ou « بكرة » mènent au même mot — et suivez le lien pour retrouver la leçon qui
          l&apos;enseigne.
        </p>
      </header>

      <GlossaireFiltre total={entrees.length} themes={themes} />
      <GlossaireSons />

      {/*
        Liste et non tableau : à 375 px, quatre colonnes imposeraient un défilement
        horizontal sur le contenu principal de la page. Ici chaque entrée s'empile sur
        mobile et s'aligne en colonnes dès 640 px, sans jamais déborder.

        Les lignes sont rendues par le serveur, et le filtre se contente de les masquer.

        544 lignes, chaque octet compte deux fois : une fois dans le HTML, une fois dans la
        charge React qui l'accompagne. D'où un balisage réduit au strict nécessaire —
        - pas de composant client par ligne : les boutons d'écoute sont de simples
          `<button data-son>`, servis par un seul écouteur (GlossaireSons). 537 boutons
          `LetterAudioButton` coûtaient autant d'hydratations ;
        - des `<a>` et non des `<Link>` vers les leçons : un `<Link>` est lui aussi un
          composant client, et il précharge la leçon dès qu'il entre à l'écran, soit des
          centaines de requêtes en faisant défiler la liste ;
        - les styles dans globals.css (`.glossaire-*`), pas en classes répétées 544 fois ;
        - pas de texte de recherche précalculé en `data-` : le filtre le tire du texte
          affiché, au premier caractère tapé ;
        - la liste passe en HTML tout fait (lib/glossaire-html.ts), que React pose sans le
          parcourir.
        Mesuré en production avant ce régime : 5 081 éléments, 1 125 Ko de HTML brut.
      */}
      <ul id="glossaire" className="mt-6" dangerouslySetInnerHTML={{ __html: entrees.map(ligne).join('') }} />

      <p id="glossaire-vide" hidden className="mt-8 text-sm text-[var(--muted)]">
        Aucun mot ne correspond à cette recherche.
      </p>
    </main>
  );
}
