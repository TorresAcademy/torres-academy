import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CertificateClaimCard from '@/components/certificates/certificate-claim-card'

type Course = {
  id: number
  title: string
  slug: string
  description: string | null
}

type Enrollment = {
  course_id: number
}

type Lesson = {
  id: number
  course_id: number
}

type ProgressRow = {
  lesson_id: number
  completed: boolean | null
}

type Reflection = {
  lesson_id: number
  learned: string | null
  difficult: string | null
  next_step: string | null
  confidence_level: number | null
}

type Quiz = {
  id: number
  lesson_id: number
}

type QuizAttempt = {
  quiz_id: number
  passed: boolean | null
}

type Certificate = {
  id: number
  course_id: number
  verification_code: string
  status: string
  issued_at: string
}

export default async function CertificatesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/certificates')
  }

  const { data: enrollmentsData } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', user.id)

  const enrollments = (enrollmentsData ?? []) as Enrollment[]
  const courseIds = enrollments.map((item) => item.course_id)

  let courses: Course[] = []
  let lessons: Lesson[] = []
  let progressRows: ProgressRow[] = []
  let reflections: Reflection[] = []
  let finalQuizzes: Quiz[] = []
  let quizAttempts: QuizAttempt[] = []
  let certificates: Certificate[] = []

  if (courseIds.length > 0) {
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, title, slug, description')
      .in('id', courseIds)
      .eq('is_published', true)
      .order('title', { ascending: true })

    courses = (coursesData ?? []) as Course[]

    const visibleCourseIds = courses.map((course) => course.id)

    if (visibleCourseIds.length > 0) {
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, course_id')
        .in('course_id', visibleCourseIds)
        .eq('is_published', true)

      lessons = (lessonsData ?? []) as Lesson[]

      const lessonIds = lessons.map((lesson) => lesson.id)

      if (lessonIds.length > 0) {
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('lesson_id, completed')
          .eq('user_id', user.id)
          .in('lesson_id', lessonIds)

        progressRows = (progressData ?? []) as ProgressRow[]

        const { data: reflectionsData } = await supabase
          .from('lesson_reflections')
          .select('lesson_id, learned, difficult, next_step, confidence_level')
          .eq('user_id', user.id)
          .in('lesson_id', lessonIds)

        reflections = (reflectionsData ?? []) as Reflection[]

        const { data: quizzesData } = await supabase
          .from('quizzes')
          .select('id, lesson_id')
          .in('lesson_id', lessonIds)
          .eq('is_published', true)
          .eq('quiz_type', 'final')

        finalQuizzes = (quizzesData ?? []) as Quiz[]

        const quizIds = finalQuizzes.map((quiz) => quiz.id)

        if (quizIds.length > 0) {
          const { data: attemptsData } = await supabase
            .from('quiz_attempts')
            .select('quiz_id, passed')
            .eq('user_id', user.id)
            .in('quiz_id', quizIds)

          quizAttempts = (attemptsData ?? []) as QuizAttempt[]
        }
      }

      const { data: certificatesData } = await supabase
        .from('certificates')
        .select('id, course_id, verification_code, status, issued_at')
        .eq('user_id', user.id)
        .in('course_id', visibleCourseIds)

      certificates = (certificatesData ?? []) as Certificate[]
    }
  }

  const completedLessonIds = new Set(
    progressRows.filter((row) => row.completed).map((row) => row.lesson_id)
  )

  const reflectionLessonIds = new Set(
    reflections
      .filter(
        (reflection) =>
          Boolean(reflection.learned?.trim()) ||
          Boolean(reflection.difficult?.trim()) ||
          Boolean(reflection.next_step?.trim()) ||
          reflection.confidence_level !== null
      )
      .map((reflection) => reflection.lesson_id)
  )

  const passedQuizIds = new Set(
    quizAttempts.filter((attempt) => attempt.passed).map((attempt) => attempt.quiz_id)
  )

  function getCourseCertificate(courseId: number) {
    return (
      certificates.find(
        (certificate) =>
          certificate.course_id === courseId && certificate.status === 'issued'
      ) ?? null
    )
  }

  function getCourseRequirements(courseId: number) {
    const courseLessons = lessons.filter((lesson) => lesson.course_id === courseId)
    const courseLessonIds = courseLessons.map((lesson) => lesson.id)

    const courseFinalQuizzes = finalQuizzes.filter((quiz) =>
      courseLessonIds.includes(quiz.lesson_id)
    )

    const totalLessons = courseLessons.length

    const completedLessons = courseLessons.filter((lesson) =>
      completedLessonIds.has(lesson.id)
    ).length

    const reflectionsSubmitted = courseLessons.filter((lesson) =>
      reflectionLessonIds.has(lesson.id)
    ).length

    const totalFinalQuizzes = courseFinalQuizzes.length

    const passedFinalQuizzes = courseFinalQuizzes.filter((quiz) =>
      passedQuizIds.has(quiz.id)
    ).length

    const eligible =
      totalLessons > 0 &&
      completedLessons === totalLessons &&
      reflectionsSubmitted === totalLessons &&
      passedFinalQuizzes === totalFinalQuizzes

    return {
      totalLessons,
      completedLessons,
      reflectionsSubmitted,
      totalFinalQuizzes,
      passedFinalQuizzes,
      eligible,
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-blue-600 underline"
            >
              ← Back to dashboard
            </Link>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              Certificates
            </p>

            <h1 className="mt-2 text-4xl font-bold text-slate-900">
              My certificates
            </h1>

            <p className="mt-3 max-w-2xl text-slate-600">
              Certificates are available after you complete all published
              lessons, submit reflections, and pass all final quizzes.
            </p>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              No enrolled courses yet
            </h2>

            <p className="mt-2 text-slate-600">
              Enroll in a course first, then return here to track certificate
              eligibility.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6">
            {courses.map((course) => {
              const requirements = getCourseRequirements(course.id)
              const certificate = getCourseCertificate(course.id)

              return (
                <article
                  key={course.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">
                        {course.title}
                      </h2>

                      <p className="mt-2 max-w-2xl text-slate-600">
                        {course.description || 'No course description.'}
                      </p>

                      {certificate && (
                        <p className="mt-3 text-sm font-semibold text-green-700">
                          Certificate issued · Code:{' '}
                          {certificate.verification_code}
                        </p>
                      )}
                    </div>

                    <span
                      className={`rounded-full px-4 py-2 text-sm font-bold ${
                        certificate
                          ? 'bg-green-100 text-green-700'
                          : requirements.eligible
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {certificate
                        ? 'Issued'
                        : requirements.eligible
                          ? 'Ready'
                          : 'In progress'}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Lessons</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {requirements.completedLessons}/
                        {requirements.totalLessons}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Reflections</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {requirements.reflectionsSubmitted}/
                        {requirements.totalLessons}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Final quizzes</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {requirements.passedFinalQuizzes}/
                        {requirements.totalFinalQuizzes}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <CertificateClaimCard
                      courseId={course.id}
                      existingCertificateId={certificate?.id ?? null}
                      requirements={requirements}
                      eligible={requirements.eligible}
                    />

                    <Link
                      href={`/courses/${course.slug}`}
                      className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                    >
                      Course overview
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}