import { describe, expect, it } from 'vitest';
import { buildCsp, newNonce } from '@/lib/csp';

const directive = (csp: string, name: string) =>
  csp.split('; ').find((d) => d.startsWith(`${name} `)) ?? '';

describe('buildCsp', () => {
  it('n’autorise que les scripts porteurs du nonce, jamais le code en ligne', () => {
    const script = directive(buildCsp('abc'), 'script-src');
    expect(script).toContain("'nonce-abc'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
  });

  it('n’ajoute unsafe-eval qu’en développement', () => {
    expect(directive(buildCsp('abc', true), 'script-src')).toContain("'unsafe-eval'");
  });

  it('interdit l’encadrement, les plugins et les connexions vers ailleurs', () => {
    const csp = buildCsp('abc');
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive(csp, 'object-src')).toBe("object-src 'none'");
    expect(directive(csp, 'connect-src')).toBe("connect-src 'self'");
  });
});

describe('newNonce', () => {
  it('change à chaque appel et ne contient que du base64', () => {
    const a = newNonce();
    expect(a).not.toBe(newNonce());
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });
});
