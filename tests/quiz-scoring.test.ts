import { describe, expect, it } from 'vitest';
import { assignLevel, breakdown, scorePercent, type Answer } from '@/lib/quiz-scoring';

const a = (difficulty: string, correct: boolean): Answer => ({
  question_id: Math.random().toString(),
  given: '',
  correct,
  difficulty,
});

describe('scorePercent', () => {
  it('arrondit le pourcentage de bonnes réponses', () => {
    expect(scorePercent([a('A1', true), a('A1', true), a('A1', false)])).toBe(67);
  });
  it('vaut 0 sans réponse', () => {
    expect(scorePercent([])).toBe(0);
  });
});

describe('assignLevel', () => {
  it('valide un palier à partir de 60 %', () => {
    const answers = [a('A1', true), a('A1', true), a('A1', true), a('A1', false), a('A1', false)];
    expect(assignLevel(answers)).toBe('A1');
    expect(assignLevel([...answers, a('A2', true), a('A2', true), a('A2', false)])).toBe('A2');
  });

  it("s'arrête au premier palier manqué, même si un palier suivant est réussi", () => {
    const answers = [a('A1', true), a('A2', false), a('A2', false), a('B1', true), a('B2', true)];
    expect(assignLevel(answers)).toBe('A1');
  });

  it('reste en A1 quand tout est faux', () => {
    expect(assignLevel([a('A1', false), a('A2', false)])).toBe('A1');
  });
});

describe('breakdown', () => {
  it('détaille chaque palier présent, dans l’ordre', () => {
    expect(breakdown([a('B1', true), a('A1', false), a('A1', true)])).toEqual([
      { level: 'A1', correct: 1, total: 2 },
      { level: 'B1', correct: 1, total: 1 },
    ]);
  });
});
