# Architecture du projet

Référence fichier par fichier, pour déboguer sans avoir à tout relire. Organisé dans l'ordre où une requête traverse l'app : config → routes → composants → logique partagée → base de données.

---

## Racine

| Fichier | Rôle |
|---|---|
| `proxy.ts` | (Ex-`middleware.ts`, renommé par Next 16 ; tourne sous Node.js.) S'exécute avant chaque requête de page (pas pour les fichiers statiques, sons, robots, sitemap, manifeste — voir `matcher`). Rafraîchit le token de session Supabase dans les cookies. Sans cookie `sb-…` (visiteur anonyme), il s'arrête aussitôt sans monter de client. Sans lui, une session expirée déconnecterait silencieusement l'utilisateur — les Server Components ne peuvent pas écrire de cookies eux-mêmes. |
| `app/globals.css` | **Le fichier à lire avant toute modification visuelle.** Style « Pop oriental » : la mise en page Pop du Caire (aplats pleins cerclés d'encre, ombres dures décalées, formes très rondes) aux couleurs du Conte oriental (indigo, or, turquoise, grenade). Sections numérotées : (1) les jetons des deux thèmes — crème le jour, nuit indigo — dont les aplats `--pop-*`, le trait `--line-strong` (encre le jour, or la nuit) et le carrelage d'étoiles `--pattern` ; (2) base et focus ; (3) typographie et prose ; (4) ornements ; (5) surfaces ; (6) boutons, choix de quiz, champs `.pop-field` ; (7) mouvement ; (10) nœuds du chemin des leçons ; (11) pièces Pop — `pop-tone-*` (couple fond / encre d'un aplat, mesuré une fois pour toutes), `pop-card`, `pop-card-row`, `pop-num`, `pop-chip`, `pop-bar`, `pop-blob`, `pop-sticker`, `pop-marquee`. **Piège** : ces styles sont hors couche et l'emportent sur les utilitaires Tailwind — pour une variante, créer une classe (`pop-card-row`) plutôt que d'ajouter `flex-row`. |
| `app/layout.tsx` | Layout racine : charge les polices (Geist pour le texte, Bricolage Grotesque pour `.display`), monte `<Navbar>`, définit les métadonnées globales (`<title>`), et exécute le **script inline anti-flash** qui applique `data-theme` avant le premier rendu (d'où `suppressHydrationWarning` sur `<html>`). |
| `app/loading.tsx` | Écran de chargement (squelette aux formes du site) affiché dès le clic sur un lien, pendant que le serveur prépare la page. Sans lui, l'ancienne page restait figée jusqu'à la réponse complète. |
| `.env.local` | Jamais commité (`.gitignore`). Contient `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (utilisées par l'app) et `SUPABASE_SECRET_KEY` (scripts locaux uniquement, jamais sur Vercel). |
| `.env.example` | Modèle sans valeurs réelles, documente à quoi sert chaque variable. |

---

## `lib/` — logique partagée, sans JSX

C'est le cœur à lire en premier pour comprendre une règle métier : tout ce qui n'est pas de l'affichage vit ici.

| Fichier | Rôle |
|---|---|
| `lib/content.ts` | **Le contenu pédagogique en cache** (`unstable_cache`, une heure, étiquette `content`) : `getModules`, `getModule`, `getLessonLinks`, `getModuleLessons`, `getLesson`, `getContentCounts`, `getQuizBank`, `getPlacementQuestions`, `getVocabLite`. Client Supabase SANS cookies (contenu public, RLS lecture). Toute page lit le contenu par ici ; seules les données propres à l'utilisateur (leçons lues, scores, série) passent par le client à cookies. Mesuré : les pages de contenu répondaient en 0,6 à 2 s en production, faute de cache. Une lecture qui échoue LÈVE une erreur (jamais mise en cache). |
| `lib/supabase/client.ts` | Client Supabase pour le navigateur (`'use client'` components). Utilise la clé anonyme. |
| `lib/supabase/server.ts` | Client Supabase pour Server Components / Server Actions. Lit/écrit les cookies de session via `next/headers`. **C'est celui qu'utilisent presque tous les fichiers `page.tsx` et `actions.ts`.** |
| `lib/types.ts` | Types TypeScript miroir du schéma SQL (`Module`, `Lesson`, `VocabItem`, `QuizQuestion`, `ModuleStatus`). Si une colonne change en base, c'est ici qu'il faut la répercuter. |
| `lib/auth.ts` | `getUser` et `getProfile` sont enveloppés dans `cache()` de React : un seul appel à Supabase Auth par requête, même si la barre de navigation et la page les demandent toutes deux. `getUser()` (session brute), `getProfile()` (session + ligne `profiles`), `requireProfile()` (redirige vers `/auth/login` si non connecté — utilisé par toute page protégée : profil, dashboard, quiz, leçon du jour). |
| `lib/progress.ts` | `getAllProgress(userId)` calcule le statut de chaque module (`not_started` / `in_progress` / `completed`) à partir des leçons lues et du meilleur score. `deriveStatus()` contient la règle : **terminé = toutes les leçons lues ET quiz réussi**, pas l'un ou l'autre. |
| `lib/quiz-scoring.ts` | `scorePercent()`, `assignLevel()` (logique du test de positionnement : palier validé à 60 %, arrêt au premier échec), `PASS_THRESHOLD` (70 %, seuil de réussite d'un quiz de module — vit ici et pas dans `actions.ts` car un fichier `'use server'` ne peut exporter que des fonctions async). |
| `lib/shuffle.ts` | `seededShuffle(items, seed)` : mélange déterministe (même graine → même ordre). Utilisé par les quiz de module (graine dans l'URL, régénérée au clic sur « Refaire ») et par la leçon du jour (graine = utilisateur + date). Évite `Math.random()` pendant le rendu, qui casserait l'hydratation React. |
| `lib/daily.ts` | `getDailyLesson(userId)` : construit la leçon du jour (10 questions, quatre formats en alternance : sens, production, lecture de l'écriture arabe, et écoute — le mot joué sans être écrit, via `lib/listening.ts`, qui retombe sur le sens pour un mot sans son de confiance) à partir du vocabulaire des leçons lues. `todayKey()` ancre le découpage des journées sur `Europe/Paris` (pas UTC, sinon la leçon changerait à 2h du matin). |
| `lib/alphabet.ts` | Les 28 lettres. Seuls `nom`, `isole`, `arabizi` et `traits` sont saisis : les trois formes liées (`initiale`, `mediane`, `finale`) en sont **dérivées** à l'aide d'une kashida (U+0640), qui laisse la police faire le façonnage. Les recopier à la main, c'est 28 occasions de coller la mauvaise. `attachante` est faux pour six lettres (ا د ذ ر ز و) : elles ne se lient jamais à la suivante, donc leur forme de début vaut leur forme isolée et leurs formes du milieu et de la fin sont identiques. Les doublons du tableau de `/ecriture` sont donc une information, pas un bug. |
| `lib/arabizi.ts` | `judgeAnswer()` compare une réponse **tapée** à la forme attendue. L'Arabizi n'ayant pas d'orthographe officielle, le verdict a trois valeurs : `exact` (à la casse, la ponctuation et les traits d'union près — « maro7tsh » = « Ma-ro7t-sh »), `close` (variantes connues : 7/h, 3, voyelles doublées, u↔o, i↔e) et `wrong`. `close` est compté juste, mais l'écran affiche la graphie du cours. |
| `lib/exercises.ts` | Modèle des exercices d'entraînement + `drawSeries()` (tirage déterministe par graine). Lit `data/exercises.generated.json`, **jamais Supabase** : l'entraînement ne produit aucune donnée utilisateur. `DRILL_SETS` est le catalogue des treize jeux ; `listSets()` masque ceux qu'aucun exercice n'alimente. Chaque exercice porte une `family` (même verbe au même pronom, même phrase, même réponse…) : `drawSeries()` n'en tire jamais deux de la même famille dans une série, sans quoi « Ana ___ » et « Bokra, ana ___ » pourraient se suivre. |
| `lib/glosses.ts` | `makeGlosser()` : traduit une proposition de QCM (arabe → prononciation et sens, Arabizi → sens, français → mot égyptien) à partir de `vocab_items`. Utilisé au rendu par le quiz de module et la leçon du jour, rien n'est stocké en base. |
| `lib/vocab-audio.ts` | `vocabAudioSrc(arabe)` : l'URL du son d'un mot (`/audio/vocab/…mp3`), ou `null`. **Ne sert qu'un son de confiance** : enregistré par une voix humaine (`voice: "humain"` dans `data/audio-manifest.json`), ou généré par Azure ET validé à l'oreille (`data/audio-review.json`, verdict `ok` pour ce même texte). Environ un son d'Azure sur quatre sortait faux : un mot non validé reste muet. Clé = écriture arabe (`audioKey()`), **pas** l'id du mot : `npm run import` régénère les UUID. Utilisé par les fiches de vocabulaire des leçons (`LessonViewer`) et le glossaire. |
| `lib/listening.ts` | L'exercice d'écoute « le mot est joué sans être écrit, choisir son sens » : `listenable()` (mots au son de confiance, un par son), `listeningQuestion()` (un QCM ; un leurre n'est jamais une autre traduction du même son — « Moi / Je » et « Je / Moi » pour أنا seraient deux bonnes réponses), `listeningSeries()` (leurres pris d'abord dans le même thème ou la même leçon), `hashSeed()`. Utilisé par `/entrainement/ecoute`, la leçon du jour et le bloc de fin de leçon. |
| `lib/meta.ts` | `describeLesson()` : la meta description d'une leçon, tirée de son premier paragraphe de prose (sans markdown, coupée vers 155 caractères) ; si la leçon s'ouvre sur un tableau, ses premiers mots de vocabulaire (« Ana (moi / je), Bab (porte)… »). Mesuré : les 141 leçons avaient toutes la description générique du site. Les métadonnées sont envoyées dans le `<head>` grâce à `htmlLimitedBots: /.*/` (`next.config.ts`) : sans cette option, Next les place dans le `<body>` sur les pages rendues à la demande, où Lighthouse et les robots sans JavaScript ne les voient pas. |
| `lib/level-tone.ts` | `LEVEL_TONE` : la classe `pop-tone-*` de chaque niveau. Seule source de la couleur d'un palier (badges, cartes de module, en-tête de module, titres de la page Modules). |

---

## `components/` — blocs réutilisables

| Fichier | Rôle |
|---|---|
| `Navbar.tsx` | Server Component (lit la session via `getProfile()`). Sticky en haut (`sticky top-0 z-40`). Affiche les liens différemment selon connecté/non connecté. Le nom du site disparaît sous 640 px, seule la marque ع reste. |
| `NavLink.tsx` | Client Component minimal : le seul rôle de `usePathname()` est de poser `aria-current="page"`. C'est cet attribut — et non une classe — qui déclenche le soulignement doré de l'onglet courant, pour que style et sémantique ne puissent pas diverger. |
| `ThemeToggle.tsx` | Bascule jour / nuit (44 px). Lit le thème via `useSyncExternalStore` (le thème vit dans le DOM, pas dans React) et l'écrit dans `localStorage`. Voir aussi le script inline de `layout.tsx` et la section RGPD de `/confidentialite`. |
| `SoundSampler.tsx` | Les quatre sons de l'Arabizi (3، 7، 5، 2), en cartes de couleur jouables au clic sur l'accueil. Réutilise les mp3 de `public/audio/alphabet/` déjà présents pour le module 01 : rien n'est téléchargé tant qu'on n'a pas cliqué. |
| `ScoreDial.tsx` | Cadran de score circulaire des écrans de résultat (quiz, positionnement, révision du jour). L'anneau se remplit en CSS pur (`@keyframes dial-fill` lit `--dash-start`/`--dash-end`), donc le composant reste rendu côté serveur. |
| `LevelBadge.tsx` | Le badge « A1 »/« B2 »/etc. : pastille pleine à la couleur du palier, via `lib/level-tone.ts`. |
| `ModuleCard.tsx` | Carte d'un module dans `/modules` : un aplat `pop-card` à la couleur du niveau (A1 turquoise, A2 or, B1 grenade, B2 indigo, REF sable). La piste de progression n'apparaît qu'une fois le module entamé. |
| `LessonPath.tsx` | Le chemin des leçons. `offsetAt()` calcule la position sur le serpentin (8 positions qui se répètent), `Trail` dessine des points dorés entre deux étapes. Chaque leçon est une pastille ronde (`.lesson-node`) : turquoise avec une coche une fois lue, dorée avec « Vous êtes ici » pour l'étape courante. Le quiz est une grande pastille grenade (`.quiz-node`), en pointillés tant que les leçons ne sont pas toutes lues. La variable CSS `--wave` réduit l'amplitude sous 480 px pour ne pas déborder sur mobile. |
| `LessonViewer.tsx` | Rendu markdown d'une leçon (`react-markdown` + `remark-gfm`) + fiches de vocabulaire. **Cellules de tableau** (`CellContent`) : un mot arabe suivi de sa lecture (« كل — kul », « يوم الاتنين (Yom el-etneen) », « أنا → Ana ») est rendu en deux lignes, l'arabe en grand (`.cell-ar`) et la lecture dessous (`.cell-reading`) ; l'arabe seul en grand, une lettre isolée encore plus (`.cell-letter`) ; le reste passe par `ArabicText`. Mesuré sur les 141 leçons : 464 cellules mot + lecture, 137 d'arabe seul (dont 28 lettres), 37 mêlées. Le contenu n'est pas modifié, seul l'affichage. Style « Pop » des tableaux dans `globals.css` (bloc « Tableaux des leçons »), réservé à `.prose-lecon`. **Sur téléphone (< 640 px), un tableau de 3 colonnes ou plus devient une liste de cartes** (`TableCards`, construites depuis l'arbre markdown) : première colonne en titre, les autres en « intitulé : valeur », les valeurs « — » omises. Faire glisser un tableau de côté était peu pratique (retour d'usage). Le tableau et les cartes sont tous deux dans la page, l'un toujours en `display: none` : rien n'est lu deux fois par un lecteur d'écran. |
| `ScrollTable.tsx` | Cadre de chaque tableau de leçon. Mesure s'il déborde (`ResizeObserver`) et suit le défilement : si oui, mention « Faites glisser le tableau → » et dégradé du côté où il reste à lire. Ne sert plus guère que pour un tableau à 2 colonnes très chargé, les plus larges passant en cartes sur téléphone. |
| `LessonReadToggle.tsx` | Bouton « Marquer comme lue ». Utilise `useOptimistic` : la coche apparaît immédiatement, avant même la confirmation du serveur. |
| `QuizEngine.tsx` | Moteur générique de QCM, réutilisé par le quiz de module, le test de positionnement et la leçon du jour. Une question à la fois, feedback immédiat, `renderResult` est fourni par l'appelant pour personnaliser l'écran final. Raccourcis clavier : les chiffres **1 à 9** choisissent une réponse, **Entrée** enchaîne (les numéros sont affichés sur chaque bouton — un raccourci invisible n'existe pas). Le résultat est annoncé dans une zone `aria-live`, sans quoi un lecteur d'écran ne signalerait qu'un changement de couleur. Une question qui porte `audio` est une question d'écoute : le son part à l'arrivée de la question, bouton « Écouter » et touche **R** pour réécouter, et `reveal` (le mot écrit) n'apparaît qu'après la réponse. Les raccourcis sont ignorés quand on tape dans un champ (la recherche du haut de page). |
| `LessonListening.tsx` | Bloc « À l'oreille » sous le vocabulaire d'une leçon (au moins 2 mots écoutables) : fermé par défaut, « Commencer » lance `QuizEngine` sur les mots de la leçon. Rien n'est enregistré. |
| `ListeningResult.tsx` | Écran de fin d'une série d'écoute : score, puis les mots ratés, écrits et réécoutables. |
| `ArabicText.tsx` | Rend un texte qui mêle arabe et latin. Chaque passage arabe est isolé dans un `<bdi dir="rtl" class="arabic">` : sans lui, l'algorithme bidirectionnel d'Unicode renvoie les guillemets et la flèche de « تفاح → ___ » du mauvais côté, et à corps égal les points qui distinguent ب de ت disparaissent. Le découpage se fait au rendu, pas à la génération — le corpus reste du texte brut, relisible dans un diff. |
| `DrillEngine.tsx` | Moteur des exercices à trou. Frère de `QuizEngine`, avec une différence de fond : **on tape la réponse**, on ne la choisit pas — reconnaître « Baroo7 » parmi quatre formes n'apprend pas à la produire. Le QCM n'apparaît qu'après un clic sur « je sèche », et l'écran final compte à part ce qui a été trouvé sans aide. Le jugement est délégué à `lib/arabizi.ts`. Rien n'est envoyé au serveur. |
| `ProgressBar.tsx` | Barre de progression générique (piste cerclée d'encre, remplissage or → turquoise). |
| `WordMarquee.tsx` | Bandeau de mots égyptiens qui défile sur l'accueil. Bouton pause et arrêt au survol / focus (WCAG 2.2.2), immobile sous `prefers-reduced-motion`. |
| `AuthForm.tsx` | Formulaire login/signup partagé, piloté par `useActionState` (React 19). |

---

## `app/` — une route par dossier

### Pages publiques

| Fichier | Route | Rôle |
|---|---|---|
| `app/page.tsx` | `/` | Landing page. Compte les modules/leçons en direct depuis Supabase. |
| `app/modules/page.tsx` | `/modules` | Liste des modules avec statut de progression si connecté. |
| `app/modules/[id]/page.tsx` | `/modules/module-01` | Le chemin de dunes d'un module : groupe les leçons par section, calcule quelle dune est « vous êtes ici » (première non lue). |
| `app/modules/[id]/[lessonId]/page.tsx` | `/modules/module-01/uuid` | Contenu d'une leçon + bouton lue/pas lue + navigation précédent/suivant. |
| `app/modules/[id]/actions.ts` | — | `toggleLessonRead()` (coche/décoche une leçon) et `refreshModuleStatus()` (recalcule le statut du module après tout changement — leçon cochée OU quiz repassé). |

### Quiz de module

| Fichier | Rôle |
|---|---|
| `app/modules/[id]/quiz/page.tsx` | Server Component. La banque d'un module compte jusqu'à 48 questions ; la page en tire `QUIZ_SIZE` (10, `lib/quiz-scoring.ts`) selon `?seed=`, jamais deux sur le même mot (`options.item`). Sans graine, elle en tire une (`node:crypto`) et redirige vers l'URL qui la porte : « Refaire » et chaque nouvelle visite posent donc d'autres questions. |
| `app/modules/[id]/quiz/ModuleQuiz.tsx` | Client Component. Enrobe `QuizEngine`, gère l'écran de résultat et le bouton « Refaire » (génère une nouvelle graine, navigue vers `?seed=X`). |
| `app/modules/[id]/quiz/actions.ts` | `saveAttempt()` : enregistre la tentative, met à jour `best_score`, déclenche `refreshModuleStatus()`. |

### Test de positionnement

| Fichier | Rôle |
|---|---|
| `app/placement-test/page.tsx` | Charge les 12 questions de positionnement (`module_id is null`), triées A1→B2. |
| `app/placement-test/PlacementTest.tsx` | Affiche le résultat avec le détail par palier. |
| `app/placement-test/actions.ts` | `savePlacement()` : calcule le niveau via `assignLevel()`, met à jour `profiles.current_level`. |
| `scripts/placement-questions.ts` | Les 12 questions elles-mêmes, écrites à la main (pas générées) — un test de positionnement mal calibré fausse tout le parcours. |

### Entraînement libre

| Fichier | Rôle |
|---|---|
| `app/entrainement/page.tsx` | Le sommaire : une carte par jeu d'exercices, avec son compte et un exemple. Ne lit ni session ni Supabase. |
| `app/entrainement/[set]/page.tsx` | Tire une série de 10 exercices via `drawSeries()`. `?seed=` fixe le tirage (même graine → même série, donc rendu serveur et hydratation concordent) ; sans graine, la page en tire une et redirige — avec une graine fixe, chaque arrivée depuis le sommaire redonnait la même série et `?theme=` le restreint à un module. Le filtre par thème est un `<details>` replié : le vocabulaire compte 29 thèmes, dépliés ils repousseraient l'exercice hors de l'écran. |
| `app/entrainement/[set]/DrillSession.tsx` | Enrobe `DrillEngine` : écran de résultat, récapitulatif des formes ratées, bouton « Nouvelle série » (nouvelle graine tirée **dans le gestionnaire de clic**, jamais pendant le rendu). |

| `app/entrainement/ecoute/` | L'entraînement d'écoute (carte « À l'oreille » du sommaire). Page à part du catalogue : ce n'est pas un exercice à trous mais un QCM (`QuizEngine` + `lib/listening.ts`) sur le vocabulaire de la base, filtrable par module (`?theme=`), même mécanique de graine (`?seed=`) que les autres jeux. |

**Ce que l'entraînement ne fait pas**, et c'est délibéré : aucune écriture en base, aucun XP, aucun effet sur le statut d'un module. C'est le brouillon ; le quiz de module reste la copie. Aucune table, aucune migration n'a donc été ajoutée.

**Le lien de la Navbar n'apparaît qu'à 1024 px** : la barre, élargie à `max-w-6xl` avec la refonte, a la place d'un lien « S’entraîner » sur grand écran, pas en dessous. Sous 1024 px, les entrées sont l'accueil, `/modules` (carte à côté du glossaire), le tableau de bord et le pied de page.

### Tuteur IA

| Fichier | Rôle |
|---|---|
| `app/tuteur/page.tsx` | Page `/tuteur`. Connecté : affiche le chat et le nombre de messages restants (lu dans `chat_usage`) ; sinon, boutons de connexion et d'inscription. |
| `components/ChatTutor.tsx` | Le chat côté navigateur : envoie l'historique à `/api/chat`, lit la réponse en flux et l'affiche au fil de l'eau. Chaque ligne de réponse porte `dir="auto"` (l'arabe s'aligne à droite). En cas d'échec (réseau, 429, IA), le message est rendu à l'élève dans le champ. Rien n'est enregistré : la conversation disparaît en quittant la page. |
| `app/api/chat/route.ts` | Route serveur, dans l'ordre : connexion (401), validation zod (400), quota en base via la RPC `consume_chat_message` (429), puis appel à Gemini (`streamText` de `ai` v7). Attend le premier morceau de texte avant de répondre : une erreur Gemini devient un 502 lisible au lieu d'un flux vide. Restants dans l'en-tête `X-Chat-Remaining`. |
| `lib/chat-config.ts` | **Toutes les limites réglables** : 20 messages/jour, 5/minute, 500 caractères, 10 messages d'historique, 400 jetons de réponse ; modèle par défaut si `CHAT_MODEL` est vide. |
| `lib/chat-prompt.ts` | Le prompt système du tuteur (« Ostaz ») : égyptien du Caire, réponse en arabe + Arabizi + français, refus poli hors sujet. |

**Variables d'environnement** : `GOOGLE_GENERATIVE_AI_API_KEY` (serveur uniquement, jamais `NEXT_PUBLIC_`) et `CHAT_MODEL` (facultative). Sans clé, la route répond 503 et le reste du site fonctionne.

**Piège** : les modèles Gemini récents « réfléchissent » avant de répondre, et cette réflexion compte dans les 400 jetons. `thinkingFor()` dans la route la réduit au minimum selon la génération du modèle ; en changeant `CHAT_MODEL`, vérifier que les réponses ne sortent pas vides ou tronquées.

### Leçon du jour

| Fichier | Rôle |
|---|---|
| `app/daily/page.tsx` | Trois états : rien à réviser (pas assez de leçons lues), déjà faite aujourd'hui, ou la révision à faire. |
| `app/daily/DailyReview.tsx` | Enrobe `QuizEngine`, affiche un récap des mots ratés en fin de révision. |
| `app/daily/actions.ts` | `saveDailyReview()` : insertion protégée par contrainte unique `(user_id, review_date)` — un doublon (code `23505`) signifie que la leçon du jour est déjà faite, ce n'est pas une erreur. |

### Compte

| Fichier | Rôle |
|---|---|
| `app/auth/login/page.tsx`, `app/auth/signup/page.tsx` | Utilisent `<AuthForm>`. |
| `app/auth/actions.ts` | `login()`, `signup()`, `logout()`. Traduit les messages d'erreur Supabase les plus courants en français. |
| `app/auth/callback/route.ts` | Cible du lien de confirmation email : échange le `code` contre une session. |
| `app/profile/page.tsx` | Stats du compte (protégée par `requireProfile()`). |
| `app/dashboard/page.tsx` | Vue d'ensemble : XP, modules terminés, encart leçon du jour, « reprendre où j'en étais » (premier module en cours, sinon premier jamais commencé — exclut `conjugations-core`, qui n'a pas de niveau et se consulte plutôt qu'il ne se termine). |

---

## `supabase/migrations/` — le schéma, dans l'ordre d'exécution

Chaque fichier est numéroté et doit être exécuté une seule fois, dans l'ordre, via Supabase → SQL Editor.

| Fichier | Ce qu'il fait |
|---|---|
| `001_initial_schema.sql` | Les 7 tables de base + RLS sur `profiles`, `user_progress`, `quiz_attempts` (chacun ne voit que ses propres lignes). |
| `002_lock_content_writes.sql` | Révoque l'écriture anonyme sur le contenu (`modules`, `lessons`, `vocab_items`, `quiz_questions`) — seul `SUPABASE_SECRET_KEY` (scripts locaux) peut y écrire. |
| `003_public_read_policies.sql` | Active RLS sur les tables de contenu avec une policy de lecture publique explicite. **Nécessaire** : sans elle, si RLS est activé sans policy (ce qui peut arriver via le dashboard), les lectures anonymes renvoient un tableau vide avec un statut `200` — pas une erreur, un piège silencieux. |
| `004_profiles_on_signup.sql` | Trigger `security definer` qui crée la ligne `profiles` à l'inscription (la table n'a pas de policy INSERT, un utilisateur ne peut pas créer sa propre ligne autrement). |
| `005_lesson_completions.sql` | Table des leçons lues. Clé sur `(module_id, lesson_order_index)` et **pas** `lessons.id` : `npm run import` régénère les UUID des leçons à chaque réimport, une clé étrangère vers `lessons.id` effacerait toute la progression en cascade. |
| `006_daily_reviews.sql` | Historique de la leçon du jour, contrainte unique `(user_id, review_date)`. |
| `007_chat_usage.sql` | Quota du tuteur IA : table `chat_usage` (une ligne par utilisateur et par jour de Paris), lecture seule pour l'utilisateur, et fonction `consume_chat_message(daily_limit, minute_limit)` qui vérifie et incrémente en une opération (`for update` : des requêtes parallèles ne passent pas toutes). Le fuseau est écrit en dur dans la fonction. |

---

## `scripts/` — outils locaux, jamais exécutés en production

| Fichier | Rôle |
|---|---|
| `import-data.ts` | Charge `data/*.json` dans Supabase. Rejouable : purge puis réinsère par module. Utilise `SUPABASE_SECRET_KEY`. |
| `normalize-arabizi.ts` | Convertit la translittération académique (`ʿ`, `ḥ`, `ʾ`...) en Arabizi (`3`, `7`, `2`...) directement dans `data/*.json` — les modules B1/B2 avaient été rédigés dans un système différent des A1/A2. |
| `generate-quiz.ts` | Génère la banque de QCM de chaque module (jusqu'à 48, deux questions par mot) à partir du vocabulaire importé, en quatre sortes : sens, « comment dit-on », lecture de l'écriture arabe, et choix du mot en écriture arabe. Un leurre dont la traduction partage un mot avec la bonne réponse est écarté (souvent un synonyme). Déterministe (mêmes questions à chaque exécution). `-- --dry-run` construit et affiche sans rien écrire. La banque est construite avant la suppression des anciennes questions. Ne supprime que les questions `type = 'mcq'` — préserve les questions écrites à la main d'un autre type. |
| `generate-drills.ts` | Construit les ~4 200 exercices d'entraînement depuis `data/` et les écrit dans `data/exercises.generated.json`. **N'écrit pas en base** : l'app lit le fichier. Déterministe au caractère près — un `git diff` vide après exécution veut dire « le contenu n'a pas bougé », pas « le script n'a pas tourné ». Sources : les 19 paradigmes de `conjugations-core.json` (présent, futur, passé — chacun aussi « en situation », avec un complément de temps du module Calendrier ou un prénom —, négation au passé et avec Mesh au présent/futur, impératif, modalités Lazem/Momken/3ayez, quatre changements de temps), les 554 `vocab_items` (traduction, lecture de l'écriture arabe, première et dernière lettre — via `lib/alphabet.ts`), les exemples en gras `**…** = …` et les entrées de vocabulaire de trois mots et plus (deux trous par phrase quand elle s'y prête), et les phrases des tableaux de leçon au gabarit `arabe (romanisation) \| traduction` ou `arabe — romanisation \| traduction`. Un exercice sans trois leurres crédibles est écarté plutôt que servi avec un QCM truqué. |
| `placement-questions.ts` | Les 12 questions du test de positionnement (voir plus haut). |
| `generate-audio.ts` | `npm run generate:audio` : prononciation de chaque mot de `data/module-*.json` par la voix égyptienne d'Azure Speech (`AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` dans `.env.local`, voix `ar-EG-ShakirNeural` par défaut, retenue à l'écoute). Écrit `public/audio/vocab/<sha1 de l'arabe>.mp3` et `data/audio-manifest.json`, les deux **commités** : le site ne contacte jamais Azure. Rejouable (saute ce qui est à jour, reprend après une coupure, supprime les sons orphelins). `-- --dry-run` liste sans appeler Azure, `-- --limit 30` pour écouter un échantillon, `-- --force` régénère tout. « كويس / كويسة » est lu « كويس، كويسة » ; les gabarits (« ما...ش », « لو + … », « فـ ») n'ont pas de son. Un mot mal prononcé se corrige dans `data/audio-overrides.json` : `{ "<arabe tel que dans data/>": "<texte vocalisé à lire>" }` (homographes : كتب → كُتُب), ou `null` pour retirer le son. **Le ق égyptien** (coup de glotte, « 2alb ») : la voix le lit « q » à l'arabe standard, vocalisation et remplacement par أ n'y changent rien ; seule une prononciation IPA imposée marche (`<phoneme>`), d'où `data/audio-phonemes.json` (`{ "<mot>": "<IPA>" }`, appliqué au mot partout, phrases comprises). Le script signale tout mot avec ق sans entrée : **un nouveau mot avec ق doit y être ajouté**. Le ج sort déjà en « g » sans aide. |

| `audio-review/` | `npm run review:audio` → http://localhost:3020 (**dans Chrome** : il faut le micro). Outil local de tri des sons, serveur Node sans dépendance + une page. Pour chaque mot : écouter, ✓ ou ✗ (clavier : Espace, O, X, flèches ; le suivant se joue seul). Sur un ✗, onglet « Refusés à enregistrer » : enregistrer au micro (R) ou importer un fichier du téléphone ; le navigateur coupe les silences, égalise le volume, encode en mp3 24 kHz (lamejs), et le serveur l'écrit **à la place** du son d'Azure avec `voice: "humain"` — que `generate:audio` ne régénère jamais, même avec `--force`. Écrit `data/audio-review.json`, `data/audio-manifest.json` et `public/audio/vocab/`, à commiter ensuite. Rien n'y est servi par Next. |

**Ordre d'exécution après tout ajout de contenu** : `normalize` → `import` → `generate:quiz` → `generate:drills` → `generate:audio` → `review:audio` (écouter les nouveaux mots : sans ✓, ils restent muets). Seuls les `module-*.json` et `conjugations-core.json` de `data/` sont importés en base ; les autres fichiers de `data/` sont générés.

`data/exercises.generated.json` est **commité**. C'est un artefact, mais un artefact relu : une forme fausse s'y voit dans le diff, et l'app n'a rien à générer à l'exécution. Le revers est qu'il peut devenir obsolète en silence si on oublie l'étape — d'où sa place dans la liste ci-dessus. Pour compléter le corpus à la main sans toucher au générateur, créer `data/exercises-manual.json` (`{ "exercises": [ … ] }`, même forme qu'un brouillon) : il est fusionné à la fin et l'emporte sur un généré de même identifiant.

---

## Pour déboguer un problème courant

- **Une page protégée n'affiche rien / redirige** → elle appelle `requireProfile()` (`lib/auth.ts`), qui redirige vers `/auth/login` si `getUser()` ne trouve pas de session. Vérifier les cookies / le proxy (`proxy.ts`) avant de chercher plus loin.
- **Une donnée écrite ne s'affiche pas** → chaque page a `export const dynamic = 'force-dynamic'` pour éviter le cache statique de Next. Si absent sur une nouvelle page, c'est la première chose à ajouter.
- **Un contenu modifié ou réimporté n'apparaît pas** → il est servi depuis le cache de `lib/content.ts`, renouvelé au plus tard toutes les heures. Pour l'immédiat : redéployer, ou appeler `revalidateTag('content')` depuis une Server Action. Les données d'utilisateur, elles, ne sont jamais en cache.
- **Un module ne passe jamais à « terminé »** → vérifier `deriveStatus()` dans `lib/progress.ts` : il faut *toutes* les leçons lues *et* le quiz réussi, l'un des deux ne suffit pas.
- **Le quiz redonne le même ordre après « Refaire »** → vérifier que le bouton génère bien une nouvelle graine (`Math.random()` dans le gestionnaire de clic de `ModuleQuiz.tsx`, jamais pendant le rendu) et que l'URL contient `?seed=`.
- **Erreur 500 vague sur une page avec Server Action inline** → chercher une `const` exportée dans un fichier `'use server'` : seules les fonctions `async` peuvent y être exportées, une constante fait planter la compilation.
- **Lecture anonyme qui renvoie un tableau vide sans erreur** → RLS activé sans policy sur une table de contenu (voir `003_public_read_policies.sql`). Comparer une lecture avec la clé publique vs `SUPABASE_SECRET_KEY` pour confirmer.
- **Une couleur reste claire en thème sombre** → la variable a été ajoutée au bloc `:root` mais pas aux DEUX blocs sombres de `globals.css` (`@media (prefers-color-scheme: dark)` **et** `:root[data-theme="dark"]`). Les trois blocs doivent lister les mêmes variables.
- **La page défile horizontalement sur mobile** → un élément incompressible (presque toujours un tableau large) élargit le `<main>`. Envelopper le tableau dans `<div className="table-scroll" tabIndex={0}>` ; la règle `#contenu > * { min-width: 0 }` fait le reste. Ne pas passer le tableau en `display: block` : Chrome lui retire alors son rôle « table » dans l'arbre d'accessibilité.
- **Un exercice d'entraînement affiche une forme fausse** → elle est fausse dans `data/`. Le générateur ne réécrit rien, il recopie : chercher la case du tableau dans `conjugations-core.json` ou la ligne de leçon, corriger, puis relancer `npm run generate:drills`.
- **Un nouveau module n'apparaît pas dans l'entraînement** → `npm run generate:drills` n'a pas été relancé. L'app lit un fichier, pas la base : un `npm run import` seul ne change rien aux exercices.
- **Une réponse juste est refusée** → regarder `judgeAnswer()` dans `lib/arabizi.ts` avant d'incriminer le corpus. Le verdict `close` couvre déjà 7/h, 3, 2, les voyelles doublées et u↔o / i↔e ; au-delà, ajouter la variante dans le champ `accepted` de l'exercice plutôt que d'élargir la normalisation, qui finirait par accepter deux mots différents.
- **Vérifier un contraste** → le mesurer, pas l'estimer : lire `getComputedStyle().color` et composer les fonds successifs jusqu'au premier opaque. Attention, Chrome sérialise les `color-mix()` en `color(srgb 0.94 …)`, avec des composantes de 0 à 1 — les passer par un canvas 1×1 (`fillStyle` puis `getImageData`) normalise tous les formats en 0–255.
