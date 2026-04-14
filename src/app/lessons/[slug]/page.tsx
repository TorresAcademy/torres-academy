import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MarkCompleteButton from '@/components/mark-complete-button'

type LessonPageProps = {
  params: Promise<{ slug: string }>
}

type Lesson = {
  id: number
  title: string
  slug: string
  content: string | null
  video_url: string | null
  position: number
  course_id: number
}

type Course = {
  title: string
  slug: string
}

type Progress = {
  completed: boolean
}

type NextLesson = {
  slug: string
  title: string
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, title, slug, content, video_url, position, course_id')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (lessonError || !lesson) {
    notFound()
  }

  const typedLesson = lesson as Lesson

  const { data: course } = await supabase
    .from('courses')
    .select('title, slug')
    .eq('id', typedLesson.course_id)
    .single()

  const typedCourse = course as Course | null

  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('completed')
    .eq('user_id', user.id)
    .eq('lesson_id', typedLesson.id)
    .maybeSingle()

  const typedProgress = progress as Progress | null

  const { data: nextLessons } = await supabase
    .from('lessons')
    .select('slug, title')
    .eq('course_id', typedLesson.course_id)
    .eq('is_published', true)
    .gt('position', typedLesson.position)
    .order('position', { ascending: true })
    .limit(1)

  const nextLesson = (nextLessons?.[0] ?? null) as NextLesson | null

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href={typedCourse ? `/courses/${typedCourse.slug}` : '/dashboard'}
          className="text-sm underline"
        >
          ← Back
        </Link>

        <div className="mt-4">
          <p className="text-sm text-gray-500">Lesson {typedLesson.position}</p>
          <h1 className="text-3xl font-bold">{typedLesson.title}</h1>
          {typedCourse && (
            <p className="mt-2 text-sm text-gray-600">{typedCourse.title}</p>
          )}
        </div>

        {typedLesson.video_url && (
          <div className="mt-6">
            <a
              href={typedLesson.video_url}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Watch lesson video
            </a>
          </div>
        )}

        <article className="mt-8 rounded-2xl border p-6">
          <div className="prose max-w-none whitespace-pre-wrap">
            {typedLesson.content || 'No content added yet.'}
          </div>

          <MarkCompleteButton
            lessonId={typedLesson.id}
            initialCompleted={typedProgress?.completed ?? false}
          />
        </article>

        {nextLesson && (
          <div className="mt-6">
            <Link
              href={`/lessons/${nextLesson.slug}`}
              className="rounded-lg border px-4 py-2 font-medium inline-block"
            >
              Next lesson: {nextLesson.title}
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}