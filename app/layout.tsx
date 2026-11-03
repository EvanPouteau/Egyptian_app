import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { SITE } from '@/lib/site-config';
import './globals.css';

// Polices de secours recalibrées à la main (« Geist Repli », « Bricolage Repli », voir
// globals.css) au lieu de celles que Next calcule : les siennes sont mesurées sur la graisse
// normale, et le texte changeait de nombre de lignes à l'arrivée de la vraie police (titre
// de l'accueil 3 → 4 lignes, introduction 5 → 4 à 412 px). Tout ce qui suivait sautait.
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  adjustFontFallback: false,
  fallback: ['Geist Repli', 'Arial', 'sans-serif'],
});

// Bricolage Grotesque : une grotesque d'affiche, ronde et franche, pour le style « Pop du
// Caire ». Elle porte les titres (`.display`, 800) et les chiffres mis en avant ; le corps
// de texte reste en Geist, plus sobre à la lecture longue.
const display = Bricolage_Grotesque({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['700', '800'],
  adjustFontFallback: false,
  fallback: ['Bricolage Repli'],
});

const DESCRIPTION =
  "Apprendre l'arabe égyptien du Caire, module par module : alphabet, Arabizi, grammaire et conjugaison, de A1 à B2.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: 'Arabe égyptien',
    // Les pages internes deviennent « Modules — Arabe égyptien » sans avoir à répéter
    // le suffixe dans chaque fichier.
    template: '%s — Arabe égyptien',
  },
  description: DESCRIPTION,
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/favicon-32x32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16x16.png?v=2', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-icon-180x180.png?v=2', sizes: '180x180' },
      { url: '/icons/apple-icon-152x152.png?v=2', sizes: '152x152' },
      { url: '/icons/apple-icon-167x167.png?v=2', sizes: '167x167' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    // Nom affiché sous l'icône sur l'écran d'accueil : plus court que le titre de la
    // page pour ne pas être tronqué.
    title: '3arabi',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: SITE.url,
    siteName: 'Arabe égyptien',
    title: 'Arabe égyptien — parler le dialecte du Caire',
    description: DESCRIPTION,
    images: [{ url: '/icons/icon-512x512.png?v=2', width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary',
    title: 'Arabe égyptien — parler le dialecte du Caire',
    description: DESCRIPTION,
    images: ['/icons/icon-512x512.png?v=2'],
  },
};

// Next.js exige un export `viewport` séparé pour themeColor depuis la v14 — le mettre
// dans `metadata` produit un avertissement de dépréciation.
//
// Deux valeurs plutôt qu'une : la barre du navigateur mobile prend la couleur du fond de
// page au lieu du bleu de l'icône. Une seule valeur laissait une bande marine au-dessus
// du papyrus, visible sur iOS comme un bandeau qui n'appartient pas au site.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf4e6' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1130' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // `suppressHydrationWarning` : le script anti-flash ci-dessous pose `data-theme` sur
    // <html> avant l'hydratation, React verrait sinon un attribut absent du rendu serveur.
    // L'exemption ne vaut que pour les attributs de cet élément, pas pour ses enfants.
    <html
      lang="fr"
      className={`${geistSans.variable} ${display.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        {/*
          Applique le thème choisi AVANT que la page ne s'affiche. Exécuté pendant l'analyse
          du HTML, donc avant toute peinture : sans lui, une page ouverte en thème sombre
          apparaîtrait blanche le temps que React monte, puis basculerait — le « flash »
          caractéristique. Ce script est délibérément inline et minuscule pour ne pas
          ajouter de requête bloquante.

          Sans préférence enregistrée, aucun attribut n'est posé : c'est alors la préférence
          système qui s'applique, via `color-scheme: light dark` (voir globals.css).
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
        {/*
          Lien d'évitement : au clavier, il évite de retraverser toute la navigation à
          chaque page. Invisible tant qu'il n'a pas le focus, il apparaît au premier Tab.
        */}
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        <Navbar />
        <div id="contenu" className="flex flex-1 flex-col">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
