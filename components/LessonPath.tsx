import { Fragment } from 'react';
import Link from 'next/link';

export type PathLesson = {
  id: string;
  day: number | null;
  title: string;
  order_index: number;
  read: boolean;
};

export type PathSection = { name: string | null; lessons: PathLesson[] };

export type PathQuiz = {
  count: number;
  passed: boolean;
  bestScore: number | null;
  /** Toutes les leçons du module ont-elles été lues ? */
  unlocked: boolean;
};

/**
 * Serpentin : 8 positions qui montent puis redescendent, répétées le long du chemin.
 * Le motif ne se referme pas sur un cercle — il donne l'impression d'un sentier qui
 * louvoie entre les dunes plutôt que d'un zigzag mécanique.
 */
const WAVE = [0, 38, 62, 38, 0, -38, -62, -38];
const offsetAt = (index: number) => WAVE[index % WAVE.length];

/**
 * Traces de pas entre deux nœuds.
 *
 * Chaque empreinte est décalée latéralement par rapport à l'axe du sentier, alternativement
 * à gauche et à droite : c'est ce dédoublement qui fait lire « quelqu'un est passé par là »
 * plutôt qu'une simple ligne pointillée. Elles pâlissent vers l'arrière du pas.
 */
const STEPS = [
  { t: 0.18, side: -1, opacity: 0.9 },
  { t: 0.38, side: 1, opacity: 0.75 },
  { t: 0.58, side: -1, opacity: 0.6 },
  { t: 0.78, side: 1, opacity: 0.45 },
];

function Trail({ from, to }: { from: number; to: number }) {
  return (
    <li aria-hidden="true" className="flex flex-col items-center gap-2.5 py-2">
      {STEPS.map(({ t, side, opacity }) => (
        <span
          key={t}
          className="dune-node block h-2.5 w-2.5 rounded-full bg-[var(--gold)]"
          style={
            {
              '--offset': from + (to - from) * t + side * 7,
              opacity,
              transform: `translateX(calc(var(--offset) * var(--wave))) rotate(${side * 18}deg)`,
            } as React.CSSProperties
          }
        />
      ))}
    </li>
  );
}

export default function LessonPath({
  moduleId,
  sections,
  quiz,
}: {
  moduleId: string;
  sections: PathSection[];
  quiz: PathQuiz | null;
}) {
  const all = sections.flatMap((s) => s.lessons);
  // « Vous êtes ici » : la première leçon non lue. Sur un chemin de 19 étapes, sans ce
  // repère l'apprenant doit relire toutes les coches pour retrouver où il en était.
  const currentId = all.find((l) => !l.read)?.id ?? null;
  const lastId = all.at(-1)?.id ?? null;

  // Rang de chaque leçon sur le serpentin, calculé avant le rendu : une position dérivée
  // d'un compteur muté pendant le JSX dépendrait de l'ordre d'évaluation des `map`.
  const rankById = new Map(all.map((lesson, i) => [lesson.id, i]));

  return (
    <ol className="dune-path mt-8 flex flex-col items-center">
      {sections.map((section, si) => (
        <li key={si} className="w-full">
          {section.name && (
            <div className="egypt-rule my-7">
              <h2 className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                {section.name}
              </h2>
            </div>
          )}

          <ol className="flex flex-col items-center">
            {section.lessons.map((lesson) => {
              const rank = rankById.get(lesson.id)!;
              const offset = offsetAt(rank);
              const next = offsetAt(rank + 1);
              const isCurrent = lesson.id === currentId;
              const isLast = lesson.id === lastId;

              return (
                <Fragment key={lesson.id}>
                  <li
                    className="rise flex flex-col items-center"
                    // Décalage plafonné : sur un module de 19 leçons, un décalage non
                    // borné ferait apparaître la dernière dune plus d'une seconde après
                    // la première.
                    style={{ '--i': Math.min(rank, 8) } as React.CSSProperties}
                  >
                    {/* L'étiquette « vous êtes ici » double le halo pulsé : celui-ci
                        disparaît en mouvement réduit, et une couleur seule ne suffit
                        jamais à porter une information. */}
                    {isCurrent && (
                      <span
                        className="dune-node cartouche mb-2"
                        style={{ '--offset': offset } as React.CSSProperties}
                      >
                        Vous êtes ici
                      </span>
                    )}

                    {/* Le nom du lien commence par ce qui est affiché (le numéro), suivi
                        du titre réservé aux lecteurs d'écran. Un `aria-label` le remplaçait
                        sans reprendre le numéro visible : qui pilote à la voix en disant
                        « 3 » ne trouvait pas le lien (WCAG 2.5.3, signalé par Lighthouse). */}
                    <Link
                      href={`/modules/${moduleId}/${lesson.id}`}
                      className={`dune-node lesson-node ${
                        lesson.read ? 'node-done' : 'node-todo'
                      } ${isCurrent ? 'node-current' : ''}`}
                      style={{ '--offset': offset } as React.CSSProperties}
                    >
                      {/* Lue : une coche à la place du numéro. La couleur ne porte donc
                          jamais seule l'information. La coche, simple symbole, est tue :
                          « (lue) » la remplace dans le nom. */}
                      {lesson.read ? <span aria-hidden="true">✓</span> : <span>{rank + 1}</span>}
                      <span className="sr-only">
                        {`${lesson.read ? '' : ' : '}${lesson.day === null ? '' : `Jour ${lesson.day} — `}${lesson.title}${lesson.read ? ' (lue)' : ''}`}
                      </span>
                    </Link>

                    <div
                      className="dune-node mt-3 max-w-40 text-center"
                      style={{ '--offset': offset } as React.CSSProperties}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--malachite-text)]">
                        {lesson.day === null ? 'Étape' : `Jour ${lesson.day}`}
                      </p>
                      <p
                        className={`display mt-0.5 text-sm leading-snug ${
                          isCurrent ? 'text-[var(--ink)]' : 'text-[var(--muted)]'
                        }`}
                      >
                        {lesson.title}
                      </p>
                    </div>
                  </li>

                  {!isLast && <Trail from={offset} to={next} />}
                </Fragment>
              );
            })}
          </ol>
        </li>
      ))}

      {quiz && quiz.count > 0 && (
        <>
          <Trail from={offsetAt(all.length - 1)} to={0} />
          <li className="mt-2 flex flex-col items-center">
            <Link
              href={`/modules/${moduleId}/quiz`}
              aria-label={`Quiz du module, ${quiz.count} questions${quiz.passed ? ', réussi' : ''}`}
              className={`quiz-node ${quiz.passed ? 'quiz-node-passed' : ''} ${
                quiz.unlocked || quiz.passed ? '' : 'quiz-node-locked'
              }`}
            >
              <span aria-hidden="true">{quiz.passed ? '✓' : '✦'}</span>
            </Link>

            <p className="display mt-3 text-lg">Quiz du module</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {quiz.passed
                ? `Réussi à ${quiz.bestScore} %`
                : quiz.bestScore !== null
                  ? `Meilleur score : ${quiz.bestScore} %`
                  : `${quiz.count} questions`}
            </p>
            {!quiz.unlocked && !quiz.passed && (
              <p className="mt-1 max-w-56 text-center text-xs text-[var(--muted)] opacity-80">
                Accessible dès maintenant, mais il vaut mieux avoir lu les leçons.
              </p>
            )}
          </li>
        </>
      )}
    </ol>
  );
}
