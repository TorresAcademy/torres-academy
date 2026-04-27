// src/app/teacher/analytics/page.tsx
import Link from 'next/link'
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FolderOpen,
  GraduationCap,
  MessageSquareText,
  RefreshCcw,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

type Course = {
  id: number
  title: string
  slug: string
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

type Enrollment = {
  user_id: string
  course_id: number
}

type Profile = {
  id: string
  full_name: string | null
  email: string | null
}

type Progress = {
  user_id: string
  lesson_id: number
  completed: boolean | null
}

type SubmissionStatus =
  | 'submitted'
  | 'reviewed'
  | 'needs_revision'
  | 'accepted'
  | 'rejected'

type Submission = {
  id: number
  student_id: string
  course_id: number
  lesson_id: number
  status: SubmissionStatus
  teacher_score: number | null
  teacher_feedback: string | null
  created_at: string
  reviewed_at: string | null
}

type RubricScore = {
  submission_id: number
  criterion_key: string
  criterion_label: string
  level: string | null
  score: number | null
}

type Certificate = {
  id: number
  user_id: string
  course_id: number
  status: string
  issued_at: string | null
}

type StudentAnalytics = {
  studentId: string
  name: string
  email: string
  enrolledCourses: number
  completedLessons: number
  totalLessons: number
  progressPercent: number
  pendingSubmissions: number
  needsRevision: number
  acceptedSubmissions: number
  averageScore: number | null
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

function statusClasses(value: number, warning: number, danger: number) {
  if (value >= danger) return 'bg-red-100 text-red-700'
  if (value >= warning) return 'bg-amber-100 text-amber-900'
  return 'bg-emerald-100 text-emerald-700'
}

export default async function TeacherAnalyticsPage() {
  const { supabase, user, profile } = await requireTeacherOrAdmin()
  const serviceSupabase = createServiceRoleClient()
  const isAdmin = profile.role === 'admin'

  const { data: coursesData } = isAdmin
    ? await supabase
        .from('courses')
        .select('id, title, slug, teacher_id')
        .order('title', { ascending: true })
    : await supabase
        .from('courses')
        .select('id, title, slug, teacher_id')
        .eq('teacher_id', user.id)
        .order('title', { ascending: true })

  const courses = (coursesData ?? []) as Course[]
  const courseIds = courses.map((course) => course.id)

  let lessons: Lesson[] = []
  let enrollments: Enrollment[] = []
  let submissions: Submission[] = []
  let certificates: Certificate[] = []

  if (courseIds.length > 0) {
    const [lessonsResult, enrollmentsResult, submissionsResult, certificatesResult] =
      await Promise.all([
        supabase
          .from('lessons')
          .select('id, course_id, title, slug, position, is_published')
          .in('course_id', courseIds)
          .order('course_id', { ascending: true })
          .order('position', { ascending: true }),
        supabase
          .from('enrollments')
          .select('user_id, course_id')
          .in('course_id', courseIds),
        supabase
          .from('student_submissions')
          .select(
            'id, student_id, course_id, lesson_id, status, teacher_score, teacher_feedback, created_at, reviewed_at'
          )
          .in('course_id', courseIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('certificates')
          .select('id, user_id, course_id, status, issued_at')
          .in('course_id', courseIds),
      ])

    lessons = (lessonsResult.data ?? []) as Lesson[]
    enrollments = (enrollmentsResult.data ?? []) as Enrollment[]
    submissions = (submissionsResult.data ?? []) as Submission[]
    certificates = (certificatesResult.data ?? []) as Certificate[]
  }

  const lessonIds = lessons.map((lesson) => lesson.id)
  const studentIds = [...new Set(enrollments.map((item) => item.user_id))]
  const submissionIds = submissions.map((submission) => submission.id)

  let progress: Progress[] = []
  let students: Profile[] = []
  let rubricScores: RubricScore[] = []

  if (lessonIds.length > 0 && studentIds.length > 0) {
    const { data } = await serviceSupabase
      .from('lesson_progress')
      .select('user_id, lesson_id, completed')
      .in('lesson_id', lessonIds)
      .in('user_id', studentIds)

    progress = (data ?? []) as Progress[]
  }

  if (studentIds.length > 0) {
    const { data } = await serviceSupabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds)

    students = (data ?? []) as Profile[]
  }

  if (submissionIds.length > 0) {
    const { data } = await serviceSupabase
      .from('student_submission_rubric_scores')
      .select('submission_id, criterion_key, criterion_label, level, score')
      .in('submission_id', submissionIds)

    rubricScores = (data ?? []) as RubricScore[]
  }

  const courseMap = new Map(courses.map((course) => [course.id, course]))
  const studentMap = new Map(students.map((student) => [student.id, student]))
  const lessonsByCourse = new Map<number, Lesson[]>()

  for (const lesson of lessons) {
    const current = lessonsByCourse.get(lesson.course_id) ?? []
    current.push(lesson)
    lessonsByCourse.set(lesson.course_id, current)
  }

  const progressCompleted = progress.filter((row) => row.completed)
  const totalPossibleProgress = enrollments.reduce((total, enrollment) => {
    return total + (lessonsByCourse.get(enrollment.course_id)?.length ?? 0)
  }, 0)

  const overallCompletion = percent(progressCompleted.length, totalPossibleProgress)
  const pendingSubmissions = submissions.filter(
    (submission) => submission.status === 'submitted'
  )
  const needsRevisionSubmissions = submissions.filter(
    (submission) => submission.status === 'needs_revision'
  )
  const acceptedSubmissions = submissions.filter(
    (submission) => submission.status === 'accepted'
  )
  const issuedCertificates = certificates.filter(
    (certificate) => certificate.status === 'issued'
  )

  const reviewedScores = submissions
    .map((submission) => submission.teacher_score)
    .filter((score): score is number => typeof score === 'number')

  const averageSubmissionScore =
    reviewedScores.length > 0
      ? Math.round(
          reviewedScores.reduce((total, score) => total + score, 0) /
            reviewedScores.length
        )
      : 0

  const studentAnalytics: StudentAnalytics[] = studentIds.map((studentId) => {
    const profile = studentMap.get(studentId)
    const studentEnrollments = enrollments.filter(
      (enrollment) => enrollment.user_id === studentId
    )
    const studentCourseIds = studentEnrollments.map(
      (enrollment) => enrollment.course_id
    )
    const studentLessons = lessons.filter((lesson) =>
      studentCourseIds.includes(lesson.course_id)
    )
    const studentProgress = progress.filter(
      (row) => row.user_id === studentId && row.completed
    )
    const studentSubmissions = submissions.filter(
      (submission) => submission.student_id === studentId
    )
    const studentScores = studentSubmissions
      .map((submission) => submission.teacher_score)
      .filter((score): score is number => typeof score === 'number')

    return {
      studentId,
      name: profile?.full_name || profile?.email || 'Student',
      email: profile?.email || 'No email',
      enrolledCourses: studentCourseIds.length,
      completedLessons: studentProgress.length,
      totalLessons: studentLessons.length,
      progressPercent: percent(studentProgress.length, studentLessons.length),
      pendingSubmissions: studentSubmissions.filter(
        (submission) => submission.status === 'submitted'
      ).length,
      needsRevision: studentSubmissions.filter(
        (submission) => submission.status === 'needs_revision'
      ).length,
      acceptedSubmissions: studentSubmissions.filter(
        (submission) => submission.status === 'accepted'
      ).length,
      averageScore:
        studentScores.length > 0
          ? Math.round(
              studentScores.reduce((total, score) => total + score, 0) /
                studentScores.length
            )
          : null,
    }
  })

  const atRiskStudents = studentAnalytics.filter(
    (student) =>
      student.progressPercent < 40 ||
      student.needsRevision > 0 ||
      student.pendingSubmissions >= 2
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
    average: trend.count > 0 ? trend.total / trend.count : 0,
    percent: trend.count > 0 ? Math.round((trend.total / trend.count / 4) * 100) : 0,
  }))

  const courseAnalytics = courses.map((course) => {
    const courseEnrollments = enrollments.filter(
      (enrollment) => enrollment.course_id === course.id
    )
    const courseLessons = lessonsByCourse.get(course.id) ?? []
    const courseLessonIds = courseLessons.map((lesson) => lesson.id)
    const courseProgress = progress.filter(
      (row) => courseLessonIds.includes(row.lesson_id) && row.completed
    )
    const possible = courseEnrollments.length * courseLessons.length
    const courseSubmissions = submissions.filter(
      (submission) => submission.course_id === course.id
    )

    return {
      course,
      students: courseEnrollments.length,
      lessons: courseLessons.length,
      completion: percent(courseProgress.length, possible),
      pending: courseSubmissions.filter(
        (submission) => submission.status === 'submitted'
      ).length,
      needsRevision: courseSubmissions.filter(
        (submission) => submission.status === 'needs_revision'
      ).length,
      accepted: courseSubmissions.filter(
        (submission) => submission.status === 'accepted'
      ).length,
      certificates: issuedCertificates.filter(
        (certificate) => certificate.course_id === course.id
      ).length,
    }
  })

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              Teacher Analytics
            </p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Learning intelligence dashboard
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Track student progress, evidence submissions, rubric trends,
              certificate readiness, and support priorities across your courses.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-black">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  IB/Cambridge learning insight
                </p>
                <p className="text-sm text-slate-300">
                  Evidence, skills, feedback, and progress in one place.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Students"
          value={studentIds.length}
          note="Enrolled learners"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Completion"
          value={`${overallCompletion}%`}
          note={`${progressCompleted.length}/${totalPossibleProgress} completed`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          label="Pending feedback"
          value={pendingSubmissions.length}
          note="Submissions waiting"
          icon={<MessageSquareText className="h-5 w-5" />}
          tone={pendingSubmissions.length > 0 ? 'red' : 'emerald'}
        />
        <StatCard
          label="Certificates"
          value={issuedCertificates.length}
          note="Issued certificates"
          icon={<Award className="h-5 w-5" />}
          tone="emerald"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Courses"
          value={courses.length}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          label="Lessons"
          value={lessons.length}
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatCard
          label="Needs revision"
          value={needsRevisionSubmissions.length}
          icon={<RefreshCcw className="h-5 w-5" />}
          tone={needsRevisionSubmissions.length > 0 ? 'red' : 'white'}
        />
        <StatCard
          label="Average score"
          value={reviewedScores.length > 0 ? `${averageSubmissionScore}%` : '—'}
          icon={<Target className="h-5 w-5" />}
          tone="blue"
        />
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <SectionHeading
          eyebrow="Support priorities"
          title="Students who may need support"
          description="Students appear here when progress is low, submissions need revision, or feedback is waiting."
          icon={<AlertTriangle className="h-5 w-5" />}
        />

        {atRiskStudents.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-800">
            No urgent support flags right now.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {atRiskStudents.map((student) => (
              <div
                key={student.studentId}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">{student.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{student.email}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                      student.pendingSubmissions,
                      1,
                      2
                    )}`}
                  >
                    {student.pendingSubmissions} pending
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                      student.needsRevision,
                      1,
                      2
                    )}`}
                  >
                    {student.needsRevision} revision
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      student.progressPercent < 40
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {student.progressPercent}% progress
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <SectionHeading
          eyebrow="Course overview"
          title="Course analytics"
          description="Compare progress, evidence, revision needs, and certificate output by course."
          icon={<BarChart3 className="h-5 w-5" />}
        />

        {courseAnalytics.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-700">
            No courses available yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {courseAnalytics.map((item) => (
              <article
                key={item.course.id}
                className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {item.course.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.students} students · {item.lessons} lessons
                    </p>
                  </div>

                  <Link
                    href={`/teacher/courses/${item.course.id}/edit`}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-black"
                  >
                    Open course
                  </Link>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Completion</span>
                    <span>{item.completion}%</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${item.completion}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-white p-3 text-center">
                    <p className="text-2xl font-bold text-slate-900">
                      {item.pending}
                    </p>
                    <p className="text-xs text-slate-500">Pending</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 text-center">
                    <p className="text-2xl font-bold text-amber-700">
                      {item.needsRevision}
                    </p>
                    <p className="text-xs text-slate-500">Revision</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-700">
                      {item.accepted}
                    </p>
                    <p className="text-xs text-slate-500">Accepted</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">
                      {item.certificates}
                    </p>
                    <p className="text-xs text-slate-500">Certificates</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <SectionHeading
          eyebrow="Rubric trends"
          title="Skills and learner attribute trends"
          description="Average evidence strength from rubric feedback across submissions."
          icon={<ClipboardCheck className="h-5 w-5" />}
        />

        {rubricTrends.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-700">
            No rubric feedback has been saved yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {rubricTrends.map((trend) => (
              <div
                key={trend.key}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{trend.label}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {trend.count} rubric review{trend.count === 1 ? '' : 's'}
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
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

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <SectionHeading
          eyebrow="Learner roster"
          title="Student analytics table"
          description="Quick scan of progress, submissions, scores, and accepted evidence."
          icon={<Users className="h-5 w-5" />}
        />

        {studentAnalytics.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-700">
            No enrolled students yet.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] bg-white text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Courses</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Pending</th>
                    <th className="px-4 py-3">Revision</th>
                    <th className="px-4 py-3">Accepted</th>
                    <th className="px-4 py-3">Average score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {studentAnalytics.map((student) => (
                    <tr key={student.studentId}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {student.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {student.email}
                        </p>
                      </td>
                      <td className="px-4 py-4">{student.enrolledCourses}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-amber-400"
                              style={{ width: `${student.progressPercent}%` }}
                            />
                          </div>
                          <span>{student.progressPercent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">{student.pendingSubmissions}</td>
                      <td className="px-4 py-4">{student.needsRevision}</td>
                      <td className="px-4 py-4">{student.acceptedSubmissions}</td>
                      <td className="px-4 py-4">
                        {student.averageScore === null
                          ? '—'
                          : `${student.averageScore}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
