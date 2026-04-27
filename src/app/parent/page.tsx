// src/app/parent/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import UserAvatar from '@/components/user-avatar'

type GuardianLink = {
  id: string
  guardian_id: string
  student_id: string
  relationship: string | null
  status: string
}

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

type Enrollment = {
  user_id: string
  course_id: number
}

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
  is_published: boolean | null
}

type Progress = {
  user_id: string
  lesson_id: number
  completed: boolean | null
}

type Submission = {
  id: number
  student_id: string
  course_id: number
  lesson_id: number
  status: string
  teacher_score: number | null
  teacher_feedback: string | null
  reviewed_at: string | null
  created_at: string
}

type FeedbackRequest = {
  id: number
  user_id: string
  lesson_id: number
  status: string
  teacher_feedback: string | null
  reviewed_at: string | null
  created_at: string | null
}

type Certificate = {
  id: number
  user_id: string
  course_id: number
  verification_code: string
  status: string
  issued_at: string | null
}

type RubricScore = {
  submission_id: number
  criterion_key: string
  criterion_label: string
  level: string | null
  score: number | null
}

const RUBRIC_LEVEL_VALUE: Record<string, number> = {
  Beginning: 1,
  Developing: 2,
  Secure: 3,
  Excellent: 4,
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function percent(part: number, total: number) {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

function levelValue(level: string | null) {
  if (!level) return 0
  return RUBRIC_LEVEL_VALUE[level] ?? 0
}

function statusClasses(status: string | null | undefined) {
  if (status === 'accepted') return 'bg-emerald-100 text-emerald-700'
  if (status === 'reviewed') return 'bg-blue-100 text-blue-700'
  if (status === 'needs_revision') return 'bg-amber-100 text-amber-900'
  if (status === 'rejected') return 'bg-red-100 text-red-700'
  return 'bg-slate-100 text-slate-700'
}

function statusLabel(status: string | null | undefined) {
  return status ? status.replaceAll('_', ' ') : 'submitted'
}

function StatCard({
  label,
  value,
  note,
  icon,
  tone = 'white',
}: {
  label: string
  value: number | string
  note?: string
  icon: React.ReactNode
  tone?: 'white' | 'amber' | 'blue' | 'emerald' | 'red'
}) {
  const tones = {
    white: 'border-slate-200 bg-white text-slate-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    red: 'border-red-200 bg-red-50 text-red-700',
  } as const

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm opacity-75">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          {note && <p className="mt-1 text-xs opacity-75">{note}</p>}
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
          {icon}
        </div>
      </div>
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow: string
  title: string
  description?: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
            {description}
          </p>
        )}
      </div>

      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
        {icon}
      </div>
    </div>
  )
}

export default async function ParentProgressReportPage() {
  const supabase = await createClient()
  const serviceSupabase = createServiceRoleClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/parent')
  }

  const { data: guardianProfile } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  const { data: linksData } = await supabase
    .from('parent_guardian_links')
    .select('id, guardian_id, student_id, relationship, status')
    .eq('guardian_id', user.id)
    .eq('status', 'active')

  const links = (linksData ?? []) as GuardianLink[]
  const studentIds = links.map((link) => link.student_id)

  if (studentIds.length === 0) {
    return (
      <main className="min-h-screen bg-[#f7f3e8] text-slate-900">
        <section className="bg-gradient-to-br from-black via-[#17120a] to-[#5b4300] text-white">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              ← Back
            </Link>

            <h1 className="mt-8 text-4xl font-bold">
              Parent / Guardian Progress Report
            </h1>
            <p className="mt-4 max-w-3xl text-amber-50/90">
              No linked students yet. Ask an administrator to connect your
              guardian account to a student account.
            </p>
          </div>
        </section>
      </main>
    )
  }

  const [
    studentsResult,
    enrollmentsResult,
    submissionsResult,
    feedbackResult,
    certificatesResult,
  ] = await Promise.all([
    serviceSupabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', studentIds),
    serviceSupabase
      .from('enrollments')
      .select('user_id, course_id')
      .in('user_id', studentIds),
    serviceSupabase
      .from('student_submissions')
      .select(
        'id, student_id, course_id, lesson_id, status, teacher_score, teacher_feedback, reviewed_at, created_at'
      )
      .in('student_id', studentIds)
      .order('created_at', { ascending: false }),
    serviceSupabase
      .from('feedback_requests')
      .select('id, user_id, lesson_id, status, teacher_feedback, reviewed_at, created_at')
      .in('user_id', studentIds)
      .order('created_at', { ascending: false }),
    serviceSupabase
      .from('certificates')
      .select('id, user_id, course_id, verification_code, status, issued_at')
      .in('user_id', studentIds),
  ])

  const students = (studentsResult.data ?? []) as Profile[]
  const enrollments = (enrollmentsResult.data ?? []) as Enrollment[]
  const submissions = (submissionsResult.data ?? []) as Submission[]
  const feedbackRequests = (feedbackResult.data ?? []) as FeedbackRequest[]
  const certificates = (certificatesResult.data ?? []) as Certificate[]

  const courseIds = [...new Set(enrollments.map((item) => item.course_id))]
  const submissionIds = submissions.map((submission) => submission.id)

  let courses: Course[] = []
  let lessons: Lesson[] = []
  let progress: Progress[] = []
  let rubricScores: RubricScore[] = []

  if (courseIds.length > 0) {
    const [coursesResult, lessonsResult] = await Promise.all([
      serviceSupabase
        .from('courses')
        .select('id, title, slug, description')
        .in('id', courseIds),
      serviceSupabase
        .from('lessons')
        .select('id, course_id, title, slug, is_published')
        .in('course_id', courseIds)
        .eq('is_published', true),
    ])

    courses = (coursesResult.data ?? []) as Course[]
    lessons = (lessonsResult.data ?? []) as Lesson[]
  }

  const lessonIds = lessons.map((lesson) => lesson.id)

  if (lessonIds.length > 0) {
    const { data } = await serviceSupabase
      .from('lesson_progress')
      .select('user_id, lesson_id, completed')
      .in('user_id', studentIds)
      .in('lesson_id', lessonIds)

    progress = (data ?? []) as Progress[]
  }

  if (submissionIds.length > 0) {
    const { data } = await serviceSupabase
      .from('student_submission_rubric_scores')
      .select('submission_id, criterion_key, criterion_label, level, score')
      .in('submission_id', submissionIds)

    rubricScores = (data ?? []) as RubricScore[]
  }

  const courseMap = new Map(courses.map((course) => [course.id, course]))
  const lessonMap = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const studentMap = new Map(students.map((student) => [student.id, student]))

  const lessonsByCourse = new Map<number, Lesson[]>()
  for (const lesson of lessons) {
    const existing = lessonsByCourse.get(lesson.course_id) ?? []
    existing.push(lesson)
    lessonsByCourse.set(lesson.course_id, existing)
  }

  const totalPossibleLessons = enrollments.reduce((total, enrollment) => {
    return total + (lessonsByCourse.get(enrollment.course_id)?.length ?? 0)
  }, 0)

  const completedLessons = progress.filter((row) => row.completed).length
  const overallProgress = percent(completedLessons, totalPossibleLessons)
  const acceptedSubmissions = submissions.filter(
    (submission) => submission.status === 'accepted'
  )
  const needsRevision = submissions.filter(
    (submission) => submission.status === 'needs_revision'
  )
  const issuedCertificates = certificates.filter(
    (certificate) => certificate.status === 'issued'
  )

  const rubricTrends = Object.values(
    rubricScores.reduce(
      (acc, score) => {
        const key = score.criterion_key
        const value =
          typeof score.score === 'number'
            ? Math.max(0, Math.min(4, score.score / 25))
            : levelValue(score.level)

        if (!acc[key]) {
          acc[key] = {
            key,
            label: score.criterion_label,
            count: 0,
            total: 0,
          }
        }

        if (value > 0) {
          acc[key].count += 1
          acc[key].total += value
        }

        return acc
      },
      {} as Record<string, { key: string; label: string; count: number; total: number }>
    )
  ).map((trend) => ({
    ...trend,
    percent: trend.count > 0 ? Math.round((trend.total / trend.count / 4) * 100) : 0,
  }))

  const studentReports = students.map((student) => {
    const studentEnrollments = enrollments.filter(
      (enrollment) => enrollment.user_id === student.id
    )
    const studentCourseIds = studentEnrollments.map(
      (enrollment) => enrollment.course_id
    )
    const studentLessons = lessons.filter((lesson) =>
      studentCourseIds.includes(lesson.course_id)
    )
    const studentProgress = progress.filter(
      (row) => row.user_id === student.id && row.completed
    )
    const studentSubmissions = submissions.filter(
      (submission) => submission.student_id === student.id
    )
    const studentCertificates = issuedCertificates.filter(
      (certificate) => certificate.user_id === student.id
    )

    return {
      student,
      courses: studentCourseIds
        .map((courseId) => courseMap.get(courseId))
        .filter((course): course is Course => Boolean(course)),
      completed: studentProgress.length,
      totalLessons: studentLessons.length,
      progress: percent(studentProgress.length, studentLessons.length),
      submissions: studentSubmissions,
      accepted: studentSubmissions.filter(
        (submission) => submission.status === 'accepted'
      ).length,
      needsRevision: studentSubmissions.filter(
        (submission) => submission.status === 'needs_revision'
      ).length,
      certificates: studentCertificates,
    }
  })

  return (
    <main className="min-h-screen bg-[#f7f3e8] text-slate-900">
      <section className="bg-gradient-to-br from-black via-[#17120a] to-[#5b4300] text-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              ← Back
            </Link>

            <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white">
              Guardian View
            </div>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-300">
                Torres Academy Family Report
              </p>

              <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight md:text-5xl">
                Parent / Guardian Progress Report
              </h1>

              <p className="mt-5 max-w-3xl text-lg leading-8 text-amber-50/90">
                A family-friendly view of learner progress, evidence,
                submissions, teacher feedback, skills, and certificate
                milestones.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/30 p-6 shadow-2xl backdrop-blur">
              <div className="flex items-center gap-4">
                <div className="rounded-full ring-2 ring-amber-400/30">
                  <UserAvatar
                    src={guardianProfile?.avatar_url}
                    name={guardianProfile?.full_name}
                    email={guardianProfile?.email || user.email}
                    size="lg"
                  />
                </div>

                <div>
                  <p className="text-sm text-amber-100/80">Guardian account</p>
                  <p className="text-xl font-bold text-white">
                    {guardianProfile?.full_name ||
                      guardianProfile?.email ||
                      user.email ||
                      'Guardian'}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-amber-300">
                    {studentIds.length} linked learner
                    {studentIds.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-amber-50">
                  <span>Overall progress</span>
                  <span>{overallProgress}%</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-amber-50/80">
                  {completedLessons} of {totalPossibleLessons} lessons completed
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-6 py-12">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Learners"
            value={studentIds.length}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            label="Progress"
            value={`${overallProgress}%`}
            note={`${completedLessons}/${totalPossibleLessons} lessons`}
            icon={<TrendingUp className="h-5 w-5" />}
            tone="amber"
          />
          <StatCard
            label="Accepted evidence"
            value={acceptedSubmissions.length}
            icon={<CheckCircle2 className="h-5 w-5" />}
            tone="emerald"
          />
          <StatCard
            label="Certificates"
            value={issuedCertificates.length}
            icon={<Award className="h-5 w-5" />}
            tone="blue"
          />
        </section>

        <section>
          <SectionHeading
            eyebrow="Learner overview"
            title="Linked student reports"
            description="A summary of each linked student's current progress and evidence status."
            icon={<GraduationCap className="h-5 w-5" />}
          />

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {studentReports.map((report) => (
              <article
                key={report.student.id}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <UserAvatar
                    src={report.student.avatar_url}
                    name={report.student.full_name}
                    email={report.student.email}
                    size="lg"
                  />

                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {report.student.full_name ||
                        report.student.email ||
                        'Student'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {report.student.email || 'No email'}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {report.courses.length} course
                      {report.courses.length === 1 ? '' : 's'} enrolled
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Progress</span>
                    <span>{report.progress}%</span>
                  </div>

                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${report.progress}%` }}
                    />
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {report.completed} of {report.totalLessons} lessons completed
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-3 text-center">
                    <p className="text-2xl font-bold text-slate-900">
                      {report.submissions.length}
                    </p>
                    <p className="text-xs text-slate-500">Submissions</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-700">
                      {report.accepted}
                    </p>
                    <p className="text-xs text-slate-500">Accepted</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-3 text-center">
                    <p className="text-2xl font-bold text-amber-700">
                      {report.needsRevision}
                    </p>
                    <p className="text-xs text-slate-500">Revision</p>
                  </div>
                </div>

                {report.certificates.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="font-semibold text-emerald-900">
                      Certificate milestone reached
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {report.certificates.length} certificate
                      {report.certificates.length === 1 ? '' : 's'} issued.
                    </p>
                  </div>
                )}

                <div className="mt-5">
                  <p className="text-sm font-semibold text-slate-900">
                    Enrolled courses
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {report.courses.map((course) => (
                      <Link
                        key={course.id}
                        href={`/courses/${course.slug}`}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-amber-100 hover:text-amber-900"
                      >
                        {course.title}
                      </Link>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading
            eyebrow="Recent evidence"
            title="Submissions and teacher review"
            description="A family view of submitted work, review status, scores, and teacher feedback."
            icon={<FileText className="h-5 w-5" />}
          />

          {submissions.length === 0 ? (
            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-slate-700">
                No submissions have been made yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {submissions.slice(0, 10).map((submission) => {
                const student = studentMap.get(submission.student_id)
                const lesson = lessonMap.get(submission.lesson_id)
                const course = courseMap.get(submission.course_id)

                return (
                  <article
                    key={submission.id}
                    className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                            submission.status
                          )}`}
                        >
                          {statusLabel(submission.status)}
                        </span>

                        <h3 className="mt-4 text-xl font-bold text-slate-900">
                          {lesson?.title || 'Submission evidence'}
                        </h3>
                        <p className="mt-2 text-sm text-slate-600">
                          {student?.full_name || student?.email || 'Student'} ·{' '}
                          {course?.title || 'Course'}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Submitted: {formatDate(submission.created_at)}
                        </p>
                      </div>

                      {typeof submission.teacher_score === 'number' && (
                        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-center">
                          <p className="text-2xl font-bold text-amber-900">
                            {submission.teacher_score}
                          </p>
                          <p className="text-xs text-slate-500">Score</p>
                        </div>
                      )}
                    </div>

                    {submission.teacher_feedback && (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-900">
                          Teacher feedback
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                          {submission.teacher_feedback}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Reviewed: {formatDate(submission.reviewed_at)}
                        </p>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <SectionHeading
            eyebrow="Skills"
            title="Learner attribute trends"
            description="A summary of rubric feedback across teacher-reviewed submissions."
            icon={<ClipboardCheck className="h-5 w-5" />}
          />

          {rubricTrends.length === 0 ? (
            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-slate-700">
                No rubric feedback has been recorded yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {rubricTrends.map((trend) => (
                <div
                  key={trend.key}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {trend.label}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {trend.count} rubric review
                        {trend.count === 1 ? '' : 's'}
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      {trend.percent}%
                    </span>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${trend.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeading
            eyebrow="Communication"
            title="Teacher feedback requests"
            description="Recent teacher replies to student feedback requests."
            icon={<MessageSquareText className="h-5 w-5" />}
          />

          {feedbackRequests.length === 0 ? (
            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-slate-700">
                No feedback requests have been made yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {feedbackRequests.slice(0, 6).map((feedback) => {
                const student = studentMap.get(feedback.user_id)
                const lesson = lessonMap.get(feedback.lesson_id)

                return (
                  <article
                    key={feedback.id}
                    className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">
                          {lesson?.title || 'Feedback request'}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {student?.full_name || student?.email || 'Student'} ·{' '}
                          {formatDate(feedback.created_at)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                          feedback.status
                        )}`}
                      >
                        {statusLabel(feedback.status)}
                      </span>
                    </div>

                    {feedback.teacher_feedback ? (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-900">
                          Teacher reply
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                          {feedback.teacher_feedback}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        Waiting for teacher reply.
                      </p>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Privacy note
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                This page only shows students linked to your guardian account by
                the academy. It does not expose private login details or account
                settings.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
