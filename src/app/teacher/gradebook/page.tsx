import Link from 'next/link'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'
import UserAvatar from '@/components/user-avatar'
import GradebookExportButton from '@/components/teacher/gradebook-export-button'

type TeacherGradebookPageProps = {
  searchParams: Promise<{
    course?: string
    risk?: string
    q?: string
  }>
}

type Course = {
  id: number
  title: string
  slug: string
}

type Enrollment = {
  course_id: number
  user_id: string
}

type Student = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

type Lesson = {
  id: number
  course_id: number
  title: string
  slug: string
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
  pass_percentage: number
  quiz_type: string
}

type QuizAttempt = {
  quiz_id: number
  user_id: string
  score_percentage: number
  passed: boolean
  created_at: string | null
}

type Reflection = {
  lesson_id: number
  user_id: string
}

type FeedbackRequest = {
  lesson_id: number
  user_id: string
  status: string
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

type RiskLevel = 'Low' | 'Medium' | 'High'
type CertificateStatus = 'Not ready' | 'Ready' | 'Issued' | 'Revoked'

type GradebookRow = {
  student: Student
  course: Course
  totalLessons: number
  completedLessons: number
  progressPercentage: number
  totalQuizzes: number
  attemptedQuizzes: number
  quizAverage: number | null
  failedAttempts: number
  missingReflections: number
  pendingFeedback: number
  riskLevel: RiskLevel
  riskScore: number
  riskReasons: string[]
  certificateStatus: CertificateStatus
  certificateId: number | null
  certificateCode: string | null
  certificateIssuedAt: string | null
  passedFinalQuizzes: number
  totalFinalQuizzes: number
}

function formatDate(value: string | null) {
  if (!value) return ''

  return new Date(value).toLocaleString()
}

function getRiskBadgeClass(riskLevel: RiskLevel) {
  if (riskLevel === 'High') return 'bg-red-100 text-red-700'
  if (riskLevel === 'Medium') return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

function getRiskCardClass(riskLevel: RiskLevel) {
  if (riskLevel === 'High') return 'border-red-200 bg-red-50'
  if (riskLevel === 'Medium') return 'border-amber-200 bg-amber-50'
  return 'border-green-200 bg-green-50'
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

function normalizeSearch(value: string) {
  return value.trim().toLowerCase()
}

export default async function TeacherGradebookPage({
  searchParams,
}: TeacherGradebookPageProps) {
  const params = await searchParams

  const selectedCourse = params.course || 'all'
  const selectedRisk = params.risk || 'all'
  const searchQuery = params.q || ''

  const { supabase, user, profile } = await requireTeacherOrAdmin()
  const isAdmin = profile.role === 'admin'

  const { data: coursesData } = isAdmin
    ? await supabase
        .from('courses')
        .select('id, title, slug')
        .order('title', { ascending: true })
    : await supabase
        .from('courses')
        .select('id, title, slug')
        .eq('teacher_id', user.id)
        .order('title', { ascending: true })

  const courses = (coursesData ?? []) as Course[]
  const courseIds = courses.map((course) => course.id)

  let enrollments: Enrollment[] = []
  let students: Student[] = []
  let lessons: Lesson[] = []
  let progressRows: ProgressRow[] = []
  let quizzes: Quiz[] = []
  let quizAttempts: QuizAttempt[] = []
  let reflections: Reflection[] = []
  let feedbackRequests: FeedbackRequest[] = []
  let certificates: Certificate[] = []

  if (courseIds.length > 0) {
    const { data: enrollmentsData } = await supabase
      .from('enrollments')
      .select('course_id, user_id')
      .in('course_id', courseIds)

    enrollments = (enrollmentsData ?? []) as Enrollment[]

    const studentIds = [...new Set(enrollments.map((item) => item.user_id))]

    if (studentIds.length > 0) {
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', studentIds)

      students = (studentsData ?? []) as Student[]

      const { data: certificatesData } = await supabase
        .from('certificates')
        .select(
          'id, user_id, course_id, verification_code, status, issued_at, revoked_at'
        )
        .in('course_id', courseIds)
        .in('user_id', studentIds)

      certificates = (certificatesData ?? []) as Certificate[]
    }

    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, course_id, title, slug, is_published')
      .in('course_id', courseIds)
      .eq('is_published', true)
      .order('course_id', { ascending: true })
      .order('position', { ascending: true })

    lessons = (lessonsData ?? []) as Lesson[]

    const lessonIds = lessons.map((lesson) => lesson.id)

    if (lessonIds.length > 0 && studentIds.length > 0) {
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, user_id, completed')
        .in('lesson_id', lessonIds)
        .in('user_id', studentIds)

      progressRows = (progressData ?? []) as ProgressRow[]

      const { data: quizzesData } = await supabase
        .from('quizzes')
        .select('id, lesson_id, pass_percentage, quiz_type')
        .in('lesson_id', lessonIds)
        .eq('is_published', true)

      quizzes = (quizzesData ?? []) as Quiz[]

      const quizIds = quizzes.map((quiz) => quiz.id)

      if (quizIds.length > 0) {
        const { data: attemptsData } = await supabase
          .from('quiz_attempts')
          .select('quiz_id, user_id, score_percentage, passed, created_at')
          .in('quiz_id', quizIds)
          .in('user_id', studentIds)

        quizAttempts = (attemptsData ?? []) as QuizAttempt[]
      }

      const { data: reflectionsData } = await supabase
        .from('lesson_reflections')
        .select('lesson_id, user_id')
        .in('lesson_id', lessonIds)
        .in('user_id', studentIds)

      reflections = (reflectionsData ?? []) as Reflection[]

      const { data: feedbackData } = await supabase
        .from('feedback_requests')
        .select('lesson_id, user_id, status')
        .in('lesson_id', lessonIds)
        .in('user_id', studentIds)

      feedbackRequests = (feedbackData ?? []) as FeedbackRequest[]
    }
  }

  const courseMap = new Map(courses.map((course) => [course.id, course]))
  const studentMap = new Map(students.map((student) => [student.id, student]))
  const lessonsByCourse = new Map<number, Lesson[]>()

  for (const course of courses) {
    lessonsByCourse.set(
      course.id,
      lessons.filter((lesson) => lesson.course_id === course.id)
    )
  }

  const gradebookRows: GradebookRow[] = []

  for (const enrollment of enrollments) {
    const course = courseMap.get(enrollment.course_id)
    const student = studentMap.get(enrollment.user_id)

    if (!course || !student) continue

    const courseLessons = lessonsByCourse.get(course.id) ?? []
    const lessonIds = courseLessons.map((lesson) => lesson.id)
    const totalLessons = courseLessons.length

    const completedLessons = progressRows.filter(
      (progress) =>
        progress.user_id === student.id &&
        progress.completed &&
        lessonIds.includes(progress.lesson_id)
    ).length

    const progressPercentage =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    const courseQuizzes = quizzes.filter((quiz) =>
      lessonIds.includes(quiz.lesson_id)
    )

    const totalQuizzes = courseQuizzes.length
    const quizIds = courseQuizzes.map((quiz) => quiz.id)

    const studentAttempts = quizAttempts.filter(
      (attempt) =>
        attempt.user_id === student.id && quizIds.includes(attempt.quiz_id)
    )

    const bestScoreByQuiz = new Map<number, number>()

    for (const attempt of studentAttempts) {
      const currentBest = bestScoreByQuiz.get(attempt.quiz_id)

      if (currentBest === undefined || attempt.score_percentage > currentBest) {
        bestScoreByQuiz.set(attempt.quiz_id, attempt.score_percentage)
      }
    }

    const bestScores = [...bestScoreByQuiz.values()]
    const attemptedQuizzes = bestScores.length

    const quizAverage =
      bestScores.length > 0
        ? Math.round(
            bestScores.reduce((total, score) => total + score, 0) /
              bestScores.length
          )
        : null

    const failedAttempts = studentAttempts.filter(
      (attempt) => !attempt.passed
    ).length

    const completedLessonIds = progressRows
      .filter(
        (progress) =>
          progress.user_id === student.id &&
          progress.completed &&
          lessonIds.includes(progress.lesson_id)
      )
      .map((progress) => progress.lesson_id)

    const reflectedLessonIds = new Set(
      reflections
        .filter(
          (reflection) =>
            reflection.user_id === student.id &&
            lessonIds.includes(reflection.lesson_id)
        )
        .map((reflection) => reflection.lesson_id)
    )

    const missingReflections = completedLessonIds.filter(
      (lessonId) => !reflectedLessonIds.has(lessonId)
    ).length

    const pendingFeedback = feedbackRequests.filter(
      (request) =>
        request.user_id === student.id &&
        lessonIds.includes(request.lesson_id) &&
        request.status === 'pending'
    ).length

    const courseFinalQuizzes = courseQuizzes.filter(
      (quiz) => quiz.quiz_type === 'final'
    )

    const totalFinalQuizzes = courseFinalQuizzes.length

    const passedFinalQuizzes = courseFinalQuizzes.filter((quiz) =>
      studentAttempts.some(
        (attempt) => attempt.quiz_id === quiz.id && attempt.passed
      )
    ).length

    const existingCertificate =
      certificates.find(
        (certificate) =>
          certificate.user_id === student.id &&
          certificate.course_id === course.id
      ) ?? null

    const certificateReady =
      totalLessons > 0 &&
      completedLessons === totalLessons &&
      missingReflections === 0 &&
      passedFinalQuizzes === totalFinalQuizzes

    let certificateStatus: CertificateStatus = 'Not ready'

    if (existingCertificate?.status === 'issued') {
      certificateStatus = 'Issued'
    } else if (existingCertificate?.status === 'revoked') {
      certificateStatus = 'Revoked'
    } else if (certificateReady) {
      certificateStatus = 'Ready'
    }

    const risk = calculateRisk({
      progressPercentage,
      quizAverage,
      totalQuizzes,
      attemptedQuizzes,
      failedAttempts,
      missingReflections,
      pendingFeedback,
    })

    gradebookRows.push({
      student,
      course,
      totalLessons,
      completedLessons,
      progressPercentage,
      totalQuizzes,
      attemptedQuizzes,
      quizAverage,
      failedAttempts,
      missingReflections,
      pendingFeedback,
      riskLevel: risk.riskLevel,
      riskScore: risk.riskScore,
      riskReasons: risk.riskReasons,
      certificateStatus,
      certificateId: existingCertificate?.id ?? null,
      certificateCode: existingCertificate?.verification_code ?? null,
      certificateIssuedAt: existingCertificate?.issued_at ?? null,
      passedFinalQuizzes,
      totalFinalQuizzes,
    })
  }

  gradebookRows.sort((a, b) => {
    const riskRank = {
      High: 3,
      Medium: 2,
      Low: 1,
    }

    if (riskRank[b.riskLevel] !== riskRank[a.riskLevel]) {
      return riskRank[b.riskLevel] - riskRank[a.riskLevel]
    }

    return a.progressPercentage - b.progressPercentage
  })

  const filteredRows = gradebookRows.filter((row) => {
    const matchesCourse =
      selectedCourse === 'all' || String(row.course.id) === selectedCourse

    const matchesRisk =
      selectedRisk === 'all' || row.riskLevel === selectedRisk

    const query = normalizeSearch(searchQuery)

    const searchableText = normalizeSearch(
      [
        row.student.full_name || '',
        row.student.email || '',
        row.course.title,
        row.riskLevel,
        row.certificateStatus,
        row.certificateCode || '',
        ...row.riskReasons,
      ].join(' ')
    )

    const matchesSearch = !query || searchableText.includes(query)

    return matchesCourse && matchesRisk && matchesSearch
  })

  const highRiskCount = gradebookRows.filter(
    (row) => row.riskLevel === 'High'
  ).length

  const mediumRiskCount = gradebookRows.filter(
    (row) => row.riskLevel === 'Medium'
  ).length

  const lowRiskCount = gradebookRows.filter(
    (row) => row.riskLevel === 'Low'
  ).length

  const readyCertificateCount = filteredRows.filter(
    (row) => row.certificateStatus === 'Ready'
  ).length

  const issuedCertificateCount = filteredRows.filter(
    (row) => row.certificateStatus === 'Issued'
  ).length

  const pendingFeedbackCount = filteredRows.reduce(
    (total, row) => total + row.pendingFeedback,
    0
  )

  const averageProgress =
    filteredRows.length > 0
      ? Math.round(
          filteredRows.reduce(
            (total, row) => total + row.progressPercentage,
            0
          ) / filteredRows.length
        )
      : 0

  const exportRows = filteredRows.map((row) => ({
    studentName: row.student.full_name || row.student.email || 'Unnamed student',
    studentEmail: row.student.email || '',
    courseTitle: row.course.title,
    progressPercentage: row.progressPercentage,
    completedLessons: row.completedLessons,
    totalLessons: row.totalLessons,
    quizAverage: row.quizAverage,
    attemptedQuizzes: row.attemptedQuizzes,
    totalQuizzes: row.totalQuizzes,
    failedAttempts: row.failedAttempts,
    missingReflections: row.missingReflections,
    pendingFeedback: row.pendingFeedback,
    riskLevel: row.riskLevel,
    riskScore: row.riskScore,
    riskReasons: row.riskReasons.join('; '),
    certificateStatus: row.certificateStatus,
    certificateCode: row.certificateCode || '',
    certificateIssuedAt: formatDate(row.certificateIssuedAt),
  }))

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Gradebook
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Student risk system
        </h2>

        <p className="mt-2 text-slate-600">
          Filter students by course, risk level, or search terms. Certificate
          status is now included in teacher reports and CSV exports.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Filtered rows</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {filteredRows.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Total: {gradebookRows.length}
          </p>
        </div>

        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="text-sm text-red-700">High risk</p>
          <p className="mt-2 text-3xl font-bold text-red-700">
            {highRiskCount}
          </p>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-sm text-amber-700">Medium risk</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">
            {mediumRiskCount}
          </p>
        </div>

        <div className="rounded-3xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <p className="text-sm text-green-700">Low risk</p>
          <p className="mt-2 text-3xl font-bold text-green-700">
            {lowRiskCount}
          </p>
        </div>

        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <p className="text-sm text-blue-700">Certs ready</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">
            {readyCertificateCount}
          </p>
        </div>

        <div className="rounded-3xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <p className="text-sm text-green-700">Certs issued</p>
          <p className="mt-2 text-3xl font-bold text-green-700">
            {issuedCertificateCount}
          </p>
        </div>
      </div>

      <form
        action="/teacher/gradebook"
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_180px_auto_auto] lg:items-end">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Search
            </label>
            <input
              name="q"
              defaultValue={searchQuery}
              placeholder="Search student, email, course, reason, certificate..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Course
            </label>
            <select
              name="course"
              defaultValue={selectedCourse}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="all">All courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Risk
            </label>
            <select
              name="risk"
              defaultValue={selectedRisk}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="all">All risk</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Apply filters
          </button>

          <Link
            href="/teacher/gradebook"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
          >
            Clear
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <p className="text-sm text-slate-600">
            Export includes only the rows currently matching your filters.
          </p>

          <GradebookExportButton rows={exportRows} />
        </div>
      </form>

      {pendingFeedbackCount > 0 && (
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">
            Teacher action:
          </span>{' '}
          The filtered gradebook has {pendingFeedbackCount} pending feedback
          request{pendingFeedbackCount === 1 ? '' : 's'}.
        </div>
      )}

      {courses.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">
            No courses assigned
          </h3>

          <p className="mt-2 text-slate-600">
            Once courses are assigned to you, student risk data will appear here.
          </p>
        </div>
      ) : gradebookRows.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">
            No enrolled students yet
          </h3>

          <p className="mt-2 text-slate-600">
            Students will appear here after they enroll in your courses.
          </p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">
            No results match your filters
          </h3>

          <p className="mt-2 text-slate-600">
            Try clearing filters or searching a different student, course, or
            risk level.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredRows.map((row) => (
            <article
              key={`${row.course.id}-${row.student.id}`}
              className={`rounded-3xl border p-6 shadow-sm ${getRiskCardClass(
                row.riskLevel
              )}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="flex items-start gap-4">
                  <UserAvatar
                    src={row.student.avatar_url}
                    name={row.student.full_name}
                    email={row.student.email}
                    size="md"
                  />

                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {row.student.full_name ||
                        row.student.email ||
                        'Unnamed student'}
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                      {row.student.email || 'No email'}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-blue-700">
                      {row.course.title}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-4 py-2 text-sm font-bold ${getCertificateBadgeClass(
                      row.certificateStatus
                    )}`}
                  >
                    Certificate: {row.certificateStatus}
                  </span>

                  <span
                    className={`rounded-full px-4 py-2 text-sm font-bold ${getRiskBadgeClass(
                      row.riskLevel
                    )}`}
                  >
                    {row.riskLevel} risk
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-6">
                <div className="rounded-2xl bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Progress
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {row.progressPercentage}%
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    {row.completedLessons}/{row.totalLessons} lessons
                  </p>
                </div>

                <div className="rounded-2xl bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Quiz avg
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {row.quizAverage === null ? '—' : `${row.quizAverage}%`}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    {row.attemptedQuizzes}/{row.totalQuizzes} quizzes
                  </p>
                </div>

                <div className="rounded-2xl bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Failed attempts
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {row.failedAttempts}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Quiz attempts not passed
                  </p>
                </div>

                <div className="rounded-2xl bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Reflections
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {row.missingReflections}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Missing after completion
                  </p>
                </div>

                <div className="rounded-2xl bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Feedback
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {row.pendingFeedback}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Pending requests
                  </p>
                </div>

                <div className="rounded-2xl bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Certificate
                  </p>

                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {row.certificateStatus}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Finals: {row.passedFinalQuizzes}/{row.totalFinalQuizzes}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-900">
                  Risk reasons
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {row.riskReasons.map((reason) => (
                    <span
                      key={reason}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/teacher/students/${row.student.id}`}
                  className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                >
                  View student
                </Link>

                <Link
                  href={`/courses/${row.course.slug}`}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                >
                  Course overview
                </Link>

                {row.certificateId && (
                  <Link
                    href={`/certificates/${row.certificateId}`}
                    className="rounded-xl border border-green-300 bg-white px-4 py-2 font-semibold text-green-700 transition hover:bg-green-50"
                  >
                    Open certificate
                  </Link>
                )}

                {row.certificateCode && (
                  <Link
                    href={`/certificates/verify/${row.certificateCode}`}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    Verify
                  </Link>
                )}

                {row.pendingFeedback > 0 && (
                  <Link
                    href="/teacher/feedback"
                    className="rounded-xl border border-blue-300 bg-white px-4 py-2 font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    Review feedback
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}