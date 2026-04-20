import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/logout-button'
import EnrollButton from '@/components/enroll-button'
import UserAvatar from '@/components/user-avatar'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = profile?.role === 'admin'
  const isTeacher = profile?.role === 'teacher'
  const canAccessTeacherHub = isTeacher || isAdmin

  const { data: allCoursesData } = await supabase
    .from('courses')
    .select('id, title, slug, description')
    .eq('is_published', true)
    .eq('is_free', true)
    .order('created_at', { ascending: false })

  const allCourses = (allCoursesData ?? []) as Course[]

  const { data: enrollmentsData } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', user.id)

  const enrolledCourseIds = new Set(
    (enrollmentsData ?? []).map((row) => row.course_id as number)
  )

  const myCourses = allCourses.filter((course) =>
    enrolledCourseIds.has(course.id)
  )

  const availableCourses = allCourses.filter(
    (course) => !enrolledCourseIds.has(course.id)
  )

  const myCourseIds = myCourses.map((course) => course.id)

  let lessons: Lesson[] = []

  if (myCourseIds.length > 0) {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, course_id, title, slug, position')
      .in('course_id', myCourseIds)
      .eq('is_published', true)
      .order('position', { ascending: true })

    lessons = (lessonsData ?? []) as Lesson[]
  }

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

  const myCourseCards: CourseCard[] = myCourses.map((course) => {
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

  const continueCourse =
    myCourseCards.find(
      (course) =>
        course.nextLesson && course.completedLessons > 0 && course.progress < 100
    ) ??
    myCourseCards.find((course) => course.nextLesson) ??
    null

  const totalLessons = lessons.length
  const totalCompletedLessons = Array.from(completedLessonIds).length

  const overallProgress =
    totalLessons > 0
      ? Math.round((totalCompletedLessons / totalLessons) * 100)
      : 0

  const displayName =
    profile?.full_name ||
    user.email?.split('@')[0]?.replace(/[._-]/g, ' ') ||
    'Student'

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <UserAvatar
              src={profile?.avatar_url}
              name={profile?.full_name}
              email={profile?.email || user.email}
              size="md"
            />

            <div>
              <p className="text-sm font-medium text-slate-500">
                Student Dashboard
              </p>
              <h1 className="text-2xl font-bold">
                Welcome back,{' '}
                <span className="text-blue-600">{displayName}</span>
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/profile"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
            >
              My Profile
            </Link>

            {canAccessTeacherHub && (
              <Link
                href="/teacher"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Teacher Hub
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Admin Panel
              </Link>
            )}

            <LogoutButton />
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-gradient-to-r from-slate-900 to-blue-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 md:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
              Torres Academy
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Your learning space is ready.
            </h2>

            <p className="mt-4 max-w-2xl text-slate-200">
              Enroll in free courses, continue your lessons, and track your
              progress in one place.
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
                  href="#available-courses"
                  className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Explore courses
                </Link>
              )}

              <Link
                href="/profile"
                className="rounded-xl border border-white/25 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Edit profile
              </Link>

              {canAccessTeacherHub && (
                <Link
                  href="/teacher"
                  className="rounded-xl border border-white/25 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Go to Teacher Hub
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
            <p className="text-sm font-semibold text-blue-100">Your progress</p>

            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-200">Completed lessons</span>
                <span className="font-semibold text-white">
                  {totalCompletedLessons}/{totalLessons}
                </span>
              </div>

              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-blue-400"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-2xl font-bold">{myCourseCards.length}</p>
                <p className="mt-1 text-sm text-slate-200">My courses</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-2xl font-bold">{availableCourses.length}</p>
                <p className="mt-1 text-sm text-slate-200">Available</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">My Courses</h2>
            <p className="text-sm text-slate-600">
              Courses you already enrolled in
            </p>
          </div>

          {myCourseCards.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-slate-700">
                You have not enrolled in any course yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {myCourseCards.map((course) => (
                <article
                  key={course.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {course.title}
                      </h3>
                      <p className="mt-2 text-slate-700">
                        {course.description || 'No description yet.'}
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      {course.progress}%
                    </span>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>
                        {course.completedLessons} of {course.totalLessons}{' '}
                        lessons completed
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

      <section id="available-courses" className="pb-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Available Courses</h2>
            <p className="text-sm text-slate-600">
              Free published courses students can join
            </p>
          </div>

          {availableCourses.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-slate-700">No available courses right now.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {availableCourses.map((course) => (
                <article
                  key={course.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="text-xl font-bold text-slate-900">
                    {course.title}
                  </h3>

                  <p className="mt-2 text-slate-700">
                    {course.description || 'No description yet.'}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/courses/${course.slug}`}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                    >
                      View details
                    </Link>

                    <EnrollButton courseId={course.id} />
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