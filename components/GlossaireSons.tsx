'use client';

import { useEffect } from 'react';

/**
 * Les boutons d'écoute du glossaire, servis par un seul écouteur.
 *
 * Les 537 boutons sont de simples `<button data-son>` rendus par le serveur
 * (app/glossaire/page.tsx) : un composant React par bouton coûtait autant d'hydratations
 * au chargement, pour une page où l'on n'en écoute que quelques-uns. Un clic remonte
 * jusqu'à la liste, qui joue le son désigné.
 *
 * Un seul son à la fois : en lancer un coupe le précédent, et recliquer sur celui qui
 * joue l'arrête. `data-lecture` sur le bouton actif bascule son icône (globals.css).
 */
export default function GlossaireSons() {
  useEffect(() => {
    const liste = document.getElementById('glossaire');
    if (!liste) return;

    const audio = new Audio();
    let actif: HTMLElement | null = null;

    const arreter = () => {
      actif?.removeAttribute('data-lecture');
      actif = null;
    };
    audio.addEventListener('ended', arreter);
    audio.addEventListener('error', arreter);

    function surClic(e: MouseEvent) {
      const bouton = (e.target as Element).closest<HTMLElement>('button[data-son]');
      if (!bouton) return;

      const memeBouton = bouton === actif;
      audio.pause();
      arreter();
      if (memeBouton) return;

      audio.src = bouton.dataset.son!;
      actif = bouton;
      bouton.setAttribute('data-lecture', '');
      audio.play().catch(arreter);
    }

    liste.addEventListener('click', surClic);
    return () => {
      liste.removeEventListener('click', surClic);
      audio.pause();
    };
  }, []);

  return null;
}
