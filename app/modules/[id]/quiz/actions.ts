'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getQuizBank } from '@/lib/content';
import { grade } from '@/lib/grading';
import { QUIZ_SIZE, type Answer } from '@/lib/quiz-scoring';
import { refreshModuleStatus } from '../actions';

/**
 * Enregistre une tentative de quiz de module.
 *
 * L'XP est indexée sur la *progression du meilleur score*, pas sur le score de la tentative :
 * refaire un quiz déjà réussi ne rapporte rien, et il n'y a donc rien à farmer. Un module
 * repassé plus mal ne fait pas non plus perdre d'XP.
 *
 * Le score reçu est ignoré : il est recalculé sur la banque du module (lib/grading.ts).
 */
export async function saveAttempt(
  moduleId: string,
  submitted: { answers: Pick<Answer, 'question_id' | 'given'>[] }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Seules les questions jouables (à choix) comptent, comme sur la page du quiz.
  const bank = (await getQuizBank(moduleId)).filter((q) => q.options?.choices?.length);
  const result = grade(submitted, bank, QUIZ_SIZE);
  if (result.answers.length === 0) return;

  const { data: previous } = await supabase
    .from('user_progress')
    .select('best_score, completed_at')
    .eq('user_id', user.id)
    .eq('module_id', moduleId)
    .maybeSingle<{ best_score: number | null; completed_at: string | null }>();

  const oldBest = previous?.best_score ?? 0;
  const newBest = Math.max(oldBest, result.score);

  await supabase.from('quiz_attempts').insert({
    user_id: user.id,
    module_id: moduleId,
    score: result.score,
    answers: result.answers,
  });

  await supabase.from('user_progress').upsert(
    {
      user_id: user.id,
      module_id: moduleId,
      best_score: newBest,
      // Le statut est recalculé juste après : réussir le quiz ne suffit pas à terminer
      // un module, il faut aussi que toutes les leçons aient été lues.
      status: 'in_progress',
      completed_at: previous?.completed_at ?? null,
    },
    { onConflict: 'user_id,module_id' }
  );

  await refreshModuleStatus(moduleId);

  const gained = newBest - oldBest;
  if (gained > 0) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp_points')
      .eq('id', user.id)
      .maybeSingle<{ xp_points: number }>();

    await supabase
      .from('profiles')
      .update({ xp_points: (profile?.xp_points ?? 0) + gained })
      .eq('id', user.id);
  }

  revalidatePath('/', 'layout');
}
