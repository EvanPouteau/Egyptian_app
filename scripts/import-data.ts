import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { planLessons } from './plan-lessons';

process.loadEnvFile('.env.local');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL et une clé Supabase sont requis dans .env.local');
}

if (!process.env.SUPABASE_SECRET_KEY) {
  console.warn(
    '! SUPABASE_SECRET_KEY absente : import avec la clé publishable.\n' +
      "  Ne marche que si 002_lock_content_writes.sql n'a pas encore été appliqué.\n"
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// `--dry-run` : lit la base et annonce ce que l'import ferait de chaque leçon, sans écrire.
const DRY_RUN = process.argv.includes('--dry-run');
const ONLY = process.argv[process.argv.indexOf('--only') + 1] && process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1]
  : null;

const DATA_DIR = path.join(process.cwd(), 'data');

type JsonVocab = { arabic?: string | null; transliteration: string; french: string };

type JsonLesson = {
  day: number | null;
  order_index: number;
  section: string | null;
  title: string;
  content_markdown: string;
  vocab_items?: JsonVocab[];
  quiz_questions?: { question: string; question_fr: string; answer: string }[];
};

type JsonModuleFile = {
  module: {
    id: string;
    number: number;
    title: string;
    subtitle: string | null;
    level: string;
    description: string | null;
    order_index: number;
  };
  lessons: JsonLesson[];
};

type ConjugationsFile = {
  id: string;
  title: string;
  description: string;
  rules_matrix: { tense: string; structure: string; example: string; negation: string }[];
  rules_note: string;
  verbs_compact: {
    verb_fr: string;
    root: string;
    present_ana: string;
    future_ana: string;
    past_ana: string;
    imperative_m: string;
  }[];
  compact_note: string;
  verbs_full: {
    verb_fr: string;
    root: string;
    imperative_m: string;
    conjugations: {
      pronoun: string;
      present: string;
      future: string;
      past: string;
      past_negative: string;
    }[];
  }[];
  missing_full_paradigms: string[];
};

type ImportPayload = {
  module: JsonModuleFile['module'];
  lessons: JsonLesson[];
};

const cell = (value: string) => value.replaceAll('|', '\\|').replaceAll('\n', ' ');

const table = (headers: string[], rows: string[][]) =>
  [
    `| ${headers.join(' | ')} |`,
    `|${headers.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`),
  ].join('\n');

// conjugations-core n'est pas une séquence de jours : on le range comme un module de
// référence (order_index 99) pour qu'il vive dans les mêmes tables que le reste.
function buildConjugationsPayload(data: ConjugationsFile): ImportPayload {
  const lessons: JsonLesson[] = [];

  lessons.push({
    day: null,
    order_index: 0,
    section: 'Règles transversales',
    title: 'Les 4 règles temporelles',
    content_markdown: [
      '## Les 4 règles temporelles',
      '',
      table(
        ['Temps', 'Structure', 'Exemple', 'Négation'],
        data.rules_matrix.map((r) => [r.tense, r.structure, r.example, r.negation])
      ),
      '',
      `> ${data.rules_note}`,
    ].join('\n'),
    vocab_items: [],
  });

  const missing = data.missing_full_paradigms.length
    ? `\n\n> Paradigme complet non disponible pour : ${data.missing_full_paradigms.join(', ')}.`
    : '';

  lessons.push({
    day: null,
    order_index: 1,
    section: 'Règles transversales',
    title: `Tableau récapitulatif — ${data.verbs_compact.length} verbes`,
    content_markdown: [
      '## Tableau récapitulatif',
      '',
      table(
        ['Verbe', 'Racine', 'Présent (Ana)', 'Futur (Ana)', 'Passé (Ana)', 'Impératif (m.)'],
        data.verbs_compact.map((v) => [
          v.verb_fr,
          v.root,
          v.present_ana,
          v.future_ana,
          v.past_ana,
          v.imperative_m,
        ])
      ),
      '',
      `> ${data.compact_note}${missing}`,
    ].join('\n'),
    vocab_items: [],
  });

  data.verbs_full.forEach((verb, i) => {
    lessons.push({
      day: null,
      order_index: 2 + i,
      section: 'Paradigmes complets',
      title: `${verb.verb_fr} (${verb.root})`,
      content_markdown: [
        `## ${verb.verb_fr} — racine ${verb.root}`,
        '',
        `Impératif (m.) : **${verb.imperative_m}**`,
        '',
        table(
          ['Pronom', 'Présent', 'Futur', 'Passé', 'Passé négatif'],
          verb.conjugations.map((c) => [
            c.pronoun,
            c.present,
            c.future,
            c.past,
            c.past_negative,
          ])
        ),
      ].join('\n'),
      vocab_items: [],
    });
  });

  return {
    module: {
      id: data.id,
      number: 99,
      title: data.title,
      subtitle: 'Référence grammaticale',
      level: 'REF',
      description: data.description,
      order_index: 99,
    },
    lessons,
  };
}

async function importPayload({ module, lessons }: ImportPayload) {
  const fail = (step: string, error: { message: string } | null) => {
    if (error) throw new Error(`${module.id} — ${step} : ${error.message}`);
  };

  // Les JSON portent parfois des clés hors schéma (ex. generation_note sur module-05).
  const moduleRow = {
    id: module.id,
    number: module.number,
    title: module.title,
    subtitle: module.subtitle ?? null,
    level: module.level,
    description: module.description ?? null,
    order_index: module.order_index,
  };
  // Les leçons sont mises à jour SUR PLACE, appariées par leur rang dans le module
  // (`order_index`), au lieu d'être supprimées puis recréées : l'UUID d'une leçon fait son
  // adresse (/modules/<module>/<uuid>), et le régénérer à chaque import cassait les liens
  // partagés, les favoris et les pages connues des moteurs de recherche. Le rang est aussi
  // la clé de la progression de lecture (lesson_completions, migration 005) : une leçon
  // qui garde son rang garde donc à la fois son adresse et ses coches.
  const { data: existing, error: existingError } = await supabase
    .from('lessons')
    .select('id, order_index')
    .eq('module_id', module.id);
  fail('lecture des leçons en place', existingError);

  const { idByOrder, removed, kept, added } = planLessons(existing!, lessons);

  if (DRY_RUN) {
    console.log(
      `· ${module.id.padEnd(18)} ${kept.length} gardées, ${added.length} nouvelles, ${removed.length} supprimées`
    );
    return { lessons: lessons.length, vocab: 0, quiz: 0 };
  }

  fail('upsert module', (await supabase.from('modules').upsert(moduleRow)).error);

  // Le vocabulaire et les questions n'ont pas d'adresse propre : on les remplace en bloc.
  fail('purge quiz', (await supabase.from('quiz_questions').delete().eq('module_id', module.id)).error);
  if (existing!.length) {
    fail(
      'purge vocab',
      (await supabase.from('vocab_items').delete().in('lesson_id', existing!.map((l) => l.id))).error
    );
  }
  // Une leçon dont le rang a disparu du JSON part, avec son vocabulaire (cascade).
  if (removed.length) {
    fail('purge leçons retirées', (await supabase.from('lessons').delete().in('id', removed)).error);
  }

  const row = (l: JsonLesson) => ({
    module_id: module.id,
    day: l.day,
    section: l.section,
    title: l.title,
    content_markdown: l.content_markdown,
    order_index: l.order_index,
  });

  // Deux appels plutôt qu'un upsert mêlé : une ligne sans `id` y recevrait NULL et non
  // l'UUID par défaut.
  if (kept.length) {
    fail(
      'mise à jour des leçons',
      (await supabase.from('lessons').upsert(kept.map((l) => ({ id: idByOrder.get(l.order_index)!, ...row(l) })))).error
    );
  }
  if (added.length) {
    const { data: inserted, error } = await supabase
      .from('lessons')
      .insert(added.map(row))
      .select('id, order_index');
    fail('insert leçons', error);
    for (const l of inserted!) idByOrder.set(l.order_index, l.id);
  }

  const lessonIdByOrder = idByOrder;

  const vocabRows = lessons.flatMap((l) =>
    (l.vocab_items ?? []).map((v) => ({
      lesson_id: lessonIdByOrder.get(l.order_index)!,
      arabic: v.arabic ?? null,
      transliteration: v.transliteration,
      french: v.french,
    }))
  );
  if (vocabRows.length) {
    fail('insert vocab', (await supabase.from('vocab_items').insert(vocabRows)).error);
  }

  const quizRows = lessons.flatMap((l) =>
    (l.quiz_questions ?? []).map((q) => ({
      module_id: module.id,
      question_text: q.question,
      type: 'comprehension',
      options: { question_fr: q.question_fr },
      correct_answer: q.answer,
    }))
  );
  if (quizRows.length) {
    fail('insert quiz', (await supabase.from('quiz_questions').insert(quizRows)).error);
  }

  console.log(
    `✓ ${module.id.padEnd(18)} ${lessons.length} leçons (${added.length} nouvelles, ${removed.length} retirées), ${vocabRows.length} vocab, ${quizRows.length} quiz`
  );
  return { lessons: lessons.length, vocab: vocabRows.length, quiz: quizRows.length };
}

async function main() {
  // Seuls les modules et la référence de conjugaison sont du contenu : `data/` contient
  // aussi des fichiers générés (exercices, manifeste audio) qui n'ont rien à faire en base.
  const files = (await readdir(DATA_DIR))
    .filter(
      (f) => (f.startsWith('module-') && f.endsWith('.json')) || f === 'conjugations-core.json'
    )
    // `--only module-06` : ne recharge que ce fichier (le vocabulaire et les questions du
    // module sont remplacés, pas ceux des 29 autres).
    .filter((f) => !ONLY || f === ONLY || f === `${ONLY}.json`)
    .sort();
  if (files.length === 0) throw new Error(`Aucun fichier de contenu ne correspond à « ${ONLY} »`);
  const total = { modules: 0, lessons: 0, vocab: 0, quiz: 0 };

  for (const file of files) {
    const raw = JSON.parse(await readFile(path.join(DATA_DIR, file), 'utf-8'));
    const payload: ImportPayload = file.startsWith('module-')
      ? (raw as JsonModuleFile)
      : buildConjugationsPayload(raw as ConjugationsFile);

    const counts = await importPayload(payload);
    total.modules += 1;
    total.lessons += counts.lessons;
    total.vocab += counts.vocab;
    total.quiz += counts.quiz;
  }

  console.log(
    `\n${total.modules} modules · ${total.lessons} leçons · ${total.vocab} items de vocabulaire · ${total.quiz} questions`
  );
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
