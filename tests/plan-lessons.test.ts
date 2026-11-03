import { describe, expect, it } from 'vitest';
import { planLessons } from '@/scripts/plan-lessons';

const L = (order_index: number) => ({ order_index, title: `L${order_index}` });

describe('planLessons', () => {
  it('garde l’UUID des leçons dont le rang existe déjà', () => {
    const p = planLessons(
      [
        { id: 'a', order_index: 0 },
        { id: 'b', order_index: 1 },
      ],
      [L(0), L(1)]
    );
    expect(p.kept.map((l) => p.idByOrder.get(l.order_index))).toEqual(['a', 'b']);
    expect(p.added).toEqual([]);
    expect(p.removed).toEqual([]);
  });

  it('ajoute les rangs nouveaux et retire les rangs disparus', () => {
    const p = planLessons(
      [
        { id: 'a', order_index: 0 },
        { id: 'c', order_index: 2 },
      ],
      [L(0), L(1)]
    );
    expect(p.added.map((l) => l.order_index)).toEqual([1]);
    expect(p.removed).toEqual(['c']);
  });

  it('retire les doublons d’un même rang', () => {
    const p = planLessons(
      [
        { id: 'a', order_index: 0 },
        { id: 'a-bis', order_index: 0 },
      ],
      [L(0)]
    );
    expect(p.removed).toEqual(['a']);
    expect(p.idByOrder.get(0)).toBe('a-bis');
  });
});
