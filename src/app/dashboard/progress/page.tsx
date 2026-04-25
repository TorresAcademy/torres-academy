import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
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
  title: string
  slug: string
  position: number
}

type ProgressRow = {
  lesson_id: number
  completed: boolean | null
}

type Quiz = {
  id: number
  lesson_id: number
  title: string
  quiz_type: string
  pass_percentage: number
  position: number
}

type QuizAttempt = {
  quiz_id: number
  score_percentage: number
  correct_count: number
  total_questions: number
  passed: boolean
  created_at: string | null
}

type Reflection = {
  lesson_id: number
  learned: string | null
  difficult: string | null
  next_step: string | null
  confidence_level: number | null
  updated_at: string | null
}

type FeedbackRequest = {
  id: number
  lesson_id: number
  status: string
  student_message: string
  teacher_feedback: string | null
  created_at: string | null
  reviewed_at: string | null
}

type Certificate = {
  id: number
  course_id: number
  verification_code: string
  status: string
  issued_at: string | null
  revoked_at: string | null
}

type SubmissionTask = {
  id: number
  lesson_id: number
  title: string
  instructions: string | null
  accept_file: boolean
  accept_link: boolean
  accepted_file_types: string[]
  accepted_link_types: string[]
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
  submission_type: 'file' | 'link'
  file_path: string | null
  file_name: string | null
  file_mime_type: string | null
  external_url: string | null
  student_comment: string | null
  status: 'submitted' | 'reviewed' | 'needs_revision' | 'accepted' | 'rejected'
  teacher_score: number | null
  teacher_feedback: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string | null
  updated_at: string | null
}

type SignedStudentSubmission = StudentSubmission & {
  file_url: string | null
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

function getPassBadgeClass(passed: boolean) {
  return passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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

export default async function StudentProgressPage() {
  const supabase = await createClient()
  const serviceSupabase = createServiceRoleClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/dashboard/progress')
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
  let quizzes: Quiz[] = []
  let quizAttempts: QuizAttempt[] = []
  let reflections: Reflection[] = []
  let feedbackRequests: FeedbackRequest[] = []
  let certificates: Certificate[] = []
  let submissionTasks: SubmissionTask[] = []
  let studentSubmissions: SignedStudentSubmission[] = []

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
        .select('id, course_id, title, slug, position')
        .in('course_id', visibleCourseIds)
        .eq('is_published', true)
        .order('course_id', { ascending: true })
        .order('position', { ascending: true })

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
          .select(
            'lesson_id, learned, difficult, next_step, confidence_level, updated_at'
          )
          .eq('user_id', user.id)
          .in('lesson_id', lessonIds)

        reflections = (reflectionsData ?? []) as Reflection[]

        const { data: quizzesData } = await supabase
          .from('quizzes')
          .select('id, lesson_id, title, quiz_type, pass_percentage, position')
          .in('lesson_id', lessonIds)
          .eq('is_published', true)
          .order('position', { ascending: true })

        quizzes = (quizzesData ?? []) as Quiz[]

        const quizIds = quizzes.map((quiz) => quiz.id)

        if (quizIds.length > 0) {
          const { data: attemptsData } = await supabase
            .from('quiz_attempts')
            .select(
              'quiz_id, score_percentage, correct_count, total_questions, passed, created_at'
            )
            .eq('user_id', user.id)
            .in('quiz_id', quizIds)
            .order('created_at', { ascending: false })

          quizAttempts = (attemptsData ?? []) as QuizAttempt[]
        }

        const { data: feedbackData } = await supabase
          .from('feedback_requests')
          .select(
            'id, lesson_id, status, student_message, teacher_feedback, created_at, reviewed_at'
          )
          .eq('user_id', user.id)
          .in('lesson_id', lessonIds)
          .order('created_at', { ascending: false })

        feedbackRequests = (feedbackData ?? []) as FeedbackRequest[]

        const { data: submissionTasksData } = await serviceSupabase
          .from('lesson_submission_tasks')
          .select(
            'id, lesson_id, title, instructions, accept_file, accept_link, accepted_file_types, accepted_link_types, is_required_for_completion, is_required_for_certificate, is_published'
          )
          .in('lesson_id', lessonIds)
          .eq('is_published', true)

        submissionTasks = (submissionTasksData ?? []) as SubmissionTask[]

        const taskIds = submissionTasks.map((task) => task.id)

        if (taskIds.length > 0) {
          const { data: submissionsData } = await serviceSupabase
            .from('student_submissions')
            .select(
              'id, task_id, lesson_id, course_id, student_id, submission_type, file_path, file_name, file_mime_type, external_url, student_comment, status, teacher_score, teacher_feedback, reviewed_by, reviewed_at, created_at, updated_at'
            )
            .eq('student_id', user.id)
            .in('task_id', taskIds)
            .order('updated_at', { ascending: false })

          const rawSubmissions = (submissionsData ?? []) as StudentSubmission[]

          studentSubmissions = await Promise.all(
            rawSubmissions.map(async (submission) => {
              let fileUrl: string | null = null

              if (submission.file_path) {
                const { data } = await serviceSupabase.storage
                  .from('student-submissions')
                  .createSignedUrl(submission.file_path, 60 * 60)

                fileUrl = data?.signedUrl ?? null
              }

              return {
                ...submission,
                file_url: fileUrl,
              }
            })
          )
        }
      }

      const { data: certificatesData } = await supabase
        .from('certificates')
        .select(
          'id, course_id, verification_code, status, issued_at, revoked_at'
        )
        .eq('user_id', user.id)
        .in('course_id', visibleCourseIds)

      certificates = (certificatesData ?? []) as Certificate[]
    }
  }

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

  const bestScoreByQuiz = new Map<number, number>()

  for (const attempt of quizAttempts) {
    const currentBest = bestScoreByQuiz.get(attempt.quiz_id)

    if (currentBest === undefined || attempt.score_percentage > currentBest) {
      bestScoreByQuiz.set(attempt.quiz_id, attempt.score_percentage)
    }
  }

  const bestScores = [...bestScoreByQuiz.values()]

  const quizAverage =
    bestScores.length > 0
      ? Math.round(
          bestScores.reduce((total, score) => total + score, 0) /
            bestScores.length
        )
      : null

  const totalLessons = lessons.length
  const completedLessons = lessons.filter((lesson) =>
    completedLessonIds.has(lesson.id)
  ).length

  const overallProgress =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  const reflectionsSubmitted = lessons.filter((lesson) =>
    reflectedLessonIds.has(lesson.id)
  ).length

  const issuedCertificates = certificates.filter(
    (certificate) => certificate.status === 'issued'
  )

  const pendingFeedback = feedbackRequests.filter(
    (request) => request.status === 'pending'
  )

  const totalSubmissionTasks = submissionTasks.length
  const requiredSubmissionTasks = submissionTasks.filter(
    (task) =>
      task.is_required_for_completion || task.is_required_for_certificate
  )
  const submittedTasks = submissionTasks.filter((task) =>
    taskSubmissionMap.has(task.id)
  ).length
  const missingRequiredSubmissions = requiredSubmissionTasks.filter(
    (task) => !taskSubmissionMap.has(task.id)
  ).length
  const pendingSubmissionReviews = studentSubmissions.filter(
    (submission) => submission.status === 'submitted'
  )
  const needsRevisionSubmissions = studentSubmissions.filter(
    (submission) => submission.status === 'needs_revision'
  )
  const acceptedSubmissions = studentSubmissions.filter(
    (submission) => submission.status === 'accepted'
  )

  function getCourseLessons(courseId: number) {
    return lessons.filter((lesson) => lesson.course_id === courseId)
  }

  function getLessonQuizzes(lessonId: number) {
    return quizzes.filter((quiz) => quiz.lesson_id === lessonId)
  }

  function getLessonFeedback(lessonId: number) {
    return feedbackRequests.filter((request) => request.lesson_id === lessonId)
  }

  function getLessonSubmissionTasks(lessonId: number) {
    return submissionTasks.filter((task) => task.lesson_id === lessonId)
  }

  function getTaskSubmission(taskId: number) {
    return taskSubmissionMap.get(taskId) ?? null
  }

  function getCourseCertificate(courseId: number) {
    return (
      certificates.find((certificate) => certificate.course_id === courseId) ??
      null
    )
  }

  function getBestAttemptForQuiz(quizId: number) {
    const attempts = quizAttempts.filter((attempt) => attempt.quiz_id === quizId)

    if (attempts.length === 0) return null

    return attempts.sort((a, b) => {
      if (Number(b.passed) !== Number(a.passed)) {
        return Number(b.passed) - Number(a.passed)
      }

      return b.score_percentage - a.score_percentage
    })[0]
  }

  function getCourseReport(course: Course) {
    const courseLessons = getCourseLessons(course.id)
    const courseLessonIds = courseLessons.map((lesson) => lesson.id)

    const courseCompletedLessons = courseLessons.filter((lesson) =>
      completedLessonIds.has(lesson.id)
    ).length

    const courseReflectionsSubmitted = courseLessons.filter((lesson) =>
      reflectedLessonIds.has(lesson.id)
    ).length

    const courseProgress =
      courseLessons.length > 0
        ? Math.round((courseCompletedLessons / courseLessons.length) * 100)
        : 0

    const courseFinalQuizzes = quizzes.filter(
      (quiz) =>
        courseLessonIds.includes(quiz.lesson_id) && quiz.quiz_type === 'final'
    )

    const passedFinalQuizzes = courseFinalQuizzes.filter((quiz) =>
      quizAttempts.some(
        (attempt) => attempt.quiz_id === quiz.id && attempt.passed
      )
    ).length

    const certificate = getCourseCertificate(course.id)

    const courseTasks = submissionTasks.filter((task) =>
      courseLessonIds.includes(task.lesson_id)
    )

    const requiredCourseTasks = courseTasks.filter(
      (task) =>
        task.is_required_for_completion || task.is_required_for_certificate
    )

    const courseSubmissions = courseTasks
      .map((task) => getTaskSubmission(task.id))
      .filter(Boolean) as SignedStudentSubmission[]

    const submittedCourseTasks = courseTasks.filter((task) =>
      taskSubmissionMap.has(task.id)
    ).length

    const acceptedCourseSubmissions = courseSubmissions.filter(
      (submission) => submission.status === 'accepted'
    ).length

    const pendingCourseReviews = courseSubmissions.filter(
      (submission) => submission.status === 'submitted'
    ).length

    const courseNeedsRevision = courseSubmissions.filter(
      (submission) => submission.status === 'needs_revision'
    ).length

    const missingRequiredCourseSubmissions = requiredCourseTasks.filter(
      (task) => !taskSubmissionMap.has(task.id)
    ).length

    const eligible =
      courseLessons.length > 0 &&
      courseCompletedLessons === courseLessons.length &&
      courseReflectionsSubmitted === courseLessons.length &&
      passedFinalQuizzes === courseFinalQuizzes.length

    let certificateStatus: CertificateStatus = 'Not ready'

    if (certificate?.status === 'issued') {
      certificateStatus = 'Issued'
    } else if (certificate?.status === 'revoked') {
      certificateStatus = 'Revoked'
    } else if (eligible) {
      certificateStatus = 'Ready'
    }

    return {
      courseLessons,
      courseCompletedLessons,
      courseReflectionsSubmitted,
      courseProgress,
      courseFinalQuizzes,
      passedFinalQuizzes,
      certificate,
      certificateStatus,
      eligible,
      courseTasks,
      requiredCourseTasks,
      submittedCourseTasks,
      acceptedCourseSubmissions,
      pendingCourseReviews,
      courseNeedsRevision,
      missingRequiredCourseSubmissions,
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-blue-600 underline"
            >
              ← Back to dashboard
            </Link>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              Student Progress Report
            </p>

            <h1 className="mt-2 text-4xl font-bold text-slate-900">
              My learning gradebook
            </h1>

            <p className="mt-3 max-w-2xl text-slate-600">
              Track your course progress, lessons, quizzes, reflections,
              submissions, feedback, and certificate readiness in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/certificates"
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              My certificates
            </Link>

            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-4 xl:grid-cols-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Courses</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {courses.length}
            </p>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
            <p className="text-sm text-blue-700">Progress</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {overallProgress}%
            </p>
          </div>

          <div className="rounded-3xl border border-green-200 bg-green-50 p-6 shadow-sm">
            <p className="text-sm text-green-700">Lessons</p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {completedLessons}/{totalLessons}
            </p>
          </div>

          <div className="rounded-3xl border border-purple-200 bg-purple-50 p-6 shadow-sm">
            <p className="text-sm text-purple-700">Quiz avg</p>
            <p className="mt-2 text-3xl font-bold text-purple-700">
              {quizAverage === null ? '—' : `${quizAverage}%`}
            </p>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <p className="text-sm text-amber-700">Reflections</p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {reflectionsSubmitted}/{totalLessons}
            </p>
          </div>

          <div className="rounded-3xl border border-sky-200 bg-sky-50 p-6 shadow-sm">
            <p className="text-sm text-sky-700">Submission tasks</p>
            <p className="mt-2 text-3xl font-bold text-sky-700">
              {submittedTasks}/{totalSubmissionTasks}
            </p>
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <p className="text-sm text-red-700">Need action</p>
            <p className="mt-2 text-3xl font-bold text-red-700">
              {needsRevisionSubmissions.length}
            </p>
            <p className="mt-1 text-xs text-red-700">Needs revision</p>
          </div>

          <div className="rounded-3xl border border-green-200 bg-green-50 p-6 shadow-sm">
            <p className="text-sm text-green-700">Certificates</p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {issuedCertificates.length}
            </p>
          </div>
        </div>

        {(pendingFeedback.length > 0 ||
          pendingSubmissionReviews.length > 0 ||
          needsRevisionSubmissions.length > 0) && (
          <div className="mt-6 space-y-4">
            {pendingFeedback.length > 0 && (
              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">
                  Feedback waiting:
                </span>{' '}
                You have {pendingFeedback.length} pending feedback request
                {pendingFeedback.length === 1 ? '' : 's'}.
              </div>
            )}

            {pendingSubmissionReviews.length > 0 && (
              <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">
                  Submission review:
                </span>{' '}
                You have {pendingSubmissionReviews.length} submission
                {pendingSubmissionReviews.length === 1 ? '' : 's'} waiting for
                teacher review.
              </div>
            )}

            {needsRevisionSubmissions.length > 0 && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">
                  Revision needed:
                </span>{' '}
                You have {needsRevisionSubmissions.length} submission
                {needsRevisionSubmissions.length === 1 ? '' : 's'} that need
                revision.
              </div>
            )}
          </div>
        )}

        {courses.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              No courses yet
            </h2>

            <p className="mt-2 text-slate-600">
              Enroll in a course first, then your progress report will appear
              here.
            </p>

            <Link
              href="/dashboard#available-courses"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Explore courses
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {courses.map((course) => {
              const report = getCourseReport(course)

              return (
                <section
                  key={course.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                        Course progress
                      </p>

                      <h2 className="mt-2 text-3xl font-bold text-slate-900">
                        {course.title}
                      </h2>

                      <p className="mt-3 max-w-2xl text-slate-600">
                        {course.description || 'No course description.'}
                      </p>

                      {report.certificate?.status === 'issued' && (
                        <p className="mt-3 break-all text-sm font-semibold text-green-700">
                          Certificate issued · Code:{' '}
                          {report.certificate.verification_code}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-4 py-2 text-sm font-bold ${getCertificateBadgeClass(
                          report.certificateStatus
                        )}`}
                      >
                        Certificate: {report.certificateStatus}
                      </span>

                      <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
                        {report.courseProgress}% complete
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-6">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Lessons</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {report.courseCompletedLessons}/
                        {report.courseLessons.length}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Reflections</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {report.courseReflectionsSubmitted}/
                        {report.courseLessons.length}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Final quizzes</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {report.passedFinalQuizzes}/
                        {report.courseFinalQuizzes.length}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Submission tasks</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {report.submittedCourseTasks}/
                        {report.courseTasks.length}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Need revision</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {report.courseNeedsRevision}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Certificate</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {report.certificateStatus}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>
                        {report.courseCompletedLessons}/
                        {report.courseLessons.length} lessons completed
                      </span>
                      <span>{report.courseProgress}%</span>
                    </div>

                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${report.courseProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-lg font-bold text-slate-900">
                      Certificate readiness
                    </h3>

                    <p className="mt-2 text-sm text-slate-600">
                      To claim a certificate, complete every published lesson,
                      submit a reflection for every lesson, and pass every final
                      quiz.
                    </p>

                    {report.requiredCourseTasks.length > 0 && (
                      <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">
                          Submission task status
                        </p>

                        <p className="mt-2 text-sm text-slate-700">
                          Required submissions:{' '}
                          {report.requiredCourseTasks.length -
                            report.missingRequiredCourseSubmissions}
                          /{report.requiredCourseTasks.length}
                        </p>

                        <p className="mt-1 text-sm text-slate-700">
                          Pending review: {report.pendingCourseReviews} · Needs
                          revision: {report.courseNeedsRevision} · Accepted:{' '}
                          {report.acceptedCourseSubmissions}
                        </p>
                      </div>
                    )}

                    <div className="mt-5">
                      <CertificateClaimCard
                        courseId={course.id}
                        existingCertificateId={
                          report.certificate?.status === 'issued'
                            ? report.certificate.id
                            : null
                        }
                        requirements={{
                          totalLessons: report.courseLessons.length,
                          completedLessons: report.courseCompletedLessons,
                          reflectionsSubmitted:
                            report.courseReflectionsSubmitted,
                          totalFinalQuizzes:
                            report.courseFinalQuizzes.length,
                          passedFinalQuizzes: report.passedFinalQuizzes,
                        }}
                        eligible={report.eligible}
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-xl font-bold text-slate-900">
                      Lesson checklist
                    </h3>

                    {report.courseLessons.length === 0 ? (
                      <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-slate-600">
                        No published lessons yet.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-4">
                        {report.courseLessons.map((lesson) => {
                          const reflection = reflectionMap.get(lesson.id)
                          const reflectionSubmitted =
                            hasReflectionContent(reflection)
                          const completed = completedLessonIds.has(lesson.id)
                          const lessonQuizzes = getLessonQuizzes(lesson.id)
                          const lessonFeedback = getLessonFeedback(lesson.id)
                          const lessonSubmissionTasks =
                            getLessonSubmissionTasks(lesson.id)

                          return (
                            <article
                              key={lesson.id}
                              className="rounded-2xl border border-slate-200 bg-white p-5"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                  <p className="text-sm text-slate-500">
                                    Lesson {lesson.position}
                                  </p>

                                  <h4 className="mt-1 text-lg font-bold text-slate-900">
                                    {lesson.title}
                                  </h4>
                                </div>

                                <Link
                                  href={`/lessons/${lesson.slug}`}
                                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                                >
                                  {completed ? 'Review lesson' : 'Go to lesson'}
                                </Link>
                              </div>

                              <div className="mt-5 grid gap-3 md:grid-cols-5">
                                <div className="rounded-xl bg-slate-50 p-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    Lesson
                                  </p>

                                  <p className="mt-2 font-bold text-slate-900">
                                    {completed ? 'Completed' : 'Not completed'}
                                  </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    Reflection
                                  </p>

                                  <p className="mt-2 font-bold text-slate-900">
                                    {reflectionSubmitted
                                      ? 'Submitted'
                                      : 'Missing'}
                                  </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    Quizzes
                                  </p>

                                  <p className="mt-2 font-bold text-slate-900">
                                    {lessonQuizzes.length}
                                  </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    Feedback
                                  </p>

                                  <p className="mt-2 font-bold text-slate-900">
                                    {lessonFeedback.length} request
                                    {lessonFeedback.length === 1 ? '' : 's'}
                                  </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    Submissions
                                  </p>

                                  <p className="mt-2 font-bold text-slate-900">
                                    {lessonSubmissionTasks.filter((task) =>
                                      taskSubmissionMap.has(task.id)
                                    ).length}
                                    /{lessonSubmissionTasks.length}
                                  </p>
                                </div>
                              </div>

                              {lessonSubmissionTasks.length > 0 && (
                                <div className="mt-5">
                                  <p className="text-sm font-semibold text-slate-900">
                                    Submission tasks
                                  </p>

                                  <div className="mt-3 space-y-3">
                                    {lessonSubmissionTasks.map((task) => {
                                      const submission = getTaskSubmission(task.id)

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
                                                {(task.is_required_for_completion ||
                                                  task.is_required_for_certificate) && (
                                                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                                    Required
                                                  </span>
                                                )}

                                                <span
                                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getSubmissionBadgeClass(
                                                    submission?.status
                                                  )}`}
                                                >
                                                  {submission
                                                    ? prettySubmissionStatus(
                                                        submission.status
                                                      )
                                                    : 'Not submitted'}
                                                </span>
                                              </div>
                                            </div>

                                            <Link
                                              href={`/lessons/${lesson.slug}`}
                                              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                                            >
                                              Open lesson
                                            </Link>
                                          </div>

                                          {task.instructions && (
                                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                              {task.instructions}
                                            </p>
                                          )}

                                          {!submission ? (
                                            <p className="mt-3 text-sm text-slate-600">
                                              No submission yet.
                                            </p>
                                          ) : (
                                            <div className="mt-4 space-y-3">
                                              {submission.file_url &&
                                              submission.file_name ? (
                                                <p className="text-sm text-slate-700">
                                                  File:{' '}
                                                  <a
                                                    href={submission.file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="font-medium text-blue-600 hover:underline"
                                                  >
                                                    {submission.file_name}
                                                  </a>
                                                </p>
                                              ) : null}

                                              {submission.external_url ? (
                                                <p className="text-sm text-slate-700">
                                                  Link:{' '}
                                                  <a
                                                    href={submission.external_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="font-medium text-blue-600 hover:underline"
                                                  >
                                                    Open submitted link
                                                  </a>
                                                </p>
                                              ) : null}

                                              {submission.student_comment ? (
                                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                                  <p className="text-sm font-semibold text-slate-900">
                                                    My comment
                                                  </p>
                                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                                    {submission.student_comment}
                                                  </p>
                                                </div>
                                              ) : null}

                                              {(submission.teacher_feedback ||
                                                submission.teacher_score !==
                                                  null) && (
                                                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                                                  <p className="text-sm font-semibold text-green-800">
                                                    Teacher review
                                                  </p>

                                                  {submission.teacher_score !==
                                                  null ? (
                                                    <p className="mt-2 text-sm text-slate-700">
                                                      Score:{' '}
                                                      {submission.teacher_score}
                                                    </p>
                                                  ) : null}

                                                  {submission.teacher_feedback ? (
                                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                                      {
                                                        submission.teacher_feedback
                                                      }
                                                    </p>
                                                  ) : null}

                                                  <p className="mt-2 text-xs text-slate-500">
                                                    Reviewed:{' '}
                                                    {formatDate(
                                                      submission.reviewed_at
                                                    )}
                                                  </p>
                                                </div>
                                              )}

                                              <p className="text-xs text-slate-500">
                                                Updated:{' '}
                                                {formatDate(
                                                  submission.updated_at
                                                )}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {lessonQuizzes.length > 0 && (
                                <div className="mt-5">
                                  <p className="text-sm font-semibold text-slate-900">
                                    Quiz results
                                  </p>

                                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    {lessonQuizzes.map((quiz) => {
                                      const bestAttempt = getBestAttemptForQuiz(
                                        quiz.id
                                      )

                                      return (
                                        <div
                                          key={quiz.id}
                                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div>
                                              <p className="font-semibold text-slate-900">
                                                {quiz.title}
                                              </p>

                                              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                                                {quiz.quiz_type} · pass{' '}
                                                {quiz.pass_percentage}%
                                              </p>
                                            </div>

                                            {bestAttempt && (
                                              <span
                                                className={`rounded-full px-3 py-1 text-xs font-bold ${getPassBadgeClass(
                                                  bestAttempt.passed
                                                )}`}
                                              >
                                                {bestAttempt.score_percentage}%
                                              </span>
                                            )}
                                          </div>

                                          {!bestAttempt ? (
                                            <p className="mt-3 text-sm text-slate-600">
                                              No attempt yet.
                                            </p>
                                          ) : (
                                            <p className="mt-3 text-sm text-slate-600">
                                              {bestAttempt.correct_count}/
                                              {bestAttempt.total_questions}{' '}
                                              correct ·{' '}
                                              {bestAttempt.passed
                                                ? 'Passed'
                                                : 'Not passed'}
                                            </p>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {reflection && (
                                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                                  <p className="text-sm font-semibold text-slate-900">
                                    My reflection
                                  </p>

                                  {reflection.learned && (
                                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                      <span className="font-semibold">
                                        Learned:
                                      </span>{' '}
                                      {reflection.learned}
                                    </p>
                                  )}

                                  {reflection.difficult && (
                                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                      <span className="font-semibold">
                                        Difficult:
                                      </span>{' '}
                                      {reflection.difficult}
                                    </p>
                                  )}

                                  {reflection.next_step && (
                                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                      <span className="font-semibold">
                                        Next step:
                                      </span>{' '}
                                      {reflection.next_step}
                                    </p>
                                  )}

                                  <p className="mt-3 text-xs text-slate-500">
                                    Confidence:{' '}
                                    {reflection.confidence_level ?? '—'} ·
                                    Updated: {formatDate(reflection.updated_at)}
                                  </p>
                                </div>
                              )}
                            </article>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        )}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Quiz history</h2>

          {quizAttempts.length === 0 ? (
            <p className="mt-4 text-slate-600">No quiz attempts yet.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {quizAttempts.map((attempt, index) => {
                const quiz = quizzes.find((item) => item.id === attempt.quiz_id)
                const lesson = quiz
                  ? lessons.find((item) => item.id === quiz.lesson_id)
                  : null

                return (
                  <div
                    key={`${attempt.quiz_id}-${attempt.created_at}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {quiz?.title || 'Quiz'}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          {lesson?.title || 'Lesson'} ·{' '}
                          {formatDate(attempt.created_at)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-sm font-bold ${getPassBadgeClass(
                          attempt.passed
                        )}`}
                      >
                        {attempt.score_percentage}%
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-slate-600">
                      {attempt.correct_count}/{attempt.total_questions} correct ·{' '}
                      {attempt.passed ? 'Passed' : 'Not passed'}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">
            Teacher feedback history
          </h2>

          {feedbackRequests.length === 0 ? (
            <p className="mt-4 text-slate-600">No feedback requests yet.</p>
          ) : (
            <div className="mt-5 space-y-4">
              {feedbackRequests.map((request) => {
                const lesson = lessons.find(
                  (item) => item.id === request.lesson_id
                )

                return (
                  <article
                    key={request.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {lesson?.title || 'Lesson'}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Requested {formatDate(request.created_at)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          request.status === 'reviewed'
                            ? 'bg-green-100 text-green-700'
                            : request.status === 'closed'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>

                    <div className="mt-4 rounded-xl bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">
                        My message
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {request.student_message}
                      </p>
                    </div>

                    {request.teacher_feedback && (
                      <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                        <p className="text-sm font-semibold text-green-800">
                          Teacher feedback
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {request.teacher_feedback}
                        </p>

                        <p className="mt-3 text-xs text-slate-500">
                          Reviewed {formatDate(request.reviewed_at)}
                        </p>
                      </div>
                    )}
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