import 'server-only';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { Lesson, Module, VocabItem } from '@/lib/types';

/**
 * Le contenu pédagogique, servi depuis le cache de données de Next plutôt que relu dans
 * Supabase à chaque visite.
 *
 * Pourquoi : modules, leçons, vocabulaire et questions ne changent qu'au prochain
 * `npm run import` — ils sont identiques pour tous les visiteurs et d'une visite à
 * l'autre. Les relire à chaque page coûtait un aller-retour vers la base par requête,
 * souvent plusieurs à la suite (mesuré en production : 0,6 à 2 s de réponse sur les pages
 * de contenu, contre 0,15 s pour une page sans base).
 *
 * Seules les données PROPRES À L'UTILISATEUR (leçons lues, scores, série) restent lues en
 * direct, avec le client à cookies de `lib/supabase/server.ts`.
 *
 * Client sans cookies : le contenu est en lecture publique (RLS, migration 003), et une
 * fonction mise en cache ne peut de toute façon pas lire les cookies de la requête.
 *
 * Fraîcheur : une heure au plus. Après un import, le cache se vide tout seul dans l'heure ;
 * pour l'immédiat, `revalidateTag(CONTENT_TAG)` (ou un redéploiement) le purge.
 */

export const CONTENT_TAG = 'content';
const REVALIDATE_SECONDS = 3600;

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/**
 * Met une lecture en cache. Une erreur est LEVÉE, jamais renvoyée : `unstable_cache` ne
 * garde pas un appel qui échoue, alors qu'un tableau vide renvoyé par erreur serait resté
 * en cache une heure.
 */
function cached<A extends unknown[], R>(key: string, fn: (...args: A) => Promise<R>) {
  return unstable_cache(fn, ['content', key], {
    revalidate: REVALIDATE_SECONDS,
    tags: [CONTENT_TAG],
  });
}

function fail(what: string, message: string): never {
  throw new Error(`Lecture du contenu (${what}) : ${message}`);
}

// ---------------------------------------------------------------------------
// Modules et leçons
// ---------------------------------------------------------------------------

export type ModuleWithCount = Module & { lessonCount: number };

/** Tous les modules, dans l'ordre du programme, avec leur nombre de leçons. */
export const getModules = cached('modules:v1', async (): Promise<ModuleWithCount[]> => {
  const { data, error } = await db()
    .from('modules')
    .select('*, lessons(count)')
    .order('order_index')
    .returns<(Module & { lessons: { count: number }[] })[]>();
  if (error) fail('modules', error.message);

  return (data ?? []).map(({ lessons, ...m }) => ({ ...m, lessonCount: lessons[0]?.count ?? 0 }));
});

export async function getModule(id: string): Promise<ModuleWithCount | null> {
  return (await getModules()).find((m) => m.id === id) ?? null;
}

export type LessonLink = Pick<Lesson, 'id' | 'module_id' | 'day' | 'title' | 'section' | 'order_index'>;

/** Le sommaire de toutes les leçons (sans leur contenu) : 141 lignes, quelques Ko. */
export const getLessonLinks = cached('lesson-links:v1', async (): Promise<LessonLink[]> => {
  const { data, error } = await db()
    .from('lessons')
    .select('id, module_id, day, title, section, order_index')
    .order('module_id')
    .order('order_index')
    .returns<LessonLink[]>();
  if (error) fail('sommaire des leçons', error.message);
  return data ?? [];
});

/** Les leçons d'un module, dans l'ordre. */
export async function getModuleLessons(moduleId: string): Promise<LessonLink[]> {
  return (await getLessonLinks()).filter((l) => l.module_id === moduleId);
}

export type LessonWithVocab = Lesson & { vocab_items: VocabItem[] };

/** Levée quand la leçon n'existe pas, pour que `unstable_cache` ne garde pas la réponse. */
class LessonNotFound extends Error {}

const readLesson = cached('lesson:v1', async (lessonId: string): Promise<LessonWithVocab> => {
  const { data, error } = await db()
    .from('lessons')
    .select('*, vocab_items(*)')
    .eq('id', lessonId)
    .maybeSingle<LessonWithVocab>();
  if (error) fail('leçon', error.message);
  if (!data) throw new LessonNotFound();
  return data;
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Une leçon complète, avec son vocabulaire, ou `null` si elle n'existe pas.
 *
 * L'absence n'est pas mise en cache : un `null` gardé une heure faisait répondre 404 à
 * une leçon pourtant présente en base (vu en local après un import). Une adresse qui n'a
 * pas la forme d'un UUID est écartée avant la requête : Postgres la refuse avec une
 * erreur, qui affichait la page d'erreur au lieu de « leçon introuvable ».
 */
export async function getLesson(lessonId: string): Promise<LessonWithVocab | null> {
  if (!UUID.test(lessonId)) return null;
  try {
    return await readLesson(lessonId);
  } catch (e) {
    if (e instanceof LessonNotFound) return null;
    throw e;
  }
}

/** Les trois compteurs de l'accueil. */
export const getContentCounts = cached('counts:v1', async () => {
  const client = db();
  const [modules, lessons, vocab] = await Promise.all([
    client.from('modules').select('*', { count: 'exact', head: true }),
    client.from('lessons').select('*', { count: 'exact', head: true }),
    client.from('vocab_items').select('*', { count: 'exact', head: true }),
  ]);
  for (const r of [modules, lessons, vocab]) if (r.error) fail('compteurs', r.error.message);
  return {
    modules: modules.count ?? 0,
    lessons: lessons.count ?? 0,
    vocab: vocab.count ?? 0,
  };
});

// ---------------------------------------------------------------------------
// Questions et vocabulaire
// ---------------------------------------------------------------------------

export type QuizRow = {
  id: string;
  question_text: string;
  type: string;
  options: { choices?: string[]; item?: string } | null;
  correct_answer: string;
  difficulty: string | null;
};

/** La banque de questions d'un module (toutes sortes confondues). */
export const getQuizBank = cached('quiz-bank:v1', async (moduleId: string): Promise<QuizRow[]> => {
  const { data, error } = await db()
    .from('quiz_questions')
    .select('id, question_text, type, options, correct_answer, difficulty')
    .eq('module_id', moduleId)
    .returns<QuizRow[]>();
  if (error) fail('questions', error.message);
  return data ?? [];
});

/** Les douze questions du test de positionnement (celles sans module). */
export const getPlacementQuestions = cached('placement:v1', async (): Promise<QuizRow[]> => {
  const { data, error } = await db()
    .from('quiz_questions')
    .select('id, question_text, type, options, correct_answer, difficulty')
    .is('module_id', null)
    .returns<QuizRow[]>();
  if (error) fail('test de positionnement', error.message);
  return data ?? [];
});

export type VocabLite = Pick<VocabItem, 'id' | 'arabic' | 'transliteration' | 'french' | 'lesson_id'>;

/** Tout le vocabulaire, réduit à ce qu'il faut pour traduire une proposition de QCM. */
export const getVocabLite = cached('vocab-lite:v2', async (): Promise<VocabLite[]> => {
  const { data, error } = await db()
    .from('vocab_items')
    .select('id, arabic, transliteration, french, lesson_id')
    .returns<VocabLite[]>();
  if (error) fail('vocabulaire', error.message);
  return data ?? [];
});

/** Le client sans cookies, pour les lectures publiques mises en cache ailleurs. */
export { db as contentClient };
