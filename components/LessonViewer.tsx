import { cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ArabicText from './ArabicText';
import LetterAudioButton from './LetterAudioButton';
import ScrollTable from './ScrollTable';
import { ALPHABET_AUDIO } from '@/lib/alphabet-audio';
import { vocabAudioSrc } from '@/lib/vocab-audio';
import { cardRows } from '@/lib/table-cards';
import type { Lesson, VocabItem } from '@/lib/types';

function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return extractText((node as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

/*
  Cellules de tableau. Mesuré sur les 131 tableaux des leçons : 98 ont une colonne
  majoritairement arabe, et l'arabe y était rendu au corps du texte courant, sans police
  arabe — ses points et ses voyelles devenaient illisibles. Les cellules suivent quelques
  formes régulières, chacune rendue au mieux :
  - « كل — kul » (373 cellules), « يوم الاتنين (Yom el-etneen) » (78), « أنا → Ana (Moi) »
    (13) : le mot arabe en grand, sa lecture dessous, comme sur les fiches de vocabulaire ;
  - « ب » (137) : l'arabe seul, en grand ;
  - le reste (« ع-ل-م (savoir) », phrases mêlées) : chaque passage arabe isolé et agrandi
    par `ArabicText`, comme dans le reste du site.
*/
const AR = '؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿';
const AR_PART = `[${AR}][${AR}\\s؟،!.…ـ/]*`;
const WORD_THEN_READING = new RegExp(`^(${AR_PART})\\s*(?:[—–-]|→)\\s*([^${AR}]+)$`);
const WORD_THEN_PAREN = new RegExp(`^(${AR_PART})\\s*\\(([^${AR}]+)\\)$`);
const ARABIC_ONLY = new RegExp(`^${AR_PART}$`);

/** Passe chaque texte d'une cellule par `ArabicText`, gras et italique compris. */
function withArabic(node: ReactNode): ReactNode {
  if (typeof node === 'string') return <ArabicText>{node}</ArabicText>;
  if (Array.isArray(node)) return node.map((n, i) => <Fragment key={i}>{withArabic(n)}</Fragment>);
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return cloneElement(el, undefined, withArabic(el.props.children));
  }
  return node;
}

function CellContent({ children }: { children: ReactNode }) {
  const text = extractText(children).trim();
  const pair = text.match(WORD_THEN_READING) ?? text.match(WORD_THEN_PAREN);
  if (pair) {
    return (
      <span className="cell-word">
        <bdi dir="rtl" className="cell-ar">
          {pair[1].trim()}
        </bdi>
        <span className="cell-reading">{pair[2].trim()}</span>
      </span>
    );
  }
  if (ARABIC_ONLY.test(text)) {
    // Une lettre seule (colonne « Lettre » de l'alphabet) : encore plus grande, c'est sa
    // forme qu'on apprend à reconnaître.
    const letter = [...text.replace(/[ً-ْ\s]/g, '')].length === 1;
    return (
      <bdi dir="rtl" className={letter ? 'cell-ar cell-letter' : 'cell-ar'}>
        {text}
      </bdi>
    );
  }
  return <>{withArabic(children)}</>;
}

/*
  Tableaux en cartes sur téléphone. Faire glisser un tableau de 4 ou 5 colonnes à 375 px
  était peu pratique (retour d'usage) : sous 640 px, chaque ligne d'un tableau de 3
  colonnes ou plus devient une carte — la première colonne en titre, les autres en
  « intitulé : valeur » —, et tout se lit de haut en bas. Le tableau reste dans la page
  pour les écrans larges ; l'une des deux versions est toujours en `display: none`, donc
  absente de l'arbre d'accessibilité : rien n'est lu deux fois.
*/
type HNode = { type: string; tagName?: string; value?: string; children?: HNode[] };

function hastText(n: HNode): string {
  if (n.type === 'text') return n.value ?? '';
  return (n.children ?? []).map(hastText).join('');
}

/** En-têtes et lignes d'un tableau markdown, en texte brut. */
function tableData(node: HNode | undefined) {
  const rows: HNode[] = [];
  const walk = (n: HNode) => (n.tagName === 'tr' ? rows.push(n) : n.children?.forEach(walk));
  if (node) walk(node);
  const cells = (tr: HNode) =>
    (tr.children ?? []).filter((c) => c.tagName === 'th' || c.tagName === 'td').map((c) => hastText(c).trim());
  const [head, ...body] = rows;
  return { headers: head ? cells(head) : [], rows: body.map(cells) };
}

/** Une valeur vide ou un simple tiret (« — ») n'apporte rien sur une carte. */
const isBlank = (v: string) => !v || /^[—–-]$/.test(v);

function TableCards({
  headers: allHeaders,
  rows: allRows,
  cell,
}: {
  headers: string[];
  rows: string[][];
  cell: (text: string) => ReactNode;
}) {
  // Un tableau à deux séries côte à côte (« Chiffre | Romanisation | Chiffre | … ») donne
  // une carte par série et non une carte à deux nombres mélangés (lib/table-cards.ts).
  const { headers, rows } = cardRows(allHeaders, allRows);
  return (
    <ul className="table-cards">
      {rows.map((row, i) => (
        <li key={i} className="table-card">
          <p className="table-card-title">{cell(row[0] ?? '')}</p>
          <dl className="table-card-fields">
            {row.slice(1).map((value, j) =>
              isBlank(value) ? null : (
                <div key={j} className="table-card-field">
                  <dt>{headers[j + 1]}</dt>
                  <dd>{cell(value)}</dd>
                </div>
              )
            )}
          </dl>
        </li>
      ))}
    </ul>
  );
}

export default function LessonViewer({
  lesson,
  vocab,
}: {
  lesson: Lesson;
  vocab: VocabItem[];
}) {
  // Les 28 lettres de l'alphabet (Jours 1-8 de module-01) ont un fichier audio ; le reste
  // du contenu n'en a pas. On restreint le lookup à ce module précis plutôt que de se fier
  // à l'unicité globale des noms de lettres à travers tout le contenu — plus sûr si un
  // futur module réutilise un jour un mot comme "Ra" ou "Lam" dans un autre contexte.
  const isAlphabetLesson =
    lesson.module_id === 'module-01' && lesson.day !== null && lesson.day <= 8;

  /** Le bouton d'écoute d'une lettre de l'alphabet, s'il y en a un pour ce texte. */
  const letterAudio = (text: string) => {
    const src = isAlphabetLesson ? ALPHABET_AUDIO[text] : undefined;
    return src ? <LetterAudioButton src={src} label={text} /> : null;
  };
  /** Une cellule rendue depuis son texte (cartes mobiles). */
  const cardCell = (text: string) => (
    <>
      <CellContent>{text}</CellContent>
      {letterAudio(text)}
    </>
  );

  return (
    <>
      {lesson.day !== null && <p className="eyebrow">Jour {lesson.day}</p>}

      {/*
        Pas de `whitespace-nowrap` sur les tables : la plupart en ont 2-3 colonnes de
        prose (description, exemple) qui se lisent bien en enveloppant le texte. Forcer
        une seule ligne rendait presque toutes les tables de leçon plus larges que
        l'écran sur mobile.
      */}
      <article className="prose prose-lecon mt-2 max-w-none prose-th:text-left prose-blockquote:not-italic">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            /*
              Chaque table est enveloppée dans un conteneur défilant plutôt que passée en
              `display: block` : mise en block, elle perd son rôle « table » dans l'arbre
              d'accessibilité et un lecteur d'écran n'associe plus les cellules à leurs
              en-têtes — sur une table de conjugaison, c'est la moitié de l'information.
            */
            table: ({ node, children, ...props }) => {
              const { headers, rows } = tableData(node as HNode | undefined);
              // Deux colonnes (« Égyptien | Sens ») tiennent en largeur : elles restent
              // un tableau. À partir de trois, cartes sur téléphone.
              const asCards = headers.length >= 3 && rows.length > 0;
              return (
                <>
                  <div className={asCards ? 'table-wide' : undefined}>
                    <ScrollTable>
                      <table {...props}>{children}</table>
                    </ScrollTable>
                  </div>
                  {asCards && <TableCards headers={headers} rows={rows} cell={cardCell} />}
                </>
              );
            },

            /*
              Les leçons sont rédigées avec `##` pour leur titre et `###` pour leurs
              sections — une convention héritée du temps où ce markdown vivait dans des
              fichiers, chacun sous un titre de document implicite. Rendu tel quel, il
              produisait une page SANS `<h1>` : mesuré sur les 139 leçons du site. Un
              lecteur d'écran annonce alors un document sans titre principal, et la
              navigation par titres (touche H) démarre au deuxième niveau.

              On promeut donc d'un cran à l'affichage plutôt que de réécrire le contenu :
              le `##` de tête porte des précisions absentes du champ `title` (le numéro de
              jour, le terme arabe — « Jour 43 — L'impératif (الأمر) »), qu'il faudrait
              sinon dupliquer ailleurs.
            */
            h2: ({ node: _node, children, ...props }) => <h1 {...props}>{children}</h1>,
            h3: ({ node: _node, children, ...props }) => <h2 {...props}>{children}</h2>,
            h4: ({ node: _node, children, ...props }) => <h3 {...props}>{children}</h3>,
            th: ({ node: _node, children, ...props }) => (
              <th {...props}>
                <CellContent>{children}</CellContent>
              </th>
            ),
            td: ({ node: _node, children, ...props }) => (
              <td {...props}>
                <CellContent>{children}</CellContent>
                {letterAudio(extractText(children).trim())}
              </td>
            ),
          }}
        >
          {lesson.content_markdown}
        </ReactMarkdown>
      </article>

      {vocab.length > 0 && (
        <section className="mt-12">
          <div className="egypt-rule">
            <h2 className="eyebrow whitespace-nowrap">Vocabulaire · {vocab.length} mots</h2>
          </div>

          {/*
            Des fiches plutôt qu'un tableau à trois colonnes. Dans un tableau, l'arabe est
            comprimé à la largeur de sa colonne et la translittération lui colle : sur
            mobile, les trois informations finissaient sur trois lignes de taille identique,
            sans hiérarchie. Ici l'arabe domine, la translittération le sous-titre, le
            français conclut — c'est l'ordre dans lequel on apprend un mot.
          */}
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {vocab.map((v) => {
              const audioSrc = vocabAudioSrc(v.arabic);
              return (
              // `id` : cible des liens de la recherche globale (`#mot-<id>`), qui met la
              // fiche en évidence à l'arrivée via `:target` (voir globals.css).
              <li key={v.id} id={`mot-${v.id}`} className="vocab-card card-sand p-4">
                {/* Le bouton à gauche, l'arabe à droite : l'œil lit le mot d'abord. */}
                <div className="flex items-center justify-between gap-2">
                  {audioSrc ? (
                    <LetterAudioButton src={audioSrc} label={v.transliteration} />
                  ) : (
                    <span />
                  )}
                  <p className="arabic text-right leading-tight text-[var(--ink)]" dir="rtl">
                    {v.arabic}
                  </p>
                </div>
                <p className="mt-1 text-sm font-semibold text-[var(--gold-text)]">
                  {v.transliteration}
                </p>
                <p className="mt-0.5 text-sm text-[var(--muted)]">{v.french}</p>
              </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
