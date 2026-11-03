'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * Les quatre sons qui expliquent l'Arabizi.
 *
 * Le choix n'est pas décoratif : ce sont exactement les quatre lettres arabes sans
 * équivalent français, et ce sont exactement les quatre chiffres qu'on tape à leur place
 * quand on écrit l'égyptien au clavier latin. Les faire entendre en un clic répond à la
 * question que tout débutant pose — « pourquoi des chiffres au milieu des mots ? » —
 * mieux qu'un paragraphe d'explication.
 *
 * Les fichiers sont ceux du module 01, déjà présents : la démo n'ajoute pas un octet au
 * dépôt, et rien n'est téléchargé tant que personne n'a cliqué.
 */
const SOUNDS = [
  {
    letter: 'ع',
    digit: '3',
    name: '3ayn',
    src: '/audio/alphabet/ayn.mp3',
    hint: "Une voix serrée au fond de la gorge. C'est la première lettre du mot « arabe » — et elle n'existe dans aucune langue européenne.",
  },
  {
    letter: 'ح',
    digit: '7',
    name: '7a',
    src: '/audio/alphabet/7a.mp3',
    hint: "Un souffle chaud, celui qu'on fait pour embuer une vitre, mais tenu comme une consonne.",
  },
  {
    letter: 'خ',
    digit: '5',
    name: 'kha',
    src: '/audio/alphabet/kha.mp3',
    hint: "Le seul son de la liste que le français frôle : la jota espagnole, le « ch » de Bach.",
  },
  {
    letter: 'ق',
    digit: '2',
    name: '2af',
    src: '/audio/alphabet/qaf.mp3',
    hint: "Au Caire, il disparaît et laisse un coup de glotte — le petit arrêt qu'on entend dans « oh-oh ».",
  },
];

/** Une teinte par son, dans l'ordre des autocollants de l'accueil. */
const TONES = ['pop-tone-grenade', 'pop-tone-gold', 'pop-tone-turquoise', 'pop-tone-saffron'];

export default function SoundSampler() {
  const [playing, setPlaying] = useState<string | null>(null);
  const hintId = useId();

  // Une seule lecture à la fois : cliquer sur une lettre coupe la précédente.
  // Les quatre sons sont gérés par ce composant unique, donc l'audio courant tient dans
  // une ref locale — pas besoin de la variable de module qu'utilise LetterAudioButton,
  // dont les instances sont, elles, dispersées dans un tableau markdown.
  const cache = useRef(new Map<string, HTMLAudioElement>());
  const current = useRef<HTMLAudioElement | null>(null);

  // Sans ce nettoyage, quitter la page pendant une lecture laisserait le son continuer.
  useEffect(() => {
    const playingNow = current;
    return () => {
      playingNow.current?.pause();
      playingNow.current = null;
    };
  }, []);

  function play(src: string) {
    let audio = cache.current.get(src);
    if (!audio) {
      audio = new Audio(src);
      audio.onended = () => setPlaying(null);
      cache.current.set(src, audio);
    }

    if (current.current && current.current !== audio) current.current.pause();

    if (current.current === audio && playing === src) {
      audio.pause();
      current.current = null;
      setPlaying(null);
      return;
    }

    audio.currentTime = 0;
    current.current = audio;
    setPlaying(src);
    audio.play().catch(() => setPlaying(null));
  }

  return (
    <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {SOUNDS.map((sound, i) => {
        const isPlaying = playing === sound.src;
        return (
          <li key={sound.src} className="rise" style={{ '--i': i } as React.CSSProperties}>
            {/*
              Pas d'`aria-label` : il ne reprenait pas le texte affiché (« 3 », « 3ayn »,
              « Écouter »), et qui pilote son appareil à la voix dit ce qu'il voit
              (WCAG 2.5.3, signalé par axe et Lighthouse). Le nom vient donc du contenu
              visible ; la phrase d'explication, trop longue pour un nom, passe en
              description (`aria-describedby`).
            */}
            <button
              type="button"
              onClick={() => play(sound.src)}
              aria-describedby={`${hintId}-${i}`}
              aria-pressed={isPlaying}
              className={`pop-card ${TONES[i % TONES.length]} w-full items-center text-center ${
                isPlaying ? 'sound-card-on' : ''
              }`}
            >
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--on)] bg-[var(--veil)]">
                {/* L'onde ne s'affiche que pendant la lecture : c'est le seul retour visuel
                    fiable quand le téléphone est en silencieux. */}
                {isPlaying && <span aria-hidden="true" className="sound-ripple" />}
                {/* Pas de `.arabic` : cette classe (hors couche) impose 1.25em et écrasait la taille. */}
                <span className="pop-sticker-letter relative" aria-hidden="true">
                  {sound.letter}
                </span>
              </span>

              <span className="mt-3 flex items-center gap-2">
                <span className="pop-chip tabular">{sound.digit}</span>
                <span className="display text-lg">{sound.name}</span>
              </span>

              <span
                id={`${hintId}-${i}`}
                aria-hidden="true"
                className="mt-2 text-sm font-medium leading-relaxed"
              >
                {sound.hint}
              </span>

              <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-bold">
                <span aria-hidden="true">{isPlaying ? '❚❚' : '▶'}</span>
                {isPlaying ? 'En cours' : 'Écouter'}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
