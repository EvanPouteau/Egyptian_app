import { describe, expect, it } from 'vitest';
import { judgeAnswer, normalizeLoose, normalizeStrict } from '@/lib/arabizi';

describe('normalizeStrict', () => {
  it('retire casse, accents et séparateurs', () => {
    expect(normalizeStrict('Ma-ro7t-sh')).toBe('maro7tsh');
    expect(normalizeStrict('el beit')).toBe(normalizeStrict('el-beit'));
  });
  it('convertit la translittération académique', () => {
    expect(normalizeStrict('ʿarabi')).toBe('3arabi');
    expect(normalizeStrict('ḥabībī')).toBe('7abibi');
    expect(normalizeStrict('šukran')).toBe('shukran');
    expect(normalizeStrict('ḫalāṣ')).toBe('khalas');
    // Même saisie, mais déjà décomposée (h + point souscrit).
    expect(normalizeStrict('ḥabibi')).toBe('7abibi');
  });
  it('garde le retrait des accents français', () => {
    expect(normalizeStrict('Écrire')).toBe('ecrire');
  });
});

describe('normalizeLoose', () => {
  it('fusionne les variantes de transcription', () => {
    expect(normalizeLoose('baroo7')).toBe(normalizeLoose('barou7'));
    expect(normalizeLoose('baroo7')).toBe(normalizeLoose('barooh'));
  });
});

describe('judgeAnswer', () => {
  it('exact à la casse, la ponctuation et les traits d’union près', () => {
    expect(judgeAnswer('maro7tsh', 'Ma-ro7t-sh')).toBe('exact');
  });
  it('close pour une variante connue', () => {
    expect(judgeAnswer('habibi', '7abibi')).toBe('close');
    expect(judgeAnswer('baru7', 'baroo7')).toBe('close');
  });
  it('accepte les variantes du corpus au même niveau', () => {
    expect(judgeAnswer('ana baroo7', 'baroo7', ['ana baroo7'])).toBe('exact');
  });
  it('wrong pour autre chose, ou une réponse vide', () => {
    expect(judgeAnswer('bokra', 'embare7')).toBe('wrong');
    expect(judgeAnswer(' - ', 'bokra')).toBe('wrong');
  });
});
