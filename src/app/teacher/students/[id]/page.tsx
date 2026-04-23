import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'
import UserAvatar from '@/components/user-avatar'

type StudentReportPageProps = {
  params: Promise<{ id: string }>
}

type Student = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  role: string | null
  created_at: string | null
}

type Enrollment = {
  course_id: number
  user_id: string
}

type Course = {
  id: number
  title: string
  slug: string
  description: string | null
  teacher_id: string | null
}

type Lesson = {
  id: number
  course_id: number
  title: string
  slug: string
  position: number
  is_published: boolean | null
}

type ProgressRow = {
  lesson_id: number
  user_id: string
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
  user_id: string
  score_percentage: number
  correct_count: number
  total_questions: number
  passed: boolean
  created_at: string | null
}

type Reflection = {
  lesson_id: number
  user_id: string
  learned: string | null
  difficult: string | null
  next_step: string | null
  confidence_level: number | null
  created_at: string | null
  updated_at: string | null
}

type FeedbackRequest = {
  id: number
  lesson_id: number
  user_id: string
  status: string
  student_message: string
  teacher_feedback: string | null
  created_at: string | null
  reviewed_at: string | null
}

type Certificate = {
  id: number
  user_id: string
  course_id: number
  verification_code: string
  status: string
  issued_at: string | null
  revoked_at: string | null
}

type CertificateStatus = 'Not ready' | 'Ready' | 'Issued' | 'Revoked'

function formatDate(value: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleString()
}

function getRiskBadgeClass(riskLevel: 'Low' | 'Medium' | 'High') {
  if (riskLevel === 'High') return 'bg-red-100 text-red-700'
  if (riskLevel === 'Medium') return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

function getCertificateBadgeClass(status: CertificateStatus) {
  if (status === 'Issued') return 'bg-green-100 text-green-700'
  if (status === 'Ready') return 'bg-blue-100 text-blue-700'
  if (status === 'Revoked') return 'bg-red-100 text-red-700'
  return 'bg-slate-100 text-slate-700'
}

function calculateRisk(input: {
  progressPercentage: number
  quizAverage: number | null
  totalQuizzes: number
  attemptedQuizzes: number
  failedAttempts: number
  missingReflections: number
  pendingFeedback: number
}) {
  let riskScore = 0
  const riskReasons: string[] = []

  if (input.progressPercentage < 40) {
    riskScore += 3
    riskReasons.push('Low course progress')
  } else if (input.progressPercentage < 70) {
    riskScore += 2
    riskReasons.push('Progress below target')
  } else if (input.progressPercentage < 90) {
    riskScore += 1
    riskReasons.push('Progress not complete')
  }

  if (input.totalQuizzes > 0 && input.attemptedQuizzes === 0) {
    riskScore += 1
    riskReasons.push('No quiz attempts yet')
  }

  if (input.quizAverage !== null) {
    if (input.quizAverage < 70) {
      riskScore += 3
      riskReasons.push('Low quiz average')
    } else if (input.quizAverage < 85) {
      riskScore += 2
      riskReasons.push('Quiz average below 85%')
    } else if (input.quizAverage < 90) {
      riskScore += 1
      riskReasons.push('Quiz average below 90%')
    }
  }

  if (input.failedAttempts >= 3) {
    riskScore += 2
    riskReasons.push('Multiple failed quiz attempts')
  } else if (input.failedAttempts > 0) {
    riskScore += 1
    riskReasons.push('Failed quiz attempt')
  }

  if (input.missingReflections >= 3) {
    riskScore += 2
    riskReasons.push('Missing several reflections')
  } else if (input.missingReflections > 0) {
    riskScore += 1
    riskReasons.push('Missing reflection')
  }

  if (input.pendingFeedback > 0) {
    riskScore += 1
    riskReasons.push('Pending feedback request')
  }

  if (riskScore >= 5) {
    return {
      riskLevel: 'High' as const,
      riskScore,
      riskReasons,
    }
  }

  if (riskScore >= 2) {
    return {
      riskLevel: 'Medium' as const,
      riskScore,
      riskReasons,
    }
  }

  return {
    riskLevel: 'Low' as const,
    riskScore,
    riskReasons: riskReasons.length > 0 ? riskReasons : ['On track'],
  }
}

export default async function TeacherStudentReportPage({
  params,
}: StudentReportPageProps) {
  const { id } = await params
  const studentId = id

  const { supabase, user, profile } = await requireTeacherOrAdmin()
  const isAdmin = profile.role === 'admin'

  const { data: studentData } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, role, created_at')
    .eq('id', studentId)
    .maybeSingle()

  if (!studentData) {
    notFound()
  }

  const student = studentData as Student

  const { data: enrollmentsData } = await supabase
    .from('enrollments')
    .select('course_id, user_id')
    .eq('user_id', studentId)

  const enrollments = (enrollmentsData ?? []) as Enrollment[]
  const enrolledCourseIds = enrollments.map((enrollment) => enrollment.course_id)

  let courses: Course[] = []

  if (enrolledCourseIds.length > 0) {
    const courseQuery = supabase
      .from('courses')
      .select('id, title, slug, description, teacher_id')
      .in('id', enrolledCourseIds)
      .order('title', { ascending: true })

    if (!isAdmin) {
      courseQuery.eq('teacher_id', user.id)
    }

    const { data: coursesData } = await courseQuery
    courses = (coursesData ?? []) as Course[]
  }

  if (!isAdmin && courses.length === 0) {
    notFound()
  }

  const courseIds = courses.map((course) => course.id)

  let lessons: Lesson[] = []
  let progressRows: ProgressRow[] = []
  let quizzes: Quiz[] = []
  let quizAttempts: QuizAttempt[] = []
  let reflections: Reflection[] = []
  let feedbackRequests: FeedbackRequest[] = []
  let certificates: Certificate[] = []

  if (courseIds.length > 0) {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, course_id, title, slug, position, is_published')
      .in('course_id', courseIds)
      .eq('is_published', true)
      .order('course_id', { ascending: true })
      .order('position', { ascending: true })

    lessons = (lessonsData ?? []) as Lesson[]

    const lessonIds = lessons.map((lesson) => lesson.id)

    const { data: certificatesData } = await supabase
      .from('certificates')
      .select(
        'id, user_id, course_id, verification_code, status, issued_at, revoked_at'
      )
      .eq('user_id', studentId)
      .in('course_id', courseIds)

    certificates = (certificatesData ?? []) as Certificate[]

    if (lessonIds.length > 0) {
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, user_id, completed')
        .eq('user_id', studentId)
        .in('lesson_id', lessonIds)

      progressRows = (progressData ?? []) as ProgressRow[]

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
            'quiz_id, user_id, score_percentage, correct_count, total_questions, passed, created_at'
          )
          .eq('user_id', studentId)
          .in('quiz_id', quizIds)
          .order('created_at', { ascending: false })

        quizAttempts = (attemptsData ?? []) as QuizAttempt[]
      }

      const { data: reflectionsData } = await supabase
        .from('lesson_reflections')
        .select(
          'lesson_id, user_id, learned, difficult, next_step, confidence_level, created_at, updated_at'
        )
        .eq('user_id', studentId)
        .in('lesson_id', lessonIds)

      reflections = (reflectionsData ?? []) as Reflection[]

      const { data: feedbackData } = await supabase
        .from('feedback_requests')
        .select(
          'id, lesson_id, user_id, status, student_message, teacher_feedback, created_at, reviewed_at'
        )
        .eq('user_id', studentId)
        .in('lesson_id', lessonIds)
        .order('created_at', { ascending: false })

      feedbackRequests = (feedbackData ?? []) as FeedbackRequest[]
    }
  }

  const completedLessonIds = new Set(
    progressRows
      .filter((progress) => progress.completed)
      .map((progress) => progress.lesson_id)
  )

  const reflectedLessonIds = new Set(
    reflections.map((reflection) => reflection.lesson_id)
  )

  const totalLessons = lessons.length
  const completedLessons = lessons.filter((lesson) =>
    completedLessonIds.has(lesson.id)
  ).length

  const progressPercentage =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  const bestScoreByQuiz = new Map<number, number>()

  for (const attempt of quizAttempts) {
    const currentBest = bestScoreByQuiz.get(attempt.quiz_id)

    if (currentBest === undefined || attempt.score_percentage > currentBest) {
      bestScoreByQuiz.set(attempt.quiz_id, attempt.score_percentage)
    }
  }

  const bestScores = [...bestScoreByQuiz.values()]
  const attemptedQuizzes = bestScores.length
  const totalQuizzes = quizzes.length

  const quizAverage =
    bestScores.length > 0
      ? Math.round(
          bestScores.reduce((total, score) => total + score, 0) /
            bestScores.length
        )
      : null

  const failedAttempts = quizAttempts.filter((attempt) => !attempt.passed).length

  const missingReflections = lessons.filter(
    (lesson) =>
      completedLessonIds.has(lesson.id) && !reflectedLessonIds.has(lesson.id)
  ).length

  const pendingFeedback = feedbackRequests.filter(
    (request) => request.status === 'pending'
  ).length

  const issuedCertificates = certificates.filter(
    (certificate) => certificate.status === 'issued'
  ).length

  const risk = calculateRisk({
    progressPercentage,
    quizAverage,
    totalQuizzes,
    attemptedQuizzes,
    failedAttempts,
    missingReflections,
    pendingFeedback,
  })

  function getCourseLessons(courseId: number) {
    return lessons.filter((lesson) => lesson.course_id === courseId)
  }

  function getLessonQuizzes(lessonId: number) {
    return quizzes.filter((quiz) => quiz.lesson_id === lessonId)
  }

  function getLessonReflection(lessonId: number) {
    return reflections.find((reflection) => reflection.lesson_id === lessonId)
  }

  function getLessonFeedbackRequests(lessonId: number) {
    return feedbackRequests.filter((request) => request.lesson_id === lessonId)
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

  function getLessonStatus(lessonId: number) {
    return completedLessonIds.has(lessonId) ? 'Completed' : 'Not completed'
  }

  function getCourseCertificate(courseId: number) {
    return (
      certificates.find((certificate) => certificate.course_id === courseId) ??
      null
    )
  }

  function getCourseCertificateStatus(courseLessons: Lesson[]) {
    const courseLessonIds = courseLessons.map((lesson) => lesson.id)

    const courseCertificate =
      certificates.find((certificate) =>
        courseLessonIds.length > 0
          ? certificate.course_id === courseLessons[0]?.course_id
          : false
      ) ?? null

    const courseCompletedLessons = courseLessons.filter((lesson) =>
      completedLessonIds.has(lesson.id)
    ).length

    const courseReflectionsSubmitted = courseLessons.filter((lesson) =>
      reflectedLessonIds.has(lesson.id)
    ).length

    const courseFinalQuizzes = quizzes.filter(
      (quiz) =>
        courseLessonIds.includes(quiz.lesson_id) && quiz.quiz_type === 'final'
    )

    const passedFinalQuizzes = courseFinalQuizzes.filter((quiz) =>
      quizAttempts.some(
        (attempt) => attempt.quiz_id === quiz.id && attempt.passed
      )
    ).length

    const ready =
      courseLessons.length > 0 &&
      courseCompletedLessons === courseLessons.length &&
      courseReflectionsSubmitted === courseLessons.length &&
      passedFinalQuizzes === courseFinalQuizzes.length

    let status: CertificateStatus = 'Not ready'

    if (courseCertificate?.status === 'issued') {
      status = 'Issued'
    } else if (courseCertificate?.status === 'revoked') {
      status = 'Revoked'
    } else if (ready) {
      status = 'Ready'
    }

    return {
      status,
      certificate: courseCertificate,
      courseCompletedLessons,
      courseReflectionsSubmitted,
      totalFinalQuizzes: courseFinalQuizzes.length,
      passedFinalQuizzes,
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/teacher/gradebook"
          className="text-sm font-medium text-blue-600 underline"
        >
          ← Back to gradebook
        </Link>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Student Report
        </p>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <UserAvatar
              src={student.avatar_url}
              name={student.full_name}
              email={student.email}
              size="lg"
            />

            <div>
              <h2 className="text-3xl font-bold text-slate-900">
                {student.full_name || student.email || 'Unnamed student'}
              </h2>

              <p className="mt-2 text-slate-600">
                {student.email || 'No email available'}
              </p>

              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                {student.role || 'student'} · Joined{' '}
                {formatDate(student.created_at)}
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-5 py-3 text-sm font-bold ${getRiskBadgeClass(
              risk.riskLevel
            )}`}
          >
            {risk.riskLevel} risk
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Overall progress</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">
            {progressPercentage}%
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {completedLessons}/{totalLessons} lessons
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Quiz average</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {quizAverage === null ? '—' : `${quizAverage}%`}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {attemptedQuizzes}/{totalQuizzes} quizzes attempted
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Failed attempts</p>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {failedAttempts}
          </p>
          <p className="mt-1 text-sm text-slate-600">Quiz attempts not passed</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Teacher action</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {pendingFeedback}
          </p>
          <p className="mt-1 text-sm text-slate-600">Pending feedback requests</p>
        </div>

        <div className="rounded-3xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <p className="text-sm text-green-700">Certificates issued</p>
          <p className="mt-2 text-3xl font-bold text-green-700">
            {issuedCertificates}
          </p>
          <p className="mt-1 text-sm text-green-700">Official completions</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900">Risk reasons</h3>

        <div className="mt-4 flex flex-wrap gap-2">
          {risk.riskReasons.map((reason) => (
            <span
              key={reason}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {reason}
            </span>
          ))}
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">
            No course report available
          </h3>

          <p className="mt-2 text-slate-600">
            This student is not enrolled in any courses connected to your account.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {courses.map((course) => {
            const courseLessons = getCourseLessons(course.id)
            const certificateInfo = getCourseCertificateStatus(courseLessons)
            const courseCertificate = getCourseCertificate(course.id)

            const courseCompletedLessons = courseLessons.filter((lesson) =>
              completedLessonIds.has(lesson.id)
            ).length

            const courseProgress =
              courseLessons.length > 0
                ? Math.round(
                    (courseCompletedLessons / courseLessons.length) * 100
                  )
                : 0

            return (
              <section
                key={course.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                      Course report
                    </p>

                    <h3 className="mt-2 text-2xl font-bold text-slate-900">
                      {course.title}
                    </h3>

                    <p className="mt-2 max-w-2xl text-slate-600">
                      {course.description || 'No course description.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-4 py-2 text-sm font-bold ${getCertificateBadgeClass(
                        certificateInfo.status
                      )}`}
                    >
                      Certificate: {certificateInfo.status}
                    </span>

                    <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
                      {courseProgress}%
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Lessons</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {certificateInfo.courseCompletedLessons}/
                      {courseLessons.length}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Reflections</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {certificateInfo.courseReflectionsSubmitted}/
                      {courseLessons.length}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Final quizzes</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {certificateInfo.passedFinalQuizzes}/
                      {certificateInfo.totalFinalQuizzes}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Certificate</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {certificateInfo.status}
                    </p>
                  </div>
                </div>

                {courseCertificate && (
                  <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
                    <p className="font-semibold text-green-800">
                      Certificate record
                    </p>

                    <p className="mt-2 break-all text-sm text-slate-700">
                      Code: {courseCertificate.verification_code}
                    </p>

                    <p className="mt-1 text-sm text-slate-700">
                      Status: {courseCertificate.status} · Issued:{' '}
                      {formatDate(courseCertificate.issued_at)}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={`/certificates/${courseCertificate.id}`}
                        className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700"
                      >
                        Open certificate
                      </Link>

                      <Link
                        href={`/certificates/verify/${courseCertificate.verification_code}`}
                        className="rounded-xl border border-green-300 bg-white px-4 py-2 font-semibold text-green-700 transition hover:bg-green-50"
                      >
                        Verify
                      </Link>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>
                      {courseCompletedLessons}/{courseLessons.length} lessons
                      completed
                    </span>
                    <span>{courseProgress}%</span>
                  </div>

                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${courseProgress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {courseLessons.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                      No published lessons in this course yet.
                    </p>
                  ) : (
                    courseLessons.map((lesson) => {
                      const lessonQuizzes = getLessonQuizzes(lesson.id)
                      const reflection = getLessonReflection(lesson.id)
                      const lessonFeedbacks = getLessonFeedbackRequests(lesson.id)

                      return (
                        <article
                          key={lesson.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="text-sm text-slate-500">
                                Lesson {lesson.position}
                              </p>

                              <h4 className="mt-1 text-lg font-bold text-slate-900">
                                {lesson.title}
                              </h4>

                              <p className="mt-2 text-sm text-slate-600">
                                Status: {getLessonStatus(lesson.id)}
                              </p>
                            </div>

                            <Link
                              href={`/lessons/${lesson.slug}`}
                              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                            >
                              Open lesson
                            </Link>
                          </div>

                          <div className="mt-5 grid gap-3 md:grid-cols-3">
                            <div className="rounded-xl bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Progress
                              </p>

                              <p className="mt-2 font-bold text-slate-900">
                                {completedLessonIds.has(lesson.id)
                                  ? 'Completed'
                                  : 'Not completed'}
                              </p>
                            </div>

                            <div className="rounded-xl bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Reflection
                              </p>

                              <p className="mt-2 font-bold text-slate-900">
                                {reflection ? 'Submitted' : 'Missing'}
                              </p>
                            </div>

                            <div className="rounded-xl bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Feedback
                              </p>

                              <p className="mt-2 font-bold text-slate-900">
                                {lessonFeedbacks.length} request
                                {lessonFeedbacks.length === 1 ? '' : 's'}
                              </p>
                            </div>
                          </div>

                          {lessonQuizzes.length > 0 && (
                            <div className="mt-5">
                              <p className="text-sm font-semibold text-slate-900">
                                Quizzes
                              </p>

                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                {lessonQuizzes.map((quiz) => {
                                  const bestAttempt = getBestAttemptForQuiz(
                                    quiz.id
                                  )

                                  return (
                                    <div
                                      key={quiz.id}
                                      className="rounded-xl border border-slate-200 bg-white p-4"
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
                                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                                              bestAttempt.passed
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                            }`}
                                          >
                                            {bestAttempt.score_percentage}%
                                          </span>
                                        )}
                                      </div>

                                      {!bestAttempt && (
                                        <p className="mt-3 text-sm text-slate-600">
                                          No attempt yet.
                                        </p>
                                      )}

                                      {bestAttempt && (
                                        <p className="mt-3 text-sm text-slate-600">
                                          Best attempt:{' '}
                                          {bestAttempt.correct_count}/
                                          {bestAttempt.total_questions} correct ·{' '}
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
                                Reflection
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
                                {reflection.confidence_level ?? '—'} · Updated:{' '}
                                {formatDate(reflection.updated_at)}
                              </p>
                            </div>
                          )}
                        </article>
                      )
                    })
                  )}
                </div>

                <div className="mt-6">
                  <Link
                    href={`/courses/${course.slug}`}
                    className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    Open course overview
                  </Link>
                </div>
              </section>
            )
          })}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">Quiz history</h3>

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
                      className={`rounded-full px-3 py-1 text-sm font-bold ${
                        attempt.passed
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
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

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">Feedback history</h3>

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
                      Student message
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

                  {request.status === 'pending' && (
                    <div className="mt-4">
                      <Link
                        href="/teacher/feedback"
                        className="inline-flex rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                      >
                        Reply to request
                      </Link>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}