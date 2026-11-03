import { describe, expect, it } from 'vitest';
import { grade, type AnswerKey } from '@/lib/grading';

const key: AnswerKey[] = [
  { id: 'q1', correct_answer: 'bokra', difficulty: 'A1' },
  { id: 'q2', correct_answer: 'Demain', difficulty: 'A1' },
  { id: 'q3', correct_answer: 'ahwa', difficulty: 'A2' },
];

describe('grade', () => {
  it('recalcule la justesse et le score avec le corrigé du serveur', () => {
    const r = grade(
      {
        answers: [
          { question_id: 'q1', given: 'bokra', correct: false },
          { question_id: 'q2', given: 'Hier', correct: true },
        ],
        score: 100_000,
      },
      key,
      10
    );
    expect(r.answers.map((a) => a.correct)).toEqual([true, false]);
    expect(r.score).toBe(50);
  });

  it('reprend le palier du corrigé, pas celui envoyé', () => {
    const r = grade({ answers: [{ question_id: 'q3', given: 'ahwa', difficulty: 'B2' }] }, key, 10);
    expect(r.answers[0].difficulty).toBe('A2');
  });

  it('écarte les questions inconnues et les doublons', () => {
    const r = grade(
      {
        answers: [
          { question_id: 'q1', given: 'bokra' },
          { question_id: 'q1', given: 'bokra' },
          { question_id: 'inventée', given: 'x' },
          { question_id: 'q2', given: 'Hier' },
        ],
      },
      key,
      10
    );
    expect(r.answers.map((a) => a.question_id)).toEqual(['q1', 'q2']);
    expect(r.score).toBe(50);
  });

  it("s'arrête au nombre de questions d'une tentative", () => {
    const r = grade(
      { answers: key.map((k) => ({ question_id: k.id, given: k.correct_answer })) },
      key,
      2
    );
    expect(r.answers).toHaveLength(2);
  });

  it('traite une forme invalide comme une tentative vide', () => {
    for (const bad of [null, 'x', { answers: 'x' }, { answers: [{ question_id: 1 }] }]) {
      expect(grade(bad, key, 10)).toEqual({ answers: [], score: 0 });
    }
  });
});
