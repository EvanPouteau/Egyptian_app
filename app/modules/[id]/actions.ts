'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getModuleLessons } from '@/lib/content';
import { deriveStatus } from '@/lib/progress';

/**
 * Marque une leçon comme lue, ou annule ce marquage.
 *
 * Après chaque changement on recalcule le statut du module : c'est ce qui permet à un
 * module de passer à « terminé » au moment où la dernière leçon est lue, sans que
 * l'apprenant ait à repasser le quiz.
 *
 * Le rang doit être celui d'une leçon du module : le statut compte les leçons lues, et
 * marquer des rangs inventés (999, 1000…) aurait suffi à « terminer » un module.
 */
export async function toggleLessonRead(
  moduleId: string,
  orderIndex: number,
  read: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const lessons = await getModuleLessons(moduleId);
  if (!lessons.some((l) => l.order_index === orderIndex)) return;

  if (read) {
    await supabase.from('lesson_completions').upsert(
      { user_id: user.id, module_id: moduleId, lesson_order_index: orderIndex },
      { onConflict: 'user_id,module_id,lesson_order_index' }
    );
  } else {
    await supabase
      .from('lesson_completions')
      .delete()
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .eq('lesson_order_index', orderIndex);
  }

  await refreshModuleStatus(moduleId);
  revalidatePath('/', 'layout');
}

/** Recalcule `user_progress.status` à partir des leçons lues et du meilleur score. */
export async function refreshModuleStatus(moduleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const [{ count: lessonsTotal }, { count: lessonsRead }, { data: progress }] =
    await Promise.all([
      supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('module_id', moduleId),
      supabase
        .from('lesson_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('module_id', moduleId),
      supabase
        .from('user_progress')
        .select('best_score, completed_at')
        .eq('user_id', user.id)
        .eq('module_id', moduleId)
        .maybeSingle<{ best_score: number | null; completed_at: string | null }>(),
    ]);

  const status = deriveStatus(
    lessonsRead ?? 0,
    lessonsTotal ?? 0,
    progress?.best_score ?? null
  );

  await supabase.from('user_progress').upsert(
    {
      user_id: user.id,
      module_id: moduleId,
      status,
      best_score: progress?.best_score ?? null,
      completed_at:
        status === 'completed'
          ? (progress?.completed_at ?? new Date().toISOString())
          : null,
    },
    { onConflict: 'user_id,module_id' }
  );
}
