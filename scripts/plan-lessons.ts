/**
 * Plan d'import des leçons d'un module (voir scripts/import-data.ts) : quelles leçons en
 * base garder, lesquelles ajouter, lesquelles supprimer.
 *
 * Appariement par rang (`order_index`) : une leçon qui garde son rang garde son UUID, donc
 * son adresse, et ses coches de lecture (lesson_completions, clé par rang).
 */
export function planLessons<L extends { order_index: number }>(
  existing: readonly { id: string; order_index: number }[],
  lessons: readonly L[]
) {
  const idByOrder = new Map(existing.map((l) => [l.order_index, l.id]));
  const wanted = new Set(lessons.map((l) => l.order_index));
  return {
    idByOrder,
    // Retirées : les rangs absents du JSON, et les éventuels doublons d'un même rang (seul
    // le dernier lu est gardé).
    removed: existing
      .filter((l) => !wanted.has(l.order_index) || idByOrder.get(l.order_index) !== l.id)
      .map((l) => l.id),
    kept: lessons.filter((l) => idByOrder.has(l.order_index)),
    added: lessons.filter((l) => !idByOrder.has(l.order_index)),
  };
}
