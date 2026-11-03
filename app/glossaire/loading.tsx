/**
 * Écran de chargement du glossaire, à la place de celui du site (app/loading.tsx).
 *
 * Les 544 mots font la page la plus lourde du site : le navigateur a le temps d'afficher
 * l'écran d'attente avant la liste. Celui du site ne mesure que 540 px, le pied de page
 * apparaissait donc juste dessous, puis la liste (30 000 px) le chassait hors de l'écran —
 * un saut de mise en page de 0,22 mesuré à chaque chargement sur ordinateur. Celui-ci
 * occupe toute la hauteur de l'écran : le pied de page reste hors de vue jusqu'à la fin.
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
