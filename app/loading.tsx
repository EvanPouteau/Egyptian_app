/**
 * Écran de chargement, affiché dès le clic pendant que le serveur prépare la page.
 *
 * Sans lui, un clic sur un lien laissait l'ancienne page figée jusqu'à la réponse
 * complète du serveur : c'est ce qui donnait l'impression d'un site lent au changement de
 * page, même quand la réponse arrivait en quelques centaines de millisecondes. Next le
 * précharge avec les liens visibles, il s'affiche donc sans aller-retour.
 *
 * Un squelette aux formes du site (titre, cartes) plutôt qu'une roue : la page qui arrive
 * se met en place sans que tout saute.
 *
 * Haut d'un écran (`min-h-[100svh]`) : avec ses 540 px, le pied de page apparaissait
 * dessous quand le serveur tardait (démarrage à froid), puis la page le chassait de l'écran
 * — saut de mise en page de 0,22 mesuré sur ordinateur. Presque toutes les pages font plus
 * d'un écran ; pour les rares plus courtes (connexion, inscription), le pied de page remonte
 * à l'arrivée du contenu, un saut bien plus petit.
 */
export default function Loading() {
  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-6xl px-4 pb-20 pt-10 sm:px-8" aria-busy="true">
      <p role="status" className="sr-only">
        Chargement de la page…
      </p>

      <div aria-hidden="true">
        <span className="skeleton block h-7 w-36 rounded-full" />
        <span className="skeleton mt-5 block h-12 w-full max-w-xl rounded-2xl" />
        <span className="skeleton mt-3 block h-5 w-full max-w-md rounded-full" />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className="skeleton skeleton-card block h-44"
              style={{ '--i': i } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
