/**
 * Informations légales du site.
 *
 * ⚠️ LES VALEURS MARQUÉES « À REMPLIR » DOIVENT ÊTRE COMPLÉTÉES AVANT TOUTE MISE EN LIGNE
 * PUBLIQUE. Elles ne peuvent pas être devinées : ce sont des mentions d'identité qui
 * engagent juridiquement l'éditeur du site.
 *
 * En droit français, l'article 6 III de la LCEN impose à tout éditeur de site accessible
 * au public d'indiquer son identité et un moyen de le contacter. Pour un particulier
 * éditant un site non professionnel, la loi permet de ne rendre publics que le nom de
 * l'hébergeur et un pseudonyme, à condition d'avoir communiqué son identité complète à
 * l'hébergeur — c'est l'option retenue par défaut ci-dessous.
 */
export const SITE = {
  name: 'Arabe égyptien',
  url: 'https://egyptian-arabic-app-phi.vercel.app',
  /** Description du site : balise meta, aperçu de partage et données structurées. */
  description:
    "Apprendre l'arabe égyptien du Caire, module par module : alphabet, Arabizi, grammaire et conjugaison, de A1 à B2.",

  /** Nom ou pseudonyme de l'éditeur, affiché dans les mentions légales. À REMPLIR. */
  publisher: 'Evan POUTEAU',

  /** Adresse e-mail de contact pour l'exercice des droits RGPD. À REMPLIR. */
  contactEmail: 'pouteaue78@gmail.com',

  /**
   * Adresse dédiée aux retours et suggestions sur le contenu.
   *
   * Volontairement distincte de `contactEmail` : cette dernière est l'adresse
   * personnelle de l'éditeur, publiée parce que la LCEN et le RGPD l'exigent. Un lecteur
   * qui signale une coquille de translittération n'a aucune raison d'écrire au
   * responsable de traitement — et l'éditeur n'a aucune raison de mélanger les deux flux.
   */
  feedbackEmail: 'arabicappfeedback0000@gmail.com',

  /** Statut de l'éditeur : particulier ou professionnel. */
  publisherStatus: 'Particulier — site personnel sans activité commerciale',

  hostingProvider: 'Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis',
  databaseProvider: 'Supabase Inc., 970 Toa Payoh North, Singapour',

  /**
   * Date de dernière révision des mentions, à actualiser en cas de modification.
   *
   * Elle suit les modifications DES TEXTES LÉGAUX, pas celles du site : la dernière en
   * date est l'ajout du canal de retours et de l'adresse dédiée (24 août 2026), qui a
   * introduit un nouveau traitement de données à mentionner.
   */
  lastUpdated: '7 octobre 2026',
} as const;

/**
 * Lien de rédaction Gmail, ouvert dans un onglet du navigateur.
 *
 * Pourquoi pas `mailto:` — c'était la première version, et elle était mauvaise : un lien
 * `mailto:` délègue au client de messagerie ENREGISTRÉ DANS LE SYSTÈME. Sous Windows,
 * c'est presque toujours Outlook, y compris chez quelqu'un qui ne lit ses mails que dans
 * Gmail : la personne voit s'ouvrir un logiciel qu'elle n'utilise pas, souvent sur un
 * compte qu'elle n'a jamais configuré, et abandonne.
 *
 * Ce lien-ci ouvre directement la fenêtre de rédaction Gmail, objet et corps déjà remplis.
 * Il ne convient évidemment qu'aux utilisateurs de Gmail — d'où le bouton « copier »
 * proposé à côté partout où ce lien apparaît (voir components/FeedbackActions.tsx).
 *
 * `encodeURIComponent` plutôt que `URLSearchParams` : ce dernier encode les espaces en `+`,
 * que Gmail affiche littéralement dans la ligne d'objet.
 */
export function gmailCompose(subject: string, body?: string) {
  const params = [
    'view=cm',
    'fs=1',
    `to=${encodeURIComponent(SITE.feedbackEmail)}`,
    `su=${encodeURIComponent(subject)}`,
  ];
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `https://mail.google.com/mail/?${params.join('&')}`;
}
