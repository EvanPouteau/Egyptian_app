import 'server-only';
import { z } from 'zod';
import { scorePercent, type Answer } from '@/lib/quiz-scoring';

/**
 * Correction d'une tentative CÔTÉ SERVEUR.
 *
 * Le navigateur corrige déjà chaque réponse pour l'afficher sur-le-champ, mais ce qu'il
 * envoie à la fin ne fait pas foi : une action serveur s'appelle avec n'importe quel
 * argument, et le serveur enregistrait tel quel le `score` reçu. Un score de 100 000
 * valait 99 900 points d'XP. Ici, seuls l'identifiant de la question et le choix
 * donné sont repris ; la justesse et le score sont recalculés avec le corrigé du serveur.
 *
 * Limite assumée : les bonnes réponses sont dans la page (le retour immédiat en a besoin),
 * et chacun peut écrire dans ses propres lignes avec la clé publique. Tricher reste donc
 * possible pour qui s'en donne la peine, sur son seul compte — il n'y a pas de classement.
 */

const submissionSchema = z.object({
  answers: z
    .array(z.object({ question_id: z.string().max(100), given: z.string().max(500) }))
    .max(100),
});

/** Ce que le serveur sait d'une question : sa bonne réponse et son palier. */
export type AnswerKey = { id: string; correct_answer: string; difficulty: string | null };

/**
 * Corrige les réponses reçues contre le corrigé `key`.
 *
 * Écartées : une forme invalide (tentative vide), une question absente du corrigé, une
 * question déjà répondue, et tout ce qui dépasse `max` réponses — sans quoi on pourrait
 * soumettre toute la banque d'un module pour noyer ses erreurs.
 */
export function grade(
  submission: unknown,
  key: readonly AnswerKey[],
  max: number
): { answers: Answer[]; score: number } {
  const parsed = submissionSchema.safeParse(submission);
  if (!parsed.success) return { answers: [], score: 0 };

  const byId = new Map(key.map((k) => [k.id, k]));
  const seen = new Set<string>();
  const answers: Answer[] = [];

  for (const { question_id, given } of parsed.data.answers) {
    if (answers.length === max) break;
    const k = byId.get(question_id);
    if (!k || seen.has(k.id)) continue;
    seen.add(k.id);
    answers.push({
      question_id: k.id,
      given,
      correct: given === k.correct_answer,
      difficulty: k.difficulty,
    });
  }

  return { answers, score: scorePercent(answers) };
}
