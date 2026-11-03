import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LessonViewer from '@/components/LessonViewer';
import LessonReadToggle from '@/components/LessonReadToggle';
import { toggleLessonRead } from '../actions';
import { getUser } from '@/lib/auth';
import { getReadLessons } from '@/lib/progress';
import FeedbackActions from '@/components/FeedbackActions';
import HashHighlight from '@/components/HashHighlight';
import { SITE } from '@/lib/site-config';
import { getLesson, getModule, getModuleLessons, getVocabLite } from '@/lib/content';
import { describeLesson, openGraphFor } from '@/lib/meta';
import JsonLd from '@/components/JsonLd';
import { lessonData } from '@/lib/structured-data';
import LessonListening from '@/components/LessonListening';
import { hashSeed, listenable, listeningSeries } from '@/lib/listening';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}): Promise<Metadata> {
  const { id, lessonId } = await params;
  const [data, mod] = await Promise.all([getLesson(lessonId), getModule(id)]);

  if (!data || data.module_id !== id) return { title: 'Leçon introuvable' };
  // Le numéro de jour désambiguïse les titres qui se répètent d'un module à l'autre
  // (« Mini-dialogue », « Exemples et mise en pratique »…).
  const title = data.day !== null ? `${data.title} · jour ${data.day}` : data.title;
  const description = describeLesson(data.content_markdown, data.title, mod?.title ?? id, data.vocab_items);
  return {
    title,
    description,
    openGraph: openGraphFor(title, description, `/modules/${id}/${lessonId}`),
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;

  const [lesson, siblings, user, allVocab, mod] = await Promise.all([
    getLesson(lessonId),
    getModuleLessons(id),
    getUser(),
    getVocabLite(),
    getModule(id),
  ]);
  const readLessons = await getReadLessons(user?.id ?? null, id);

  if (!lesson || lesson.module_id !== id) notFound();

  // Exercice d'écoute sur les mots de la leçon (leurres pris d'abord dans la leçon, puis
  // dans tout le vocabulaire). Graine = la leçon : même ordre à chaque visite, ce qui garde
  // le rendu serveur et l'hydratation d'accord ; « Recommencer » mélange côté client.
  const listening =
    listenable(lesson.vocab_items).length >= 2
      ? listeningSeries(lesson.vocab_items, allVocab, allVocab, hashSeed(lesson.id), 20)
      : [];

  const at = siblings.findIndex((l) => l.id === lessonId);
  const prev = at > 0 ? siblings[at - 1] : null;
  const next = at < siblings.length - 1 ? siblings[at + 1] : null;

  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-8 sm:px-8">
      {mod && (
        <JsonLd
          data={lessonData(
            mod,
            lesson,
            describeLesson(lesson.content_markdown, lesson.title, mod.title, lesson.vocab_items)
          )}
        />
      )}
      <Link
        href={`/modules/${id}`}
        className="inline-block py-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
      >
        ← Retour au module
      </Link>

      {/* Met en évidence la fiche du mot quand on arrive depuis la recherche globale. */}
      <HashHighlight />

      <div className="mt-4">
        <LessonViewer lesson={lesson} vocab={lesson.vocab_items} />
      </div>

      {listening.length >= 2 && <LessonListening questions={listening} />}

      <div className="mt-10 flex flex-col gap-4 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <LessonReadToggle
          moduleId={id}
          orderIndex={lesson.order_index}
          initialRead={readLessons.has(lesson.order_index)}
          isLoggedIn={!!user}
          onToggle={toggleLessonRead}
        />

        {/*
          Signalement contextuel : l'objet et le corps du message portent déjà la leçon,
          le module et l'URL. Sans ce pré-remplissage, un retour arrive sous la forme
          « il y a une faute dans la leçon sur les couleurs » et il faut retrouver
          laquelle — c'est ce qui décourage d'y donner suite.
        */}
        <FeedbackActions
          variant="inline"
          subject={`Coquille — ${lesson.title}`}
          body={
            `Leçon : ${lesson.title}${lesson.day !== null ? ` (jour ${lesson.day})` : ''}\n` +
            `Module : ${id}\n` +
            `Page : ${SITE.url}/modules/${id}/${lessonId}\n\n` +
            `Ce qui me semble incorrect :\n\n`
          }
        />
      </div>

      {/* Précédent / suivant en cartes plutôt qu'en liens nus : c'est le geste le plus
          fréquent d'une leçon à l'autre, et une cible de 1,5 ligne de texte se rate au
          doigt. Le titre de la leçon visée y est lisible avant le clic. */}
      <nav className="mt-8 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/modules/${id}/${prev.id}`}
            className="card-sand card-link p-4 text-left"
          >
            <span className="eyebrow">← Précédent</span>
            <span className="display mt-1 block text-sm leading-snug">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/modules/${id}/${next.id}`}
            className="card-sand card-link p-4 text-right sm:col-start-2"
          >
            <span className="eyebrow">Suivant →</span>
            <span className="display mt-1 block text-sm leading-snug">{next.title}</span>
          </Link>
        )}
      </nav>
    </main>
  );
}
