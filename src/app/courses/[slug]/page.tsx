import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import EnrollButton from '@/components/enroll-button'
import CertificateClaimCard from '@/components/certificates/certificate-claim-card'

type CoursePageProps = {
  params: Promise<{ slug: string }>
}

type Course = {
  id: number
  title: string
  slug: string
  description: string | null
  is_free: boolean | null
  is_published: boolean | null
  status: 'draft' | 'published' | 'archived' | null
  enrollment_opens_at: string | null
  enrollment_closes_at: string | null
  course_starts_at: string | null
  course_ends_at: string | null
  recommended_duration_label: string | null
}

type Module = {
  id: number
  course_id: number
  title: string
  description: string | null
  position: number
  is_published: boolean
  release_at: string | null
  due_at: string | null
}

type Lesson = {
  id: number
  title: string
  slug: string
  position: number
  module_id: number | null
  is_published: boolean | null
}

type Progress = {
  lesson_id: number
  completed: boolean
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
  title: string
  quiz_type: string
  pass_percentage: number
}

type QuizAttempt = {
  quiz_id: number
  score_percentage: number
  correct_count: number
  total_questions: number
  passed: boolean
  created_at: string | null
}

type Certificate = {
  id: number
  course_id: number
  verification_code: string
  status: 'issued' | 'revoked'
  issued_at: string | null
  revoked_at: string | null
}

type SubmissionTask = {
  id: number
  lesson_id: number
  title: string
  instructions: string | null
  is_required_for_completion: boolean
  is_required_for_certificate: boolean
  is_published: boolean
}

type StudentSubmission = {
  id: number
  task_id: number
  lesson_id: number
  course_id: number
  student_id: string
  status: 'submitted' | 'reviewed' | 'needs_revision' | 'accepted' | 'rejected'
  teacher_feedback: string | null
  teacher_score: number | null
  reviewed_at: string | null
  updated_at: string | null
}

type CertificateStatus = 'Not ready' | 'Ready' | 'Issued' | 'Revoked'

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function hasReflectionContent(reflection: Reflection | undefined) {
  if (!reflection) return false

  return (
    Boolean(reflection.learned?.trim()) ||
    Boolean(reflection.difficult?.trim()) ||
    Boolean(reflection.next_step?.trim()) ||
    reflection.confidence_level !== null
  )
}

function getCertificateBadgeClass(status: CertificateStatus) {
  if (status === 'Issued') return 'bg-green-100 text-green-700'
  if (status === 'Ready') return 'bg-blue-100 text-blue-700'
  if (status === 'Revoked') return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-700'
}

function prettySubmissionStatus(
  status?: 'submitted' | 'reviewed' | 'needs_revision' | 'accepted' | 'rejected'
) {
  if (!status) return 'Not submitted'
  return status.replaceAll('_', ' ')
}

function getSubmissionBadgeClass(
  status?: 'submitted' | 'reviewed' | 'needs_revision' | 'accepted' | 'rejected'
) {
  if (status === 'accepted') return 'bg-green-100 text-green-700'
  if (status === 'reviewed') return 'bg-blue-100 text-blue-700'
  if (status === 'needs_revision') return 'bg-amber-100 text-amber-800'
  if (status === 'rejected') return 'bg-red-100 text-red-700'
  if (status === 'submitted') return 'bg-slate-100 text-slate-700'
  return 'bg-slate-100 text-slate-700'
}

function getModuleTimingState(module: Module) {
  const now = new Date()
  const releaseAt = module.release_at ? new Date(module.release_at) : null
  const dueAt = module.due_at ? new Date(module.due_at) : null

  const opensSoon = Boolean(releaseAt && now < releaseAt)
  const overdue = Boolean(dueAt && now > dueAt)

  return {
    opensSoon,
    overdue,
    releaseAt,
    dueAt,
  }
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const serviceSupabase = createServiceRoleClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/courses/${slug}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()

  const canBypassEnrollment =
    profile?.role === 'admin' || profile?.role === 'teacher'

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select(
      'id, title, slug, description, is_free, is_published, status, enrollment_opens_at, enrollment_closes_at, course_starts_at, course_ends_at, recommended_duration_label'
    )
    .eq('slug', slug)
    .single()

  if (courseError || !course) {
    notFound()
  }

  const typedCourse = course as Course

  const isStudentVisible =
    typedCourse.status === 'published' ||
    (typedCourse.status === null && typedCourse.is_published === true)

  if (!canBypassEnrollment && !isStudentVisible) {
    notFound()
  }

  const now = new Date()
  const enrollmentOpensAt = typedCourse.enrollment_opens_at
    ? new Date(typedCourse.enrollment_opens_at)
    : null
  const enrollmentClosesAt = typedCourse.enrollment_closes_at
    ? new Date(typedCourse.enrollment_closes_at)
    : null
  const courseStartsAt = typedCourse.course_starts_at
    ? new Date(typedCourse.course_starts_at)
    : null
  const courseEndsAt = typedCourse.course_ends_at
    ? new Date(typedCourse.course_ends_at)
    : null

  const enrollmentNotOpenYet =
    enrollmentOpensAt !== null && now < enrollmentOpensAt
  const enrollmentClosed =
    enrollmentClosesAt !== null && now > enrollmentClosesAt

  const courseNotStartedYet = courseStartsAt !== null && now < courseStartsAt
  const courseEnded = courseEndsAt !== null && now > courseEndsAt

  let enrollment: { id: number } | null = null

  if (!canBypassEnrollment) {
    const { data } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', typedCourse.id)
      .maybeSingle()

    enrollment = data
  }

  const isEnrolled = Boolean(enrollment) || canBypassEnrollment

  let modulesQuery = supabase
    .from('course_modules')
    .select(
      'id, course_id, title, description, position, is_published, release_at, due_at'
    )
    .eq('course_id', typedCourse.id)
    .order('position', { ascending: true })
    .order('id', { ascending: true })

  if (!canBypassEnrollment) {
    modulesQuery = modulesQuery.eq('is_published', true)
  }

  const { data: modulesData } = await modulesQuery

  const modules = (modulesData ?? []) as Module[]
  const moduleMap = new Map(modules.map((module) => [module.id, module]))

  let lessonsQuery = supabase
    .from('lessons')
    .select('id, title, slug, position, module_id, is_published')
    .eq('course_id', typedCourse.id)
    .order('position', { ascending: true })

  if (!canBypassEnrollment) {
    lessonsQuery = lessonsQuery.eq('is_published', true)
  }

  const { data: lessonsData } = await lessonsQuery

  const lessons = (lessonsData ?? []) as Lesson[]
  const lessonIds = lessons.map((lesson) => lesson.id)

  const lessonsByModule = new Map<number, Lesson[]>()

  for (const module of modules) {
    lessonsByModule.set(
      module.id,
      lessons
        .filter((lesson) => lesson.module_id === module.id)
        .sort((a, b) => a.position - b.position)
    )
  }

  const uncategorizedLessons = lessons
    .filter((lesson) => !lesson.module_id || !moduleMap.has(lesson.module_id))
    .sort((a, b) => a.position - b.position)

  if (!isEnrolled) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-blue-600 underline"
          >
            ← Back to dashboard
          </Link>

          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  {typedCourse.title}
                </h1>

                <p className="mt-4 text-slate-700">
                  {typedCourse.description || 'No description yet.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  {typedCourse.is_free ? 'Free course' : 'Course'}
                </span>

                {typedCourse.recommended_duration_label && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {typedCourse.recommended_duration_label}
                  </span>
                )}

                {enrollmentNotOpenYet ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    Coming soon
                  </span>
                ) : enrollmentClosed ? (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                    Enrollment closed
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Open for enrollment
                  </span>
                )}
              </div>
            </div>

            {(typedCourse.enrollment_opens_at ||
              typedCourse.enrollment_closes_at ||
              typedCourse.course_starts_at ||
              typedCourse.course_ends_at) && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">
                  Course season
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Enrollment opens
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {formatDate(typedCourse.enrollment_opens_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Enrollment closes
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {formatDate(typedCourse.enrollment_closes_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Course starts
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {formatDate(typedCourse.course_starts_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Course ends
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {formatDate(typedCourse.course_ends_at)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8">
              {enrollmentNotOpenYet ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <p className="font-semibold text-amber-800">
                    Enrollment has not opened yet.
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    This course will open on{' '}
                    {formatDate(typedCourse.enrollment_opens_at)}.
                  </p>
                </div>
              ) : enrollmentClosed ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <p className="font-semibold text-red-700">
                    Enrollment is closed.
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    This course closed on{' '}
                    {formatDate(typedCourse.enrollment_closes_at)}.
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-4 text-slate-700">
                    Enroll in this course to access the lessons.
                  </p>
                  <EnrollButton courseId={typedCourse.id} />
                </>
              )}
            </div>
          </div>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Course structure
                </h2>
                <p className="mt-2 text-slate-600">
                  Preview the curriculum organized by modules.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                {modules.length} module{modules.length === 1 ? '' : 's'} ·{' '}
                {lessons.length} lesson{lessons.length === 1 ? '' : 's'}
              </span>
            </div>

            {modules.length === 0 && uncategorizedLessons.length === 0 ? (
              <p className="mt-6 text-slate-600">No lessons published yet.</p>
            ) : (
              <div className="mt-6 space-y-5">
                {modules.map((module) => {
                  const moduleLessons = lessonsByModule.get(module.id) ?? []
                  const timing = getModuleTimingState(module)

                  return (
                    <article
                      key={module.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-500">
                            Module {module.position}
                          </p>
                          <h3 className="text-xl font-bold text-slate-900">
                            {module.title}
                          </h3>

                          {module.description && (
                            <p className="mt-2 text-slate-600">
                              {module.description}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                              {moduleLessons.length} lesson
                              {moduleLessons.length === 1 ? '' : 's'}
                            </span>

                            {module.release_at && (
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  timing.opensSoon
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                Opens: {formatDate(module.release_at)}
                              </span>
                            )}

                            {module.due_at && (
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  timing.overdue
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                Due: {formatDate(module.due_at)}
                              </span>
                            )}

                            {canBypassEnrollment && !module.is_published && (
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                Draft module
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {moduleLessons.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-600">
                          No published lessons in this module yet.
                        </p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {moduleLessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="rounded-xl border border-slate-200 bg-white p-4"
                            >
                              <p className="text-sm text-slate-500">
                                Lesson {lesson.position}
                              </p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {lesson.title}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  )
                })}

                {uncategorizedLessons.length > 0 && (
                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-500">General lessons</p>
                        <h3 className="text-xl font-bold text-slate-900">
                          Other lessons
                        </h3>
                      </div>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        {uncategorizedLessons.length} lesson
                        {uncategorizedLessons.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {uncategorizedLessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="rounded-xl border border-slate-200 bg-white p-4"
                        >
                          <p className="text-sm text-slate-500">
                            Lesson {lesson.position}
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {lesson.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    )
  }

  let progressRows: Progress[] = []
  let reflections: Reflection[] = []
  let quizzes: Quiz[] = []
  let quizAttempts: QuizAttempt[] = []
  let certificates: Certificate[] = []
  let submissionTasks: SubmissionTask[] = []
  let studentSubmissions: StudentSubmission[] = []

  if (lessonIds.length > 0) {
    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', user.id)
      .in('lesson_id', lessonIds)

    progressRows = (progressData ?? []) as Progress[]

    const { data: reflectionData } = await supabase
      .from('lesson_reflections')
      .select('lesson_id, learned, difficult, next_step, confidence_level')
      .eq('user_id', user.id)
      .in('lesson_id', lessonIds)

    reflections = (reflectionData ?? []) as Reflection[]

    const { data: quizzesData } = await supabase
      .from('quizzes')
      .select('id, lesson_id, title, quiz_type, pass_percentage')
      .in('lesson_id', lessonIds)
      .eq('is_published', true)

    quizzes = (quizzesData ?? []) as Quiz[]

    const quizIds = quizzes.map((quiz) => quiz.id)

    if (quizIds.length > 0) {
      const { data: attemptData } = await supabase
        .from('quiz_attempts')
        .select(
          'quiz_id, score_percentage, correct_count, total_questions, passed, created_at'
        )
        .eq('user_id', user.id)
        .in('quiz_id', quizIds)

      quizAttempts = (attemptData ?? []) as QuizAttempt[]
    }

    const { data: taskData } = await serviceSupabase
      .from('lesson_submission_tasks')
      .select(
        'id, lesson_id, title, instructions, is_required_for_completion, is_required_for_certificate, is_published'
      )
      .in('lesson_id', lessonIds)
      .eq('is_published', true)

    submissionTasks = (taskData ?? []) as SubmissionTask[]

    const taskIds = submissionTasks.map((task) => task.id)

    if (taskIds.length > 0) {
      const { data: submissionData } = await serviceSupabase
        .from('student_submissions')
        .select(
          'id, task_id, lesson_id, course_id, student_id, status, teacher_feedback, teacher_score, reviewed_at, updated_at'
        )
        .eq('student_id', user.id)
        .eq('course_id', typedCourse.id)
        .in('task_id', taskIds)

      studentSubmissions = (submissionData ?? []) as StudentSubmission[]
    }
  }

  const { data: certificateData } = await supabase
    .from('certificates')
    .select('id, course_id, verification_code, status, issued_at, revoked_at')
    .eq('user_id', user.id)
    .eq('course_id', typedCourse.id)

  certificates = (certificateData ?? []) as Certificate[]

  const completedLessonIds = new Set(
    progressRows.filter((row) => row.completed).map((row) => row.lesson_id)
  )

  const reflectionMap = new Map(
    reflections.map((reflection) => [reflection.lesson_id, reflection])
  )

  const reflectedLessonIds = new Set(
    reflections
      .filter((reflection) => hasReflectionContent(reflection))
      .map((reflection) => reflection.lesson_id)
  )

  const taskSubmissionMap = new Map(
    studentSubmissions.map((submission) => [submission.task_id, submission])
  )

  const completedCount = lessons.filter((lesson) =>
    completedLessonIds.has(lesson.id)
  ).length

  const progressPercent =
    lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0

  const reflectionsSubmitted = lessons.filter((lesson) =>
    reflectedLessonIds.has(lesson.id)
  ).length

  const finalQuizzes = quizzes.filter((quiz) => quiz.quiz_type === 'final')

  const passedFinalQuizzes = finalQuizzes.filter((quiz) =>
    quizAttempts.some(
      (attempt) => attempt.quiz_id === quiz.id && attempt.passed
    )
  ).length

  const requiredCompletionTasks = submissionTasks.filter(
    (task) => task.is_required_for_completion
  )

  const requiredCertificateTasks = submissionTasks.filter(
    (task) => task.is_required_for_certificate
  )

  const submittedTasksCount = submissionTasks.filter((task) =>
    taskSubmissionMap.has(task.id)
  ).length

  const approvedRequiredCertificateSubmissions = requiredCertificateTasks.filter(
    (task) => {
      const submission = taskSubmissionMap.get(task.id)
      return (
        submission &&
        (submission.status === 'reviewed' || submission.status === 'accepted')
      )
    }
  ).length

  const missingRequiredCompletionSubmissions = requiredCompletionTasks.filter(
    (task) => !taskSubmissionMap.has(task.id)
  ).length

  const missingRequiredCertificateSubmissions = requiredCertificateTasks.filter(
    (task) => {
      const submission = taskSubmissionMap.get(task.id)
      return !submission || !['reviewed', 'accepted'].includes(submission.status)
    }
  ).length

  const pendingSubmissionReviews = studentSubmissions.filter(
    (submission) => submission.status === 'submitted'
  ).length

  const needsRevisionSubmissions = studentSubmissions.filter(
    (submission) => submission.status === 'needs_revision'
  ).length

  const acceptedSubmissions = studentSubmissions.filter(
    (submission) => submission.status === 'accepted'
  ).length

  const existingCertificate = certificates[0] ?? null

  const eligible =
    lessons.length > 0 &&
    completedCount === lessons.length &&
    reflectionsSubmitted === lessons.length &&
    passedFinalQuizzes === finalQuizzes.length &&
    approvedRequiredCertificateSubmissions === requiredCertificateTasks.length

  let certificateStatus: CertificateStatus = 'Not ready'

  if (existingCertificate?.status === 'issued') {
    certificateStatus = 'Issued'
  } else if (existingCertificate?.status === 'revoked') {
    certificateStatus = 'Revoked'
  } else if (eligible) {
    certificateStatus = 'Ready'
  }

  if (
    certificateStatus === 'Ready' &&
    !canBypassEnrollment
  ) {
    const certificateReadyTitle = `Certificate ready: ${typedCourse.title}`
    const certificateReadyLink = `/courses/${typedCourse.slug}`

    const { data: existingCertificateReadyNotification } = await serviceSupabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'certificate_ready')
      .eq('title', certificateReadyTitle)
      .eq('link_url', certificateReadyLink)
      .limit(1)
      .maybeSingle()

    if (!existingCertificateReadyNotification) {
      await serviceSupabase.from('notifications').insert({
        user_id: user.id,
        type: 'certificate_ready',
        title: certificateReadyTitle,
        message:
          `You have completed all certificate requirements for ${typedCourse.title}. You can now claim your certificate.`,
        link_url: certificateReadyLink,
      })
    }
  }

  function renderLessonCard(lesson: Lesson) {
    const isCompleted = completedLessonIds.has(lesson.id)
    const reflectionSubmitted = reflectedLessonIds.has(lesson.id)
    const reflection = reflectionMap.get(lesson.id)
    const lessonTasks = submissionTasks.filter(
      (task) => task.lesson_id === lesson.id
    )
    const lessonTaskSubmissions = lessonTasks
      .map((task) => taskSubmissionMap.get(task.id))
      .filter(Boolean) as StudentSubmission[]

    const lessonPendingReview = lessonTaskSubmissions.filter(
      (submission) => submission.status === 'submitted'
    ).length

    const lessonNeedsRevision = lessonTaskSubmissions.filter(
      (submission) => submission.status === 'needs_revision'
    ).length

    const lessonAccepted = lessonTaskSubmissions.filter(
      (submission) => submission.status === 'accepted'
    ).length

    const missingLessonRequiredTasks = lessonTasks.filter(
      (task) =>
        task.is_required_for_completion && !taskSubmissionMap.has(task.id)
    ).length

    return (
      <div
        key={lesson.id}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Lesson {lesson.position}</p>

            <h3 className="font-semibold text-slate-900">{lesson.title}</h3>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {isCompleted ? 'Completed' : 'Not completed yet'}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {reflectionSubmitted
                  ? 'Reflection submitted'
                  : 'Reflection missing'}
              </span>

              {lessonTasks.length > 0 && (
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                  Submissions {lessonTaskSubmissions.length}/{lessonTasks.length}
                </span>
              )}

              {missingLessonRequiredTasks > 0 && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  Missing required: {missingLessonRequiredTasks}
                </span>
              )}

              {lessonPendingReview > 0 && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  Waiting review: {lessonPendingReview}
                </span>
              )}

              {lessonNeedsRevision > 0 && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  Needs revision: {lessonNeedsRevision}
                </span>
              )}

              {lessonAccepted > 0 && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  Accepted: {lessonAccepted}
                </span>
              )}

              {canBypassEnrollment && lesson.is_published === false && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  Draft lesson
                </span>
              )}
            </div>
          </div>

          <Link
            href={`/lessons/${lesson.slug}`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
          >
            {isCompleted ? 'Review lesson' : 'Open lesson'}
          </Link>
        </div>

        {lessonTasks.length > 0 && (
          <div className="mt-5 space-y-3">
            {lessonTasks.map((task) => {
              const submission = taskSubmissionMap.get(task.id)

              return (
                <div
                  key={task.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {task.title}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {task.is_required_for_completion && (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                            Required for completion
                          </span>
                        )}

                        {task.is_required_for_certificate && (
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                            Required for certificate
                          </span>
                        )}

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getSubmissionBadgeClass(
                            submission?.status
                          )}`}
                        >
                          {prettySubmissionStatus(submission?.status)}
                        </span>
                      </div>
                    </div>

                    {submission?.reviewed_at && (
                      <p className="text-xs text-slate-500">
                        Reviewed {formatDate(submission.reviewed_at)}
                      </p>
                    )}
                  </div>

                  {task.instructions && (
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {task.instructions}
                    </p>
                  )}

                  {submission && submission.teacher_score !== null && (
                    <p className="mt-3 text-sm text-slate-700">
                      Score: {submission.teacher_score}
                    </p>
                  )}

                  {submission && submission.teacher_feedback && (
                    <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-4">
                      <p className="text-sm font-semibold text-green-800">
                        Teacher feedback
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {submission.teacher_feedback}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {reflection && (
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              My reflection
            </p>

            {reflection.learned && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                <span className="font-semibold">Learned:</span>{' '}
                {reflection.learned}
              </p>
            )}

            {reflection.difficult && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                <span className="font-semibold">Difficult:</span>{' '}
                {reflection.difficult}
              </p>
            )}

            {reflection.next_step && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                <span className="font-semibold">Next step:</span>{' '}
                {reflection.next_step}
              </p>
            )}

            <p className="mt-3 text-xs text-slate-500">
              Confidence: {reflection.confidence_level ?? '—'}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-blue-600 underline"
        >
          ← Back to dashboard
        </Link>

        {canBypassEnrollment && !isStudentVisible && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Preview mode:</span>{' '}
            this course is not publicly visible to students yet.
          </div>
        )}

        {(courseNotStartedYet || courseEnded) && (
          <div className="mt-4">
            {courseNotStartedYet && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">
                  Course starts soon:
                </span>{' '}
                this course officially starts on{' '}
                {formatDate(typedCourse.course_starts_at)}.
              </div>
            )}

            {courseEnded && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-100 p-5 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">
                  Course season ended:
                </span>{' '}
                this course ended on {formatDate(typedCourse.course_ends_at)}.
              </div>
            )}
          </div>
        )}

        <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {typedCourse.title}
              </h1>

              <p className="mt-3 text-slate-700">
                {typedCourse.description || 'No description yet.'}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {typedCourse.recommended_duration_label && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    Recommended: {typedCourse.recommended_duration_label}
                  </span>
                )}

                {typedCourse.course_starts_at && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    Starts: {formatDate(typedCourse.course_starts_at)}
                  </span>
                )}

                {typedCourse.course_ends_at && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    Ends: {formatDate(typedCourse.course_ends_at)}
                  </span>
                )}

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {modules.length} module{modules.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-4 py-2 text-sm font-semibold ${getCertificateBadgeClass(
                  certificateStatus
                )}`}
              >
                Certificate: {certificateStatus}
              </span>

              <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
                {progressPercent}% complete
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-6">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Lessons</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {completedCount}/{lessons.length}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Reflections</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {reflectionsSubmitted}/{lessons.length}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Final quizzes</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {passedFinalQuizzes}/{finalQuizzes.length}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Submission tasks</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {submittedTasksCount}/{submissionTasks.length}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Need revision</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {needsRevisionSubmissions}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Accepted</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {acceptedSubmissions}
              </p>
            </div>
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

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Certificate readiness
              </h2>

              <p className="mt-2 text-slate-600">
                To claim a certificate, complete every published lesson, submit
                a reflection for every lesson, pass every final quiz, and finish
                all certificate-required submission tasks.
              </p>

              {existingCertificate?.status === 'issued' && (
                <p className="mt-3 break-all text-sm font-semibold text-green-700">
                  Certificate issued · Code: {existingCertificate.verification_code}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {existingCertificate?.status === 'issued' && (
                <>
                  <Link
                    href={`/certificates/${existingCertificate.id}`}
                    className="rounded-xl border border-green-300 bg-white px-4 py-2 font-semibold text-green-700 transition hover:bg-green-50"
                  >
                    View certificate
                  </Link>

                  <Link
                    href={`/certificates/verify/${existingCertificate.verification_code}`}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    Verify
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Lessons
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {completedCount}/{lessons.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Reflections
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {reflectionsSubmitted}/{lessons.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Final quizzes
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {passedFinalQuizzes}/{finalQuizzes.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Cert submissions
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {approvedRequiredCertificateSubmissions}/
                {requiredCertificateTasks.length}
              </p>
            </div>
          </div>

          {(requiredCompletionTasks.length > 0 ||
            requiredCertificateTasks.length > 0) && (
            <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-5">
              <p className="text-sm font-semibold text-slate-900">
                Submission requirement status
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <div className="rounded-xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Required for completion
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {requiredCompletionTasks.length}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Missing required
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {missingRequiredCompletionSubmissions}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Waiting review
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {pendingSubmissionReviews}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Missing cert approvals
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {missingRequiredCertificateSubmissions}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <CertificateClaimCard
              courseId={typedCourse.id}
              existingCertificateId={
                existingCertificate?.status === 'issued'
                  ? existingCertificate.id
                  : null
              }
              requirements={{
                totalLessons: lessons.length,
                completedLessons: completedCount,
                reflectionsSubmitted,
                totalFinalQuizzes: finalQuizzes.length,
                passedFinalQuizzes,
              }}
              eligible={eligible}
            />
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Course modules
              </h2>
              <p className="mt-2 text-slate-600">
                Lessons are grouped by module, with pacing dates shown for each
                module.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {modules.length} module{modules.length === 1 ? '' : 's'} ·{' '}
              {lessons.length} lesson{lessons.length === 1 ? '' : 's'}
            </span>
          </div>

          {modules.length === 0 && uncategorizedLessons.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p>No lessons published yet.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-6">
              {modules.map((module) => {
                const moduleLessons = lessonsByModule.get(module.id) ?? []
                const moduleCompletedCount = moduleLessons.filter((lesson) =>
                  completedLessonIds.has(lesson.id)
                ).length
                const moduleProgress =
                  moduleLessons.length > 0
                    ? Math.round(
                        (moduleCompletedCount / moduleLessons.length) * 100
                      )
                    : 0
                const timing = getModuleTimingState(module)

                return (
                  <section
                    key={module.id}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-500">
                          Module {module.position}
                        </p>
                        <h3 className="text-xl font-bold text-slate-900">
                          {module.title}
                        </h3>

                        {module.description && (
                          <p className="mt-2 text-slate-600">
                            {module.description}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                            {moduleProgress}% complete
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {moduleCompletedCount}/{moduleLessons.length} lessons
                          </span>

                          {module.release_at && (
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                timing.opensSoon
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              Opens: {formatDate(module.release_at)}
                            </span>
                          )}

                          {module.due_at && (
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                timing.overdue
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              Due: {formatDate(module.due_at)}
                            </span>
                          )}

                          {canBypassEnrollment && !module.is_published && (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                              Draft module
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {timing.opensSoon && (
                      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">
                          Module pacing:
                        </span>{' '}
                        this module is scheduled to open on{' '}
                        {formatDate(module.release_at)}.
                      </div>
                    )}

                    {timing.overdue && (
                      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">
                          Module pacing:
                        </span>{' '}
                        this module due date passed on {formatDate(module.due_at)}.
                      </div>
                    )}

                    {!timing.overdue && module.due_at && (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">
                          Module pacing:
                        </span>{' '}
                        recommended deadline is {formatDate(module.due_at)}.
                      </div>
                    )}

                    {moduleLessons.length === 0 ? (
                      <p className="mt-5 text-sm text-slate-600">
                        No published lessons in this module yet.
                      </p>
                    ) : (
                      <div className="mt-5 space-y-4">
                        {moduleLessons.map((lesson) => renderLessonCard(lesson))}
                      </div>
                    )}
                  </section>
                )
              })}

              {uncategorizedLessons.length > 0 && (
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500">General lessons</p>
                      <h3 className="text-xl font-bold text-slate-900">
                        Other lessons
                      </h3>
                      <p className="mt-2 text-slate-600">
                        These lessons are not assigned to a module yet.
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {uncategorizedLessons.length} lesson
                      {uncategorizedLessons.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="mt-5 space-y-4">
                    {uncategorizedLessons.map((lesson) => renderLessonCard(lesson))}
                  </div>
                </section>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}