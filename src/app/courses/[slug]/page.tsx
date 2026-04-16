import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EnrollButton from '@/components/enroll-button'

type CoursePageProps = {
  params: Promise<{ slug: string }>
}

type Course = {
  id: number
  title: string
  slug: string
  description: string | null
  is_free: boolean | null
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
    redirect(`/login?next=/courses/${slug}`)
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, slug, description, is_free')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (courseError || !course) {
    notFound()
  }

  const typedCourse = course as Course

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', typedCourse.id)
    .maybeSingle()

  const isEnrolled = Boolean(enrollment)

  if (!isEnrolled) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl">
          <Link href="/dashboard" className="text-sm font-medium text-blue-600 underline">
            ← Back to dashboard
          </Link>

          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-bold text-slate-900">{typedCourse.title}</h1>
            <p className="mt-4 text-slate-700">
              {typedCourse.description || 'No description yet.'}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                {typedCourse.is_free ? 'Free course' : 'Course'}
              </span>
            </div>

            <div className="mt-8">
              <p className="mb-4 text-slate-700">
                Enroll in this course to access the lessons.
              </p>
              <EnrollButton courseId={typedCourse.id} />
            </div>
          </div>
        </div>
      </main>
    )
  }

  const { data: lessonsData } = await supabase
    .from('lessons')
    .select('id, title, slug, position')
    .eq('course_id', typedCourse.id)
    .eq('is_published', true)
    .order('position', { ascending: true })

  const lessons = (lessonsData ?? []) as Lesson[]
  const lessonIds = lessons.map((lesson) => lesson.id)

  let progressRows: Progress[] = []
  if (lessonIds.length > 0) {
    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', user.id)
      .in('lesson_id', lessonIds)

    progressRows = (progressData ?? []) as Progress[]
  }

  const completedLessonIds = new Set(
    progressRows.filter((row) => row.completed).map((row) => row.lesson_id)
  )

  const completedCount = lessons.filter((lesson) =>
    completedLessonIds.has(lesson.id)
  ).length

  const progressPercent =
    lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0

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

            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              {progressPercent}% complete
            </span>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>
                {completedCount} of {lessons.length} lessons completed
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

          {lessons.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p>No lessons published yet.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {lessons.map((lesson) => {
                const isCompleted = completedLessonIds.has(lesson.id)

                return (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div>
                      <p className="text-sm text-slate-500">Lesson {lesson.position}</p>
                      <h3 className="font-semibold text-slate-900">{lesson.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {isCompleted ? 'Completed' : 'Not completed yet'}
                      </p>
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