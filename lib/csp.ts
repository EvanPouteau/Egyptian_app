/**
 * Politique de sécurité du contenu (CSP), posée sur chaque page par `proxy.ts`.
 *
 * Inventaire fait avant de l'écrire (03/11/2026) : le navigateur ne charge rien d'ailleurs
 * que du site. Les polices sont servies par Next (`next/font`), Supabase n'est appelé que
 * par le serveur (aucun import de lib/supabase/client.ts côté client), le tuteur passe par
 * `/api/chat` et la recherche par `/api/vocab`. D'où `'self'` presque partout.
 *
 * Scripts : un nonce par requête, et `'strict-dynamic'` pour les morceaux que Next charge
 * ensuite lui-même. Next lit le nonce dans l'en-tête de la requête et le pose sur ses
 * propres scripts ; le script anti-flash du thème (app/layout.tsx) le reçoit par `x-nonce`.
 * Les données structurées (`application/ld+json`) ne sont pas exécutées : la CSP ne les
 * concerne pas.
 *
 * Styles : `'unsafe-inline'` reste nécessaire, React écrit des attributs `style` (positions
 * du chemin des leçons, jauges). Une injection de style ne permet pas d'exécuter du code.
 *
 * En développement seulement, `'unsafe-eval'` : React et Turbopack en ont besoin pour les
 * traces d'erreur et le rechargement à chaud.
 *
 * Pas de `upgrade-insecure-requests` : Vercel impose déjà HTTPS (HSTS), et `next start` en
 * local sert le site en HTTP, où la directive ferait échouer les ressources.
 */
export function buildCsp(nonce: string, dev = false): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    // `data:` : motifs de fond en SVG dans le CSS ; `blob:` : l'export RGPD des données.
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `media-src 'self'`,
    `connect-src 'self'`,
    `manifest-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join('; ');
}

/** Un nonce imprévisible : 128 bits aléatoires, en base64. */
export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
