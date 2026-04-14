import Link from 'next/link'
import { CircleCheckBig, CirclePlay } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type CoursePageProps = {
  params: Promise<{ slug: string }>
}

type Course = {
  id: number
  title: string
  slug: string
  description: string | null
}

type Lesson = {
  id: number
  title: string
  slug: string
  position: number
}

type Progress = {
  lesson_id: number
  completed: boolean
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, slug, description')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (courseError || !course) {
    notFound()
  }

  const typedCourse = course as Course

  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, title, slug, position')
    .eq('course_id', typedCourse.id)
    .eq('is_published', true)
    .order('position', { ascending: true })

  if (lessonsError) {
    console.error('Error loading lessons:', lessonsError.message)
  }

  const safeLessons = (lessons ?? []) as Lesson[]
  const lessonIds = safeLessons.map((lesson) => lesson.id)

  let progressRows: Progress[] = []
  if (lessonIds.length > 0) {
    const { data: progressData, error: progressError } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', user.id)
      .in('lesson_id', lessonIds)

    if (progressError) {
      console.error('Error loading progress:', progressError.message)
    } else {
      progressRows = (progressData ?? []) as Progress[]
    }
  }

  const completedLessonIds = new Set(
    progressRows.filter((row) => row.completed).map((row) => row.lesson_id)
  )

  const completedCount = safeLessons.filter((lesson) =>
    completedLessonIds.has(lesson.id)
  ).length

  const progressPercent =
    safeLessons.length > 0
      ? Math.round((completedCount / safeLessons.length) * 100)
      : 0

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-sm font-medium text-blue-600 underline">
          ← Back to dashboard
        </Link>

        <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{typedCourse.title}</h1>
              <p className="mt-3 text-slate-700">
                {typedCourse.description || 'No description yet.'}
              </p>
            </div>

            <div className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              {progressPercent}% complete
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>
                {completedCount} of {safeLessons.length} lessons completed
              </span>
              <span>{progressPercent}%</span>
            </div>

            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-2xl font-bold text-slate-900">Lessons</h2>

          {safeLessons.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p>No lessons published yet.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {safeLessons.map((lesson) => {
                const isCompleted = completedLessonIds.has(lesson.id)

                return (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`mt-0.5 rounded-2xl p-2 ${
                          isCompleted
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {isCompleted ? (
                          <CircleCheckBig className="h-6 w-6" />
                        ) : (
                          <CirclePlay className="h-6 w-6" />
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Lesson {lesson.position}</p>
                        <h3 className="font-semibold text-slate-900">{lesson.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {isCompleted ? 'Completed' : 'Not completed yet'}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/lessons/${lesson.slug}`}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                    >
                      {isCompleted ? 'Review lesson' : 'Open lesson'}
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}