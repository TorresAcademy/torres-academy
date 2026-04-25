import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FileWarning,
  GraduationCap,
  LayoutDashboard,
  MessageSquareMore,
  PlusCircle,
  Presentation,
  Settings2,
  Users,
} from 'lucide-react'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'

function KpiCard({
  label,
  value,
  icon,
  tone = 'slate',
}: {
  label: string
  value: number
  icon: ReactNode
  tone?: 'slate' | 'blue' | 'emerald' | 'amber' | 'indigo'
}) {
  const tones = {
    slate: {
      card: 'border-slate-200 bg-white',
      icon: 'bg-slate-100 text-slate-700',
    },
    blue: {
      card: 'border-blue-200 bg-blue-50',
      icon: 'bg-blue-100 text-blue-700',
    },
    emerald: {
      card: 'border-emerald-200 bg-emerald-50',
      icon: 'bg-emerald-100 text-emerald-700',
    },
    amber: {
      card: 'border-amber-200 bg-amber-50',
      icon: 'bg-amber-100 text-amber-700',
    },
    indigo: {
      card: 'border-indigo-200 bg-indigo-50',
      icon: 'bg-indigo-100 text-indigo-700',
    },
  } as const

  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tones[tone].card}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone].icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function QueueCard({
  title,
  value,
  description,
  href,
  cta,
  tone,
}: {
  title: string
  value: number
  description: string
  href: string
  cta: string
  tone: 'emerald' | 'amber' | 'blue'
}) {
  const tones = {
    emerald: {
      card: 'border-emerald-200 bg-emerald-50',
      title: 'text-emerald-700',
      value: 'text-emerald-900',
      button: 'bg-emerald-600 text-white hover:bg-emerald-700',
    },
    amber: {
      card: 'border-amber-200 bg-amber-50',
      title: 'text-amber-700',
      value: 'text-amber-900',
      button:
        'border border-amber-300 bg-white text-amber-800 hover:bg-amber-100',
    },
    blue: {
      card: 'border-blue-200 bg-blue-50',
      title: 'text-blue-700',
      value: 'text-blue-900',
      button: 'bg-blue-600 text-white hover:bg-blue-700',
    },
  } as const

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tones[tone].card}`}>
      <div className="flex h-full min-h-[250px] flex-col">
        <p className={`text-sm font-semibold ${tones[tone].title}`}>{title}</p>
        <p className={`mt-3 text-4xl font-bold ${tones[tone].value}`}>{value}</p>
        <p className="mt-4 text-sm leading-7 text-slate-700">{description}</p>

        <Link
          href={href}
          className={`mt-auto inline-flex min-h-[46px] items-center justify-center rounded-xl px-4 py-2 font-semibold transition ${tones[tone].button}`}
        >
          {cta}
        </Link>
      </div>
    </div>
  )
}

function ToolTile({
  href,
  label,
  subtitle,
  icon,
  tone = 'default',
}: {
  href: string
  label: string
  subtitle: string
  icon: ReactNode
  tone?: 'default' | 'blue' | 'emerald' | 'indigo'
}) {
  const tones = {
    default:
      'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md',
    blue: 'border-blue-200 bg-blue-50 hover:border-blue-300 hover:shadow-md',
    emerald:
      'border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:shadow-md',
    indigo:
      'border-indigo-200 bg-indigo-50 hover:border-indigo-300 hover:shadow-md',
  } as const

  return (
    <Link
      href={href}
      className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 ${tones[tone]}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>
        </div>
      </div>

      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
        Open <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  )
}

function MiniBarChart({
  title,
  subtitle,
  items,
}: {
  title: string
  subtitle: string
  items: {
    label: string
    value: number
    tone: 'blue' | 'emerald' | 'amber' | 'indigo'
  }[]
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1)

  const barTones = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
  } as const

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">{subtitle}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <BarChart3 className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {items.map((item) => {
          const width = Math.max((item.value / maxValue) * 100, item.value > 0 ? 10 : 0)

          return (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-slate-700">{item.label}</p>
                <p className="text-sm font-semibold text-slate-900">{item.value}</p>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${barTones[item.tone]}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MiniTrendGrid({
  title,
  subtitle,
  items,
}: {
  title: string
  subtitle: string
  items: { label: string; value: number }[]
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1)

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{subtitle}</p>

      <div className="mt-6 grid grid-cols-4 gap-3">
        {items.map((item) => {
          const height = Math.max((item.value / maxValue) * 120, item.value > 0 ? 18 : 8)

          return (
            <div key={item.label} className="flex flex-col items-center gap-3">
              <div className="flex h-32 items-end">
                <div
                  className="w-12 rounded-t-2xl bg-gradient-to-t from-slate-900 via-blue-700 to-blue-400"
                  style={{ height }}
                />
              </div>
              <p className="text-center text-xs font-semibold text-slate-500">
                {item.label}
              </p>
              <p className="text-sm font-bold text-slate-900">{item.value}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TopActionButton({
  href,
  label,
  tone = 'default',
}: {
  href: string
  label: string
  tone?: 'default' | 'primary' | 'emerald' | 'indigo'
}) {
  const tones = {
    default:
      'border border-slate-300 bg-white text-slate-900 hover:border-blue-300 hover:text-blue-600',
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    emerald: 'bg-emerald-600 text-white hover:bg-emerald-700',
    indigo: 'bg-indigo-600 text-white hover:bg-indigo-700',
  } as const

  return (
    <Link
      href={href}
      className={`inline-flex min-h-[42px] items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition ${tones[tone]}`}
    >
      {label}
    </Link>
  )
}

export default async function TeacherHomePage() {
  const { supabase, user, profile } = await requireTeacherOrAdmin()

  const isAdmin = profile.role === 'admin'

  let teacherCourseIds: number[] = []
  let teacherLessonIds: number[] = []

  if (!isAdmin) {
    const { data: teacherCourses } = await supabase
      .from('courses')
      .select('id')
      .eq('teacher_id', user.id)

    teacherCourseIds = (teacherCourses ?? []).map((course) => course.id)

    if (teacherCourseIds.length > 0) {
      const { data: teacherLessons } = await supabase
        .from('lessons')
        .select('id')
        .in('course_id', teacherCourseIds)

      teacherLessonIds = (teacherLessons ?? []).map((lesson) => lesson.id)
    }
  }

  const courseCountPromise = isAdmin
    ? supabase.from('courses').select('id', { count: 'exact', head: true })
    : supabase
        .from('courses')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_id', user.id)

  const lessonCountPromise = isAdmin
    ? supabase.from('lessons').select('id', { count: 'exact', head: true })
    : teacherCourseIds.length > 0
      ? supabase
          .from('lessons')
          .select('id', { count: 'exact', head: true })
          .in('course_id', teacherCourseIds)
      : Promise.resolve({ count: 0 })

  const enrollmentCountPromise = isAdmin
    ? supabase.from('enrollments').select('id', { count: 'exact', head: true })
    : teacherCourseIds.length > 0
      ? supabase
          .from('enrollments')
          .select('id', { count: 'exact', head: true })
          .in('course_id', teacherCourseIds)
      : Promise.resolve({ count: 0 })

  const progressCountPromise = isAdmin
    ? supabase
        .from('lesson_progress')
        .select('id', { count: 'exact', head: true })
        .eq('completed', true)
    : teacherLessonIds.length > 0
      ? supabase
          .from('lesson_progress')
          .select('id', { count: 'exact', head: true })
          .eq('completed', true)
          .in('lesson_id', teacherLessonIds)
      : Promise.resolve({ count: 0 })

  const pendingSubmissionCountPromise = isAdmin
    ? supabase
        .from('student_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'submitted')
    : teacherCourseIds.length > 0
      ? supabase
          .from('student_submissions')
          .select('id', { count: 'exact', head: true })
          .in('course_id', teacherCourseIds)
          .eq('status', 'submitted')
      : Promise.resolve({ count: 0 })

  const needsRevisionSubmissionCountPromise = isAdmin
    ? supabase
        .from('student_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'needs_revision')
    : teacherCourseIds.length > 0
      ? supabase
          .from('student_submissions')
          .select('id', { count: 'exact', head: true })
          .in('course_id', teacherCourseIds)
          .eq('status', 'needs_revision')
      : Promise.resolve({ count: 0 })

  const pendingFeedbackCountPromise = isAdmin
    ? supabase
        .from('feedback_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
    : teacherLessonIds.length > 0
      ? supabase
          .from('feedback_requests')
          .select('id', { count: 'exact', head: true })
          .in('lesson_id', teacherLessonIds)
          .eq('status', 'pending')
      : Promise.resolve({ count: 0 })

  const reviewedFeedbackCountPromise = isAdmin
    ? supabase
        .from('feedback_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'reviewed')
    : teacherLessonIds.length > 0
      ? supabase
          .from('feedback_requests')
          .select('id', { count: 'exact', head: true })
          .in('lesson_id', teacherLessonIds)
          .eq('status', 'reviewed')
      : Promise.resolve({ count: 0 })

  const [
    courseCountResult,
    lessonCountResult,
    enrollmentCountResult,
    progressCountResult,
    pendingSubmissionCountResult,
    needsRevisionSubmissionCountResult,
    pendingFeedbackCountResult,
    reviewedFeedbackCountResult,
  ] = await Promise.all([
    courseCountPromise,
    lessonCountPromise,
    enrollmentCountPromise,
    progressCountPromise,
    pendingSubmissionCountPromise,
    needsRevisionSubmissionCountPromise,
    pendingFeedbackCountPromise,
    reviewedFeedbackCountPromise,
  ])

  const courseCount = courseCountResult.count ?? 0
  const lessonCount = lessonCountResult.count ?? 0
  const enrollmentCount = enrollmentCountResult.count ?? 0
  const completedLessonCount = progressCountResult.count ?? 0
  const pendingSubmissionCount = pendingSubmissionCountResult.count ?? 0
  const needsRevisionSubmissionCount =
    needsRevisionSubmissionCountResult.count ?? 0
  const pendingFeedbackCount = pendingFeedbackCountResult.count ?? 0
  const reviewedFeedbackCount = reviewedFeedbackCountResult.count ?? 0

  const actionNeededCount =
    pendingSubmissionCount +
    needsRevisionSubmissionCount +
    pendingFeedbackCount

  const workQueueData = [
    {
      label: 'Pending submissions',
      value: pendingSubmissionCount,
      tone: 'emerald' as const,
    },
    {
      label: 'Need revision',
      value: needsRevisionSubmissionCount,
      tone: 'amber' as const,
    },
    {
      label: 'Pending feedback',
      value: pendingFeedbackCount,
      tone: 'blue' as const,
    },
    {
      label: 'Reviewed feedback',
      value: reviewedFeedbackCount,
      tone: 'indigo' as const,
    },
  ]

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
              Overview
            </p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">
              Teacher Control Center
            </h1>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Welcome, {profile.full_name || profile.email}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <TopActionButton
              href="/teacher/submissions"
              label="Open submissions"
              tone="emerald"
            />
            <TopActionButton
              href="/teacher/feedback"
              label="Open feedback"
              tone="indigo"
            />
            <TopActionButton
              href="/teacher/courses"
              label="Manage courses"
              tone="primary"
            />
            <TopActionButton
              href="/teacher/lessons"
              label="Lessons"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <KpiCard
          label="Courses"
          value={courseCount}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <KpiCard
          label="Lessons"
          value={lessonCount}
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <KpiCard
          label="Enrollments"
          value={enrollmentCount}
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          label="Completed lessons"
          value={completedLessonCount}
          icon={<GraduationCap className="h-5 w-5" />}
          tone="blue"
        />
        <KpiCard
          label="Pending submissions"
          value={pendingSubmissionCount}
          icon={<FileCheck2 className="h-5 w-5" />}
          tone="emerald"
        />
        <KpiCard
          label="Need revision"
          value={needsRevisionSubmissionCount}
          icon={<FileWarning className="h-5 w-5" />}
          tone="amber"
        />
        <KpiCard
          label="Pending feedback"
          value={pendingFeedbackCount}
          icon={<MessageSquareMore className="h-5 w-5" />}
          tone="indigo"
        />
        <KpiCard
          label="Reviewed feedback"
          value={reviewedFeedbackCount}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Work queues</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Review student evidence, follow revision loops, and answer
                requests for human feedback.
              </p>
            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                actionNeededCount > 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {actionNeededCount > 0 ? 'Needs action' : 'Stable'}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <QueueCard
              title="Submission inbox"
              value={pendingSubmissionCount}
              description="New student evidence waiting for teacher review."
              href="/teacher/submissions"
              cta="Open submissions"
              tone="emerald"
            />

            <QueueCard
              title="Revision tracker"
              value={needsRevisionSubmissionCount}
              description="Submissions currently marked for revision and follow-up."
              href="/teacher/submissions"
              cta="Review revisions"
              tone="amber"
            />

            <QueueCard
              title="Feedback inbox"
              value={pendingFeedbackCount}
              description="Students waiting for guidance, clarification, or teacher help."
              href="/teacher/feedback"
              cta="Open feedback"
              tone="blue"
            />
          </div>
        </div>

        <div className="space-y-6">
          <MiniBarChart
            title="Queue balance"
            subtitle="A quick look at where current teacher attention is concentrated."
            items={workQueueData}
          />

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">Quick tools</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Jump directly into the most-used teacher workflows.
            </p>

            <div className="mt-6 grid gap-4">
              <ToolTile
                href="/teacher/courses"
                label="Manage courses"
                subtitle="Edit course structure, publishing, and pacing."
                icon={<BookOpen className="h-5 w-5" />}
                tone="blue"
              />
              <ToolTile
                href="/teacher/lessons"
                label="Manage lessons"
                subtitle="Organize content, screens, modules, and flow."
                icon={<ClipboardList className="h-5 w-5" />}
              />
              <ToolTile
                href="/teacher/courses/new"
                label="Create new course"
                subtitle="Start a new program, seasonal class, or exam prep track."
                icon={<PlusCircle className="h-5 w-5" />}
              />
              <ToolTile
                href="/dashboard"
                label="Student dashboard"
                subtitle="View the learning environment from the student side."
                icon={<LayoutDashboard className="h-5 w-5" />}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <MiniTrendGrid
          title="Platform footprint"
          subtitle="Core teaching totals in a compact visual snapshot."
          items={[
            { label: 'Courses', value: courseCount },
            { label: 'Lessons', value: lessonCount },
            { label: 'Enroll', value: enrollmentCount },
            { label: 'Done', value: completedLessonCount },
          ]}
        />

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-slate-900">
              Current features
            </h3>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Settings2 className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">
                Course and lesson management
              </p>
              <p className="mt-1">
                Create courses, organize modules, add lessons, manage lesson
                content, publish or unpublish learning materials, and structure
                the student journey.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">
                Submissions and teacher review
              </p>
              <p className="mt-1">
                Students can submit files and secure links, while teachers can
                review evidence, request revisions, accept work, reject
                submissions, and add feedback.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">
                Feedback and notifications
              </p>
              <p className="mt-1">
                Students can request teacher feedback, teachers can respond from
                the review area, and notifications help both sides stay updated
                on important actions.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">
                Progress, pacing, and dashboard tools
              </p>
              <p className="mt-1">
                Track lesson completion, course progress, module pacing, due
                dates, gradebook data, and teacher dashboard summaries from one
                place.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <Presentation className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    Live teaching mode
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Keep lessons, pacing, and presentation flow aligned for live
                    classes and projector use.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}