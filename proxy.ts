import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp, newNonce } from '@/lib/csp';

/**
 * Laisse passer la requête en y joignant la CSP (lib/csp.ts) : sur la requête, pour que
 * Next pose le nonce sur ses scripts et que la mise en page le lise (`x-nonce`) ; sur la
 * réponse, pour que le navigateur l'applique. Les en-têtes sont relus à chaque appel : la
 * session Supabase peut avoir réécrit les cookies de la requête entre-temps.
 */
function passer(request: NextRequest, nonce: string, csp: string) {
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

// Les Server Components ne peuvent pas écrire de cookies : sans ce proxy, un token
// expiré ne serait jamais rafraîchi et l'utilisateur serait déconnecté silencieusement.
// (Next 16 a renommé `middleware.ts` en `proxy.ts` ; le rôle est le même, mais il tourne
// désormais sous Node.js et non plus sous le runtime Edge.)
export async function proxy(request: NextRequest) {
  const nonce = newNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'development');

  // Pas de cookie de session Supabase (`sb-…-auth-token`) : visiteur anonyme, rien à
  // rafraîchir. On évite alors de monter un client pour chaque page et chaque préchargement.
  if (!request.cookies.getAll().some((c) => c.name.startsWith('sb-'))) {
    return passer(request, nonce, csp);
  }

  let response = passer(request, nonce, csp);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = passer(request, nonce, csp);
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Ni les fichiers statiques, ni les sons, ni robots/sitemap/manifeste : aucun n'a besoin
  // d'une session.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|txt|xml|json)$).*)',
  ],
};
