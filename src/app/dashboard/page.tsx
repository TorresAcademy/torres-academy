// src/app/dashboard/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  BookOpen,
  CircleCheckBig,
  PlayCircle,
  TrendingUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/logout-button'

type Course = {
  id: number
  title: string
  slug: string
  description: string | null
}

type Lesson = {
  id: number
  course_id: number
  title: string
  slug: string
  position: number
}

type Progress = {
  lesson_id: number
  completed: boolean
}

type CourseCard = {
  id: number
  title: string
  slug: string
  description: string | null
  totalLessons: number
  completedLessons: number
  progress: number
  nextLesson: Lesson | null
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: coursesData, error: coursesError } = await supabase
    .from('courses')
    .select('id, title, slug, description')
    .eq('is_published', true)
    .eq('is_free', true)
    .order('created_at', { ascending: false })

  if (coursesError) {
    console.error('Error loading courses:', coursesError.message)
  }

  const courses = (coursesData ?? []) as Course[]
  const courseIds = courses.map((course) => course.id)

  let lessons: Lesson[] = []
  if (courseIds.length > 0) {
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, course_id, title, slug, position')
      .in('course_id', courseIds)
      .eq('is_published', true)
      .order('position', { ascending: true })

    if (lessonsError) {
      console.error('Error loading lessons:', lessonsError.message)
    } else {
      lessons = (lessonsData ?? []) as Lesson[]
    }
  }

  const lessonIds = lessons.map((lesson) => lesson.id)

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

  const courseCards: CourseCard[] = courses.map((course) => {
    const courseLessons = lessons
      .filter((lesson) => lesson.course_id === course.id)
      .sort((a, b) => a.position - b.position)

    const completedLessons = courseLessons.filter((lesson) =>
      completedLessonIds.has(lesson.id)
    ).length

    const totalLessons = courseLessons.length
    const progress =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    const nextLesson =
      courseLessons.find((lesson) => !completedLessonIds.has(lesson.id)) ?? null

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      totalLessons,
      completedLessons,
      progress,
      nextLesson,
    }
  })

  const totalCourses = courseCards.length
  const totalLessons = lessons.length
  const totalCompletedLessons = Array.from(completedLessonIds).length
  const startedCourses = courseCards.filter((course) => course.completedLessons > 0).length

  const continueCourse =
    courseCards.find(
      (course) =>
        course.nextLesson && course.completedLessons > 0 && course.progress < 100
    ) ??
    courseCards.find((course) => course.nextLesson) ??
    null

  const firstName =
    user.email?.split('@')[0]?.replace(/[._-]/g, ' ') || 'Student'

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium text-slate-500">Student Dashboard</p>
            <h1 className="text-2xl font-bold">
              Welcome back, <span className="text-blue-600">{firstName}</span>
            </h1>
          </div>

          <LogoutButton />
        </div>
      </section>

      <section className="border-b border-slate-200 bg-gradient-to-r from-slate-900 to-blue-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 md:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
              Torres Academy
            </p>
            <h2 className="mt-3 text-3xl font-bold">
              Keep learning, one lesson at a time.
            </h2>
            <p className="mt-4 max-w-2xl text-slate-200">
              Access your free training, continue your lessons, and track your
              progress inside your student portal.
            </p>

            <div className="mt-6 flex flex-wrap gap-4">
              {continueCourse?.nextLesson ? (
                <Link
                  href={`/lessons/${continueCourse.nextLesson.slug}`}
                  className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Continue learning
                </Link>
              ) : (
                <Link
                  href="/courses"
                  className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Explore courses
                </Link>
              )}

              <Link
                href="/free-training"
                className="rounded-xl border border-white/25 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                View free training
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
            <p className="text-sm font-semibold text-blue-100">Your progress</p>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-200">Lessons completed</span>
                  <span className="font-semibold text-white">
                    {totalCompletedLessons}/{totalLessons}
                  </span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-blue-400"
                    style={{
                      width:
                        totalLessons > 0
                          ? `${Math.round((totalCompletedLessons / totalLessons) * 100)}%`
                          : '0%',
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-bold">{startedCourses}</p>
                  <p className="mt-1 text-sm text-slate-200">Courses started</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-bold">{totalCourses}</p>
                  <p className="mt-1 text-sm text-slate-200">Courses available</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="inline-flex rounded-2xl bg-blue-100 p-3 text-blue-700">
                <BookOpen className="h-6 w-6" />
              </div>
              <p className="mt-4 text-2xl font-bold">{totalCourses}</p>
              <p className="mt-1 text-slate-600">Available courses</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="inline-flex rounded-2xl bg-blue-100 p-3 text-blue-700">
                <CircleCheckBig className="h-6 w-6" />
              </div>
              <p className="mt-4 text-2xl font-bold">{totalCompletedLessons}</p>
              <p className="mt-1 text-slate-600">Lessons completed</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="inline-flex rounded-2xl bg-blue-100 p-3 text-blue-700">
                <TrendingUp className="h-6 w-6" />
              </div>
              <p className="mt-4 text-2xl font-bold">
                {totalLessons > 0
                  ? Math.round((totalCompletedLessons / totalLessons) * 100)
                  : 0}
                %
              </p>
              <p className="mt-1 text-slate-600">Overall progress</p>
            </div>
          </div>
        </div>
      </section>

      {continueCourse?.nextLesson && (
        <section>
          <div className="mx-auto max-w-6xl px-6 pb-4">
            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                Continue learning
              </p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">
                {continueCourse.title}
              </h3>
              <p className="mt-2 text-slate-700">
                Next lesson: {continueCourse.nextLesson.title}
              </p>

              <div className="mt-5 flex flex-wrap gap-4">
                <Link
                  href={`/lessons/${continueCourse.nextLesson.slug}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  <PlayCircle className="h-5 w-5" />
                  Continue lesson
                </Link>

                <Link
                  href={`/courses/${continueCourse.slug}`}
                  className="rounded-xl border border-blue-200 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                >
                  Open course
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Your Courses</h2>
            <p className="text-sm text-slate-600">Track your progress and continue learning</p>
          </div>

          {courseCards.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-slate-700">No courses published yet.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {courseCards.map((course) => (
                <article
                  key={course.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{course.title}</h3>
                      <p className="mt-2 text-slate-700">
                        {course.description || 'No description yet.'}
                      </p>
                    </div>

                    <div className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                      {course.progress}%
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>
                        {course.completedLessons} of {course.totalLessons} lessons completed
                      </span>
                      <span>{course.progress}%</span>
                    </div>

                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/courses/${course.slug}`}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                    >
                      View course
                    </Link>

                    {course.nextLesson && (
                      <Link
                        href={`/lessons/${course.nextLesson.slug}`}
                        className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                      >
                        {course.completedLessons > 0 ? 'Continue' : 'Start'}
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}