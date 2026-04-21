import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/logout-button'
import UserAvatar from '@/components/user-avatar'

type Profile = {
  id: string
  email: string | null
  full_name: string | null
  role: string | null
  avatar_url: string | null
}

type Course = {
  id: number
  title: string
  slug: string
  description: string | null
  is_free: boolean | null
  is_published: boolean | null
}

type Lesson = {
  id: number
  course_id: number
  title: string
  slug: string
  position: number
  is_published: boolean | null
}

type Enrollment = {
  course_id: number
}

type ProgressRow = {
  lesson_id: number
  completed: boolean | null
}

type Certificate = {
  id: number
  course_id: number
  verification_code: string
  status: string
  issued_at: string
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/dashboard')
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  const profile = profileData as Profile | null

  const displayName =
    profile?.full_name || profile?.email || user.email || 'Student'

  const role = profile?.role || 'student'
  const isAdmin = role === 'admin'
  const isTeacher = role === 'teacher' || role === 'admin'

  const { data: enrollmentsData } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', user.id)

  const enrollments = (enrollmentsData ?? []) as Enrollment[]
  const enrolledCourseIds = enrollments.map((item) => item.course_id)

  let enrolledCourses: Course[] = []

  if (enrolledCourseIds.length > 0) {
    const { data: enrolledCoursesData } = await supabase
      .from('courses')
      .select('id, title, slug, description, is_free, is_published')
      .in('id', enrolledCourseIds)
      .order('title', { ascending: true })

    enrolledCourses = (enrolledCoursesData ?? []) as Course[]
  }

  const { data: availableCoursesData } = await supabase
    .from('courses')
    .select('id, title, slug, description, is_free, is_published')
    .eq('is_published', true)
    .eq('is_free', true)
    .order('title', { ascending: true })

  const availableCourses = ((availableCoursesData ?? []) as Course[]).filter(
    (course) => !enrolledCourseIds.includes(course.id)
  )

  const allVisibleCourseIds = [
    ...new Set([
      ...enrolledCourses.map((course) => course.id),
      ...availableCourses.map((course) => course.id),
    ]),
  ]

  let lessons: Lesson[] = []

  if (allVisibleCourseIds.length > 0) {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, course_id, title, slug, position, is_published')
      .in('course_id', allVisibleCourseIds)
      .eq('is_published', true)
      .order('course_id', { ascending: true })
      .order('position', { ascending: true })

    lessons = (lessonsData ?? []) as Lesson[]
  }

  const lessonIds = lessons.map((lesson) => lesson.id)

  let progressRows: ProgressRow[] = []

  if (lessonIds.length > 0) {
    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', user.id)
      .in('lesson_id', lessonIds)

    progressRows = (progressData ?? []) as ProgressRow[]
  }

  let certificates: Certificate[] = []

  if (enrolledCourseIds.length > 0) {
    const { data: certificatesData } = await supabase
      .from('certificates')
      .select('id, course_id, verification_code, status, issued_at')
      .eq('user_id', user.id)
      .in('course_id', enrolledCourseIds)

    certificates = (certificatesData ?? []) as Certificate[]
  }

  const completedLessonIds = new Set(
    progressRows
      .filter((row) => row.completed)
      .map((row) => row.lesson_id)
  )

  const issuedCertificateCourseIds = new Set(
    certificates
      .filter((certificate) => certificate.status === 'issued')
      .map((certificate) => certificate.course_id)
  )

  function getCourseCertificate(courseId: number) {
    return (
      certificates.find(
        (certificate) =>
          certificate.course_id === courseId && certificate.status === 'issued'
      ) ?? null
    )
  }

  function getCourseLessons(courseId: number) {
    return lessons.filter((lesson) => lesson.course_id === courseId)
  }

  function getCourseProgress(courseId: number) {
    const courseLessons = getCourseLessons(courseId)
    const totalLessons = courseLessons.length

    if (totalLessons === 0) {
      return {
        totalLessons: 0,
        completedLessons: 0,
        percentage: 0,
        firstLessonSlug: null as string | null,
        nextLessonSlug: null as string | null,
        isComplete: false,
      }
    }

    const completedLessons = courseLessons.filter((lesson) =>
      completedLessonIds.has(lesson.id)
    ).length

    const percentage = Math.round((completedLessons / totalLessons) * 100)

    const firstLessonSlug = courseLessons[0]?.slug ?? null

    const nextIncompleteLesson =
      courseLessons.find((lesson) => !completedLessonIds.has(lesson.id)) ??
      courseLessons[0]

    return {
      totalLessons,
      completedLessons,
      percentage,
      firstLessonSlug,
      nextLessonSlug: nextIncompleteLesson?.slug ?? null,
      isComplete: percentage === 100,
    }
  }

  const totalEnrolledLessons = enrolledCourses.reduce((total, course) => {
    return total + getCourseProgress(course.id).totalLessons
  }, 0)

  const totalCompletedLessons = enrolledCourses.reduce((total, course) => {
    return total + getCourseProgress(course.id).completedLessons
  }, 0)

  const overallProgress =
    totalEnrolledLessons > 0
      ? Math.round((totalCompletedLessons / totalEnrolledLessons) * 100)
      : 0

  const completedCoursesCount = enrolledCourses.filter(
    (course) => getCourseProgress(course.id).isComplete
  ).length

  const issuedCertificatesCount = issuedCertificateCourseIds.size

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <UserAvatar
              src={profile?.avatar_url}
              name={profile?.full_name}
              email={profile?.email || user.email}
              size="md"
            />

            <div>
              <p className="text-sm font-medium text-slate-500">
                {isAdmin
                  ? 'Admin Dashboard'
                  : role === 'teacher'
                    ? 'Teacher Dashboard'
                    : 'Student Dashboard'}
              </p>

              <h1 className="text-2xl font-bold">
                Welcome back,{' '}
                <span className="text-blue-600">{displayName}</span>
              </h1>

              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                {role}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
              >
                Admin Panel
              </Link>
            )}

            {isTeacher && (
              <Link
                href="/teacher"
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Teacher Hub
              </Link>
            )}

            <Link
              href="/certificates"
              className="rounded-xl border border-blue-300 bg-blue-50 px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Certificates
            </Link>

            <Link
              href="/profile"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
            >
              My Profile
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1fr_430px] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-200">
              Torres Academy
            </p>

            <h2 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
              Your learning space is ready.
            </h2>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-50">
              Enroll in free courses, continue your lessons, complete quizzes,
              save notes, request feedback, claim certificates, and track your
              progress in one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="#available-courses"
                className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-blue-50"
              >
                Explore courses
              </Link>

              <Link
                href="/certificates"
                className="rounded-xl border border-white/30 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                My certificates
              </Link>

              <Link
                href="/profile"
                className="rounded-xl border border-white/30 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Edit profile
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-xl border border-white/30 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Open Admin Panel
                </Link>
              )}

              {isTeacher && (
                <Link
                  href="/teacher"
                  className="rounded-xl border border-white/30 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Open Teacher Hub
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-sm backdrop-blur">
            <p className="font-bold text-blue-100">Your progress</p>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-blue-50">
                <span>Completed lessons</span>
                <span>
                  {totalCompletedLessons}/{totalEnrolledLessons}
                </span>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-blue-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-5">
                <p className="text-3xl font-bold">{enrolledCourses.length}</p>
                <p className="mt-2 text-sm text-blue-50">My courses</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-5">
                <p className="text-3xl font-bold">{completedCoursesCount}</p>
                <p className="mt-2 text-sm text-blue-50">Completed courses</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-5">
                <p className="text-3xl font-bold">{issuedCertificatesCount}</p>
                <p className="mt-2 text-sm text-blue-50">Certificates</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-5">
                <p className="text-3xl font-bold">{availableCourses.length}</p>
                <p className="mt-2 text-sm text-blue-50">Available</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-6 py-12">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                My Courses
              </p>

              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                Continue learning
              </h2>
            </div>

            <p className="text-sm text-slate-600">
              Courses you are already enrolled in
            </p>
          </div>

          {enrolledCourses.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">
                No enrolled courses yet
              </h3>

              <p className="mt-2 text-slate-600">
                Choose a free course below to start learning.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {enrolledCourses.map((course) => {
                const progress = getCourseProgress(course.id)
                const certificate = getCourseCertificate(course.id)

                return (
                  <article
                    key={course.id}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">
                          {course.title}
                        </h3>

                        <p className="mt-3 leading-7 text-slate-600">
                          {course.description || 'No description yet.'}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          progress.isComplete
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {progress.isComplete
                          ? 'Completed'
                          : `${progress.percentage}%`}
                      </span>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>
                          {progress.completedLessons} of{' '}
                          {progress.totalLessons} lessons completed
                        </span>
                        <span>{progress.percentage}%</span>
                      </div>

                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                    </div>

                    {progress.isComplete && (
                      <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
                        <h4 className="font-bold text-green-800">
                          Course completed
                        </h4>

                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          You finished all published lessons. Go to the
                          certificate center to claim or download your
                          certificate.
                        </p>

                        {certificate && (
                          <p className="mt-2 text-xs font-semibold text-green-700">
                            Certificate issued · Code:{' '}
                            {certificate.verification_code}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3">
                      {progress.nextLessonSlug && !progress.isComplete ? (
                        <Link
                          href={`/lessons/${progress.nextLessonSlug}`}
                          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                        >
                          Continue course
                        </Link>
                      ) : (
                        <Link
                          href={`/courses/${course.slug}`}
                          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                        >
                          View course
                        </Link>
                      )}

                      <Link
                        href={`/courses/${course.slug}`}
                        className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                      >
                        Course overview
                      </Link>

                      {progress.isComplete && (
                        <Link
                          href={
                            certificate
                              ? `/certificates/${certificate.id}`
                              : '/certificates'
                          }
                          className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
                        >
                          {certificate
                            ? 'Download certificate'
                            : 'Claim certificate'}
                        </Link>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section id="available-courses">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                Available Courses
              </p>

              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                Free courses you can join
              </h2>
            </div>
          </div>

          {availableCourses.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-slate-700">
                No new free courses are available right now.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {availableCourses.map((course) => {
                const courseLessons = getCourseLessons(course.id)

                return (
                  <article
                    key={course.id}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">
                          {course.title}
                        </h3>

                        <p className="mt-3 leading-7 text-slate-600">
                          {course.description || 'No description yet.'}
                        </p>
                      </div>

                      <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                        Free
                      </span>
                    </div>

                    <p className="mt-5 text-sm text-slate-600">
                      {courseLessons.length} published lesson
                      {courseLessons.length === 1 ? '' : 's'}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href={`/courses/${course.slug}`}
                        className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                      >
                        View course
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}