import Link from 'next/link';
import LevelBadge from './LevelBadge';
import NavLink from './NavLink';
import ThemeToggle from './ThemeToggle';
import VocabSearch from './VocabSearch';
import { getProfile } from '@/lib/auth';

export default async function Navbar() {
  const profile = await getProfile();

  return (
    <nav className="sticky top-0 z-40 border-b-2 border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-md">
      {/* Frise en quatre couleurs : grenade, or, turquoise, indigo — la palette du site. */}
      <div className="frieze" />

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-8 sm:py-3">
        <Link href="/" className="group flex items-center gap-2.5">
          {/*
            Marque : le ʿayn, la lettre qui n'existe pas en français et qui ouvre le mot
            « ʿarabi ». Elle sert déjà d'icône d'écran d'accueil (public/icons) — la
            reprendre ici fait que l'onglet, l'icône iOS et l'en-tête racontent la même
            chose. Pastille ronde grenade, penchée comme un autocollant.
          */}
          <span
            aria-hidden="true"
            className="pop-tone-grenade flex h-10 w-10 shrink-0 -rotate-6 items-center justify-center rounded-full border-2 border-[var(--line-strong)] bg-[var(--tone)] text-xl leading-none text-[var(--on)] transition-transform duration-200 group-hover:rotate-6"
          >
            ع
          </span>
          {/* Le nom disparaît sous 640 px : à 375 px, il ne restait plus assez de place
              pour les liens sans que la barre passe à deux lignes. La marque suffit à
              l'œil, mais pas à un lecteur d'écran : `sr-only` le masque sans le retirer.
              Avec `hidden`, le lien n'avait plus aucun nom sur mobile (axe, Lighthouse :
              « Links must have discernible text », sur toutes les pages). */}
          <span className="display sr-only text-xl sm:not-sr-only">Arabe égyptien</span>
        </Link>

        {/* gap-2 sous 640 px : avec les cibles de 44 px, gap-3.5 faisait déborder la barre de
            5 px à 375 px (mesuré). */}
        <div className="flex items-center gap-2 text-sm font-semibold sm:gap-5">
          <VocabSearch />
          <NavLink href="/modules">Modules</NavLink>
          {/* L'entraînement n'apparaît qu'à 1024 px : en dessous, la barre est pleine. Il
              reste atteignable par la page des modules, le tableau de bord et le pied de
              page. */}
          <NavLink href="/entrainement" className="hidden lg:inline">
            S’entraîner
          </NavLink>

          {profile ? (
            <>
              <NavLink href="/daily">Du jour</NavLink>
              {/* Repoussé à 1024 px : à 768 px, la barre de recherche prend la place que
                  ce lien occupait. Le tableau de bord reste atteignable par le lien de
                  profil. */}
              <NavLink href="/dashboard" className="hidden lg:inline">
                Tableau de bord
              </NavLink>
              <ThemeToggle />
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-full transition-opacity hover:opacity-80"
              >
                <LevelBadge level={profile.current_level} />
                <span className="hidden max-w-28 truncate text-[var(--muted)] sm:inline">
                  {profile.display_name ?? 'Mon profil'}
                </span>
              </Link>
            </>
          ) : (
            <>
              <ThemeToggle />
              {/* Libellé court sous 640 px : avec « Se connecter », la barre dépassait à
                  375 px une fois la recherche ajoutée (mesuré). */}
              <Link href="/auth/login" className="btn-outline shrink-0 whitespace-nowrap px-3.5 py-2 sm:px-4">
                <span className="sm:hidden">Connexion</span>
                <span className="hidden sm:inline">Se connecter</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
