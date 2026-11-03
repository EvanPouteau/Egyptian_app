import Link from 'next/link';
import SoundSampler from '@/components/SoundSampler';
import WordMarquee from '@/components/WordMarquee';
import TutorMascot from '@/components/TutorMascot';
import { getContentCounts } from '@/lib/content';
import JsonLd from '@/components/JsonLd';
import { SITE } from '@/lib/site-config';
import { websiteData } from '@/lib/structured-data';

export const dynamic = 'force-dynamic';

/** Ce qu'on sait faire à la fin de chaque palier, en une phrase concrète. */
const LEVELS = [
  {
    level: 'A1',
    tone: 'pop-tone-turquoise',
    title: 'Les fondations',
    text: "Lire l'alphabet, écrire en Arabizi, saluer, compter, commander un café sans passer à l'anglais.",
  },
  {
    level: 'A2',
    tone: 'pop-tone-gold',
    title: 'La vie courante',
    text: 'Le passé et le futur, marchander au souk, raconter sa journée, poser une question et comprendre la réponse.',
  },
  {
    level: 'B1',
    tone: 'pop-tone-grenade',
    title: "L'aisance",
    text: "Suivre une conversation entre amis, saisir l'humour cairote, changer de registre selon la personne en face.",
  },
  {
    level: 'B2',
    tone: 'pop-tone-indigo',
    title: 'Le débat',
    text: 'Nuancer, argumenter, suivre une série égyptienne sans sous-titres et une discussion politique au café.',
  },
];

/** Les quatre lettres de l'Arabizi, en autocollants dans l'ouverture. */
const STICKERS = [
  { letter: 'ع', digit: '3', tone: 'pop-tone-grenade' },
  { letter: 'ح', digit: '7', tone: 'pop-tone-gold' },
  { letter: 'خ', digit: '5', tone: 'pop-tone-turquoise' },
  { letter: 'ق', digit: '2', tone: 'pop-tone-saffron' },
];

export default async function LandingPage() {
  const {
    modules: moduleCount,
    lessons: lessonCount,
    vocab: vocabCount,
  } = await getContentCounts();

  return (
    // `overflow-x-clip` : le bandeau de mots est plus large que l'écran et penché ; sans
    // cette coupe, il faisait défiler toute la page de 17 px à 375 px (mesuré). `clip` et non
    // `hidden` : pas de conteneur de défilement, donc rien ne casse les ancres (#sons).
    <main className="overflow-x-clip pb-6">
      <JsonLd data={websiteData(SITE.description)} />

      {/* ---------------------------------------------------------------- Ouverture */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-14 pt-12 sm:px-8 md:grid-cols-[1.2fr_0.8fr] md:pt-16">
        <div>
          {/* Pas d'animation d'entrée sur le titre et l'introduction : un élément encore
              à opacité 0 au premier affichage n'est pas compté par le navigateur comme
              « contenu principal ». Lighthouse retenait alors le petit bouton Connexion et
              datait l'affichage complet à 2,2 s au lieu de ~1 s (mesuré). */}
          <p className="cartouche">Dialecte cairote</p>

          <h1 className="display mt-5 text-[2.7rem] leading-[1.02] sm:text-7xl">
            Parler l&apos;arabe{' '}
            {/* La virgule reste collée au mot surligné : sinon elle ouvrait la ligne suivante. */}
            <span className="whitespace-nowrap">
              <span className="pop-hl pop-tone-gold">du Caire</span>,
            </span>{' '}
            pas celui des{' '}
            <span className="whitespace-nowrap">
              <span className="pop-hl pop-tone-turquoise">manuels</span>.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
            Un parcours en {moduleCount} modules, {lessonCount} leçons et {vocabCount} mots,
            de l&apos;alphabet jusqu&apos;au débat : le <em>gim</em> égyptien, le <em>qaf</em>{' '}
            qui devient coup de glotte, et l&apos;Arabizi que les Égyptiens écrivent vraiment.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/modules" className="btn-sand px-6 py-3 text-base">
              Commencer par le début
            </Link>
            <Link href="/placement-test" className="btn-outline px-6 py-3 text-base">
              Tester mon niveau
            </Link>
          </div>
        </div>

        {/* Le collage mène à la section des sons, où chaque lettre se joue : un seul lien
            plutôt que quatre faux boutons. */}
        {/* Le nom du lien vient de son contenu visible (« ع = 3 »…), précédé d'une phrase
            réservée aux lecteurs d'écran. Un `aria-label` séparé ne reprenait pas ce qu'on
            voit (WCAG 2.5.3, signalé par axe et Lighthouse). */}
        <Link
          href="#sons"
          className="rise mx-auto grid max-w-[20rem] grid-cols-2 gap-4 rounded-[2rem] p-2"
          style={{ '--i': 2 } as React.CSSProperties}
        >
          <span className="sr-only">Écouter les quatre sons de l’Arabizi : </span>
          {STICKERS.map((s, i) => (
            <span
              key={s.digit}
              className={`pop-sticker ${s.tone}`}
              style={{ '--i': i } as React.CSSProperties}
            >
              <span className="pop-sticker-letter">{s.letter}</span>
              <span className="pop-sticker-digit">= {s.digit}</span>
            </span>
          ))}
        </Link>
      </section>

      <WordMarquee />

      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        {/* --------------------------------------------------------- Chiffres clés */}
        <ul className="mt-16 grid grid-cols-3 gap-3 sm:gap-5" aria-label="Le parcours en chiffres">
          <li className="pop-blob pop-tone-gold">
            <strong>{moduleCount}</strong> modules
          </li>
          <li className="pop-blob pop-tone-turquoise">
            <strong>{lessonCount}</strong> leçons
          </li>
          <li className="pop-blob pop-tone-grenade">
            <strong>{vocabCount}</strong> mots
          </li>
        </ul>

        {/* -------------------------------------------- Les quatre sons de l'Arabizi */}
        <section id="sons" className="mt-24 scroll-mt-24" aria-labelledby="sons-titre">
          <p className="cartouche">À écouter</p>
          <h2 id="sons-titre" className="display mt-4 text-4xl sm:text-5xl">
            Pourquoi des <span className="pop-hl pop-tone-saffron">chiffres</span> au milieu des
            mots ?
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-[var(--muted)]">
            Parce que quatre sons arabes n&apos;ont aucune lettre latine pour les écrire. Les
            Égyptiens ont fait le plus simple : ils ont pris le chiffre dont la forme ressemble
            à la lettre. Touchez une carte pour l&apos;entendre — c&apos;est plus rapide que de
            les lire.
          </p>

          <SoundSampler />
        </section>

        {/* ------------------------------------------------------------ Parcours */}
        <section className="mt-24" aria-labelledby="parcours">
          <p className="cartouche">Le chemin</p>
          <h2 id="parcours" className="display mt-4 text-4xl sm:text-5xl">
            De <span className="pop-hl pop-tone-gold">zéro</span> au débat
          </h2>

          <ol className="mt-8 grid gap-4">
            {LEVELS.map((step, i) => (
              <li
                key={step.level}
                className="rise flex items-center gap-4 rounded-[2rem] border-2 border-[var(--line-strong)] bg-[var(--surface)] py-3 pl-3 pr-5 sm:rounded-full"
                style={{ '--i': i } as React.CSSProperties}
              >
                <span
                  className={`${step.tone} display grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--tone)] text-lg text-[var(--on)]`}
                >
                  {step.level}
                </span>
                <span className="leading-snug">
                  <strong>{step.title}</strong>
                  <span className="text-[var(--muted)]"> — {step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* -------------------------------------------------------- Fonctionnement */}
        <section className="mt-24" aria-labelledby="methode">
          <p className="cartouche">La méthode</p>
          <h2 id="methode" className="display mt-4 text-4xl sm:text-5xl">
            Trois habitudes, pas trente fonctionnalités
          </h2>

          <ul className="mt-8 grid gap-5 sm:grid-cols-3">
            <Feature
              tone="pop-tone-turquoise"
              title="Un chemin, pas une liste"
              text="Les leçons se suivent le long d'un chemin. Un halo marque toujours l'étape où vous en êtes : on retrouve sa place sans chercher."
              icon={
                <>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M4 15c2.5-2.5 4.5-1 6.5 0s4 1.5 5.5-1" />
                </>
              }
            />
            <Feature
              tone="pop-tone-gold"
              title="On vérifie ce qui reste"
              text="Chaque module se termine par un quiz. Il faut 70 % pour le valider — et avoir lu toutes les leçons. Cocher ne suffit pas."
              icon={
                <>
                  <path d="M12 3 21 19H3Z" />
                  <path d="M12 3v16" />
                </>
              }
            />
            <Feature
              tone="pop-tone-indigo"
              title="Cinq minutes par jour"
              text="La leçon du jour retire au hasard des mots de vos leçons déjà lues. Elle ne vous demande jamais ce que vous n'avez pas encore vu."
              icon={
                <>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </>
              }
            />
          </ul>
        </section>

        {/* ------------------------------------------------------------- Reprise */}
        <section
          className="pop-tone-indigo mt-24 rounded-[2.5rem] border-[3px] border-[var(--gold)] bg-[var(--tone)] px-6 py-12 text-center text-[var(--on)] shadow-[8px_8px_0_var(--gold)]"
          aria-labelledby="yalla"
        >
          <h2 id="yalla" className="display text-4xl sm:text-5xl">
            Yalla, on commence ?
          </h2>
          <p className="mx-auto mt-3 max-w-md">
            Le contenu est consultable sans compte. Créez-en un seulement quand vous voudrez
            garder votre progression.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/modules/module-01" className="btn-sand">
              Ouvrir la première leçon
            </Link>
            <Link href="/entrainement" className="btn-outline">
              S’entraîner
            </Link>
            <Link href="/modules/conjugations-core" className="btn-outline">
              Référence verbes
            </Link>
          </div>
        </section>
      </div>

      <TutorMascot />
    </main>
  );
}

function Feature({
  tone,
  title,
  text,
  icon,
}: {
  tone: string;
  title: string;
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <li className={`pop-card ${tone}`}>
      <span aria-hidden="true" className="pop-num">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {icon}
        </svg>
      </span>
      <h3 className="display mt-4 text-xl">{title}</h3>
      <p className="mt-1.5 text-sm font-medium leading-relaxed">{text}</p>
    </li>
  );
}
