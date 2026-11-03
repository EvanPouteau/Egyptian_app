'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getPlacementQuestions } from '@/lib/content';
import { grade } from '@/lib/grading';
import { assignLevel, type Answer } from '@/lib/quiz-scoring';

/**
 * Enregistre le résultat du test de positionnement.
 *
 * Le test reste jouable hors connexion (il est optionnel selon l'architecture) : sans
 * session, on affiche le résultat sans rien écrire.
 *
 * Le niveau et le score sont recalculés sur les questions du serveur (lib/grading.ts),
 * jamais repris de ce qu'envoie le navigateur.
 */
export async function savePlacement(submitted: { answers: Pick<Answer, 'question_id' | 'given'>[] }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const questions = (await getPlacementQuestions()).filter((q) => q.options?.choices?.length);
  const result = grade(submitted, questions, questions.length);
  if (result.answers.length === 0) return;

  const level = assignLevel(result.answers);

  await supabase.from('profiles').update({ current_level: level }).eq('id', user.id);

  await supabase.from('quiz_attempts').insert({
    user_id: user.id,
    module_id: null, // null = test de positionnement, pas un module
    score: result.score,
    answers: result.answers,
  });

  revalidatePath('/', 'layout');
}
