/**
 * Écran de chargement du glossaire, à la place de celui du site (app/loading.tsx).
 *
 * Les 544 mots font la page la plus lourde du site : le navigateur a le temps d'afficher
 * l'écran d'attente à chaque chargement. Comme celui du site, il occupe toute la hauteur de
 * l'écran pour que le pied de page reste hors de vue jusqu'à l'arrivée de la liste ; ses
 * formes sont celles du glossaire (recherche, lignes) plutôt que des cartes.
 */
export default function Loading() {
  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-3xl px-6 pb-20 pt-10 sm:px-8" aria-busy="true">
      <p role="status" className="sr-only">
        Chargement du glossaire…
      </p>

      <div aria-hidden="true">
        <span className="skeleton block h-4 w-36 rounded-full" />
        <span className="skeleton mt-3 block h-10 w-48 rounded-2xl" />
        <span className="skeleton mt-4 block h-5 w-full max-w-2xl rounded-full" />
        <span className="skeleton mt-2 block h-5 w-full max-w-xl rounded-full" />

        <span className="skeleton mt-8 block h-12 w-full rounded-2xl" />

        <div className="mt-6 grid gap-2">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className="skeleton block h-11 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
