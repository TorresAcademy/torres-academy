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
  id: number
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

type Resource = {
  id: number
  title: string
  resource_type: string
  file_url: string
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/lessons/${slug}`)
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
    .select('id, title, slug')
    .eq('id', typedLesson.course_id)
    .single()

  const typedCourse = course as Course | null

  if (!typedCourse) {
    notFound()
  }

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', typedCourse.id)
    .maybeSingle()

  if (!enrollment) {
    redirect(`/courses/${typedCourse.slug}`)
  }

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

  const { data: resourcesData } = await supabase
    .from('resources')
    .select('id, title, resource_type, file_url')
    .eq('lesson_id', typedLesson.id)
    .order('created_at', { ascending: false })

  const nextLesson = (nextLessons?.[0] ?? null) as NextLesson | null
  const resources = (resourcesData ?? []) as Resource[]

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/courses/${typedCourse.slug}`}
          className="text-sm font-medium text-blue-600 underline"
        >
          ← Back to course
        </Link>

        <div className="mt-4">
          <p className="text-sm text-slate-500">Lesson {typedLesson.position}</p>
          <h1 className="text-3xl font-bold text-slate-900">{typedLesson.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{typedCourse.title}</p>
        </div>

        {typedLesson.video_url && (
          <div className="mt-6">
            <a
              href={typedLesson.video_url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-blue-600 underline"
            >
              Watch lesson video
            </a>
          </div>
        )}

        <article className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="whitespace-pre-wrap text-slate-800">
            {typedLesson.content || 'No content added yet.'}
          </div>

          <MarkCompleteButton
            lessonId={typedLesson.id}
            initialCompleted={typedProgress?.completed ?? false}
          />
        </article>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Resources</h2>

          {resources.length === 0 ? (
            <p className="mt-4 text-slate-600">No resources added yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-semibold text-slate-900">{resource.title}</h3>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      {resource.resource_type}
                    </span>
                  </div>

                  <a
                    href={resource.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block font-medium text-blue-600 underline break-all"
                  >
                    Open resource
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {nextLesson && (
          <div className="mt-6">
            <Link
              href={`/lessons/${nextLesson.slug}`}
              className="inline-block rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
            >
              Next lesson: {nextLesson.title}
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}