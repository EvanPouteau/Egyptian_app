'use server';

import { createClient } from '@/lib/supabase/server';
import { getDailyLesson, todayKey } from '@/lib/daily';
import { grade } from '@/lib/grading';
import { getStreak, type Streak } from '@/lib/streak';
import type { Answer } from '@/lib/quiz-scoring';

/**
 * Enregistre la leçon du jour et renvoie la série à jour.
 *
 * L'insertion peut échouer sur la contrainte unique (user_id, review_date) si l'apprenant
 * rejoue la même journée — c'est le comportement voulu et non une erreur : la première
 * tentative du jour fait foi, et l'XP n'est donc versée qu'une fois. La série, elle, est
 * recalculée dans les deux cas : rejouer ne l'incrémente pas une deuxième fois, mais
 * l'écran de résultat doit quand même pouvoir l'afficher.
 *
 * Le score est recalculé sur la leçon du jour reconstruite côté serveur : elle est
 * déterministe (graine = utilisateur + date), le serveur retrouve donc les mêmes questions.
 * Si une leçon a été marquée lue entre-temps, le vivier change et certaines questions ne se
 * retrouvent plus : seules celles qui se retrouvent comptent.
 */
export async function saveDailyReview(
  submitted: { answers: Pick<Answer, 'question_id' | 'given'>[] }
): Promise<Streak | undefined> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { questions } = await getDailyLesson(user.id);
  const result = grade(submitted, questions, questions.length);
  if (result.answers.length === 0) return getStreak(user.id);

  const { error } = await supabase.from('daily_reviews').insert({
    user_id: user.id,
    review_date: todayKey(),
    score: result.score,
    item_count: result.answers.length,
  });

  // 23505 = violation de contrainte unique : la leçon du jour était déjà faite.
  if (error) {
    if (error.code !== '23505') throw new Error(error.message);
    return getStreak(user.id);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('xp_points')
    .eq('id', user.id)
    .maybeSingle<{ xp_points: number }>();

  // L'XP du jour suit le score : réviser sérieusement rapporte plus que cliquer au hasard,
  // mais l'essentiel est d'avoir ouvert la leçon.
  await supabase
    .from('profiles')
    .update({ xp_points: (profile?.xp_points ?? 0) + Math.round(result.score / 10) })
    .eq('id', user.id);

  // Pas de `revalidatePath` ici : /daily, /dashboard et /profile sont déjà
  // `force-dynamic`, donc toujours frais à la prochaine navigation — revalider aurait été
  // sans effet sur ce point. Mesuré : l'appeler déclenchait en revanche un rafraîchissement
  // automatique de LA PAGE COURANTE dès que l'action serveur se résolvait. Comme /daily
  // bascule sa branche de rendu sur `alreadyDone`, ce rafraîchissement démontait l'écran
  // de résultat (mots ratés, série) moins d'une seconde après son affichage, pour le
  // remplacer par la carte « déjà faite ». Les autres pages du site ne branchent pas leur
  // rendu de cette façon après un envoi, elles n'ont donc jamais révélé le problème.
  return getStreak(user.id);
}
