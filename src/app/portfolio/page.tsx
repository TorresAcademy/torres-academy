// src/app/portfolio/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  FolderOpen,
  GraduationCap,
  Lightbulb,
  MessageSquareText,
  NotebookPen,
  RefreshCcw,
  Sparkles,
  Star,
  StarOff,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
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
  is_published: boolean | null
}

type ProgressRow = {
  lesson_id: number
  completed: boolean | null
  completed_at: string | null
  updated_at: string | null
}

type Certificate = {
  id: number
  course_id: number
  verification_code: string
  status: string
  issued_at: string | null
}

type Quiz = {
  id: number
  lesson_id: number
  title: string
  quiz_type: string
  pass_percentage: number
}

type QuizAttempt = {
  id: number
  quiz_id: number
  score_percentage: number
  correct_count: number
  total_questions: number
  passed: boolean
  created_at: string
}

type Reflection = {
  id: number
  lesson_id: number
  learned: string | null
  difficult: string | null
  next_step: string | null
  confidence_level: number | null
  updated_at: string | null
  created_at: string | null
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

type SubmissionTask = {
  id: number
  lesson_id: number
  title: string | null
  instructions: string | null
  is_required_for_completion: boolean | null
  is_required_for_certificate: boolean | null
}

type SubmissionStatus =
  | 'submitted'
  | 'reviewed'
  | 'needs_revision'
  | 'accepted'
  | 'rejected'

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
  status: SubmissionStatus
  teacher_score: number | null
  teacher_feedback: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

type RubricScore = {
  id: string
  submission_id: number
  criterion_key: string
  criterion_label: string
  level: string | null
  score: number | null
  feedback: string | null
}

type PortfolioSubmission = {
  submission: StudentSubmission
  task: SubmissionTask | null
  lesson: Lesson | null
  course: Course | null
  signedFileUrl: string | null
  rubricScores: RubricScore[]
}

type PortfolioHighlight = {
  id: string
  user_id: string
  item_type: string
  item_id: string
  title: string
  subtitle: string | null
  note: string | null
  link_url: string | null
  created_at: string
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

function statusLabel(status: string | null | undefined) {
  if (!status) return 'submitted'
  return status.replaceAll('_', ' ')
}

function statusClasses(status: string | null | undefined) {
  if (status === 'accepted') return 'bg-emerald-100 text-emerald-700'
  if (status === 'reviewed') return 'bg-blue-100 text-blue-700'
  if (status === 'needs_revision') return 'bg-amber-100 text-amber-900'
  if (status === 'rejected') return 'bg-red-100 text-red-700'
  return 'bg-slate-100 text-slate-700'
}

function rubricLevelClasses(level: string | null | undefined) {
  if (level === 'Excellent') return 'bg-emerald-100 text-emerald-700'
  if (level === 'Secure') return 'bg-blue-100 text-blue-700'
  if (level === 'Developing') return 'bg-amber-100 text-amber-900'
  if (level === 'Beginning') return 'bg-slate-100 text-slate-700'
  return 'bg-slate-100 text-slate-500'
}

function confidenceLabel(value: number | null) {
  if (!value) return 'Not selected'
  if (value <= 1) return 'Needs a lot more help'
  if (value === 2) return 'Still unsure'
  if (value === 3) return 'Understands some of it'
  if (value === 4) return 'Confident'
  return 'Can explain it clearly'
}

const LEARNER_ATTRIBUTE_MAP: Record<
  string,
  {
    attribute: string
    description: string
    evidencePrompt: string
  }
> = {
  understanding: {
    attribute: 'Knowledgeable',
    description:
      'Builds accurate subject understanding and connects ideas clearly.',
    evidencePrompt:
      'Look for work that shows accurate concepts, vocabulary, and clear explanations.',
  },
  reasoning: {
    attribute: 'Thinker',
    description:
      'Uses reasoning, problem-solving, explanation, and justified choices.',
    evidencePrompt:
      'Look for working, steps, comparisons, conclusions, and explanations of why.',
  },
  evidence: {
    attribute: 'Inquirer / Researcher',
    description:
      'Supports work with examples, proof, sources, data, images, or working evidence.',
    evidencePrompt:
      'Look for examples, citations, diagrams, uploaded proof, and supporting details.',
  },
  presentation: {
    attribute: 'Communicator',
    description:
      'Communicates learning clearly through structure, visuals, language, and organization.',
    evidencePrompt:
      'Look for clear formatting, readable layout, labels, sequencing, and presentation quality.',
  },
  reflection: {
    attribute: 'Reflective learner',
    description:
      'Recognizes strengths, difficulties, next steps, and learning growth.',
    evidencePrompt:
      'Look for honest reflection, revision, improvement notes, and personal next steps.',
  },
}

const RUBRIC_LEVEL_VALUE: Record<string, number> = {
  Beginning: 1,
  Developing: 2,
  Secure: 3,
  Excellent: 4,
}

function getSkillBand(value: number) {
  if (value >= 3.5) return 'Excellent'
  if (value >= 2.5) return 'Secure'
  if (value >= 1.5) return 'Developing'
  if (value > 0) return 'Beginning'
  return 'Not enough evidence'
}

function skillBandClasses(value: number) {
  if (value >= 3.5) return 'bg-emerald-100 text-emerald-700'
  if (value >= 2.5) return 'bg-blue-100 text-blue-700'
  if (value >= 1.5) return 'bg-amber-100 text-amber-900'
  if (value > 0) return 'bg-slate-100 text-slate-700'
  return 'bg-slate-100 text-slate-500'
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
  tone?: 'white' | 'amber' | 'emerald' | 'blue' | 'red'
}) {
  const tones = {
    white: 'border-slate-200 bg-white text-slate-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
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
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
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

export default async function StudentPortfolioPage() {
  const supabase = await createClient()
  const serviceSupabase = createServiceRoleClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/portfolio')
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  const profile = profileData as Profile | null
  const displayName = profile?.full_name || profile?.email || user.email || 'Student'

  const { data: enrollmentsData } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', user.id)

  const enrollments = (enrollmentsData ?? []) as Enrollment[]
  const courseIds = enrollments.map((item) => item.course_id)

  let courses: Course[] = []
  let lessons: Lesson[] = []

  if (courseIds.length > 0) {
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, title, slug, description')
      .in('id', courseIds)
      .order('title', { ascending: true })

    courses = (coursesData ?? []) as Course[]

    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, course_id, title, slug, position, is_published')
      .in('course_id', courseIds)
      .eq('is_published', true)
      .order('course_id', { ascending: true })
      .order('position', { ascending: true })

    lessons = (lessonsData ?? []) as Lesson[]
  }

  const lessonIds = lessons.map((lesson) => lesson.id)

  let progressRows: ProgressRow[] = []
  let certificates: Certificate[] = []
  let reflections: Reflection[] = []
  let feedbackRequests: FeedbackRequest[] = []
  let submissions: StudentSubmission[] = []
  let tasks: SubmissionTask[] = []
  let quizzes: Quiz[] = []
  let quizAttempts: QuizAttempt[] = []
  let highlights: PortfolioHighlight[] = []

  if (lessonIds.length > 0) {
    const [
      progressResult,
      reflectionsResult,
      feedbackResult,
      submissionsResult,
      quizzesResult,
    ] = await Promise.all([
      supabase
        .from('lesson_progress')
        .select('lesson_id, completed, completed_at, updated_at')
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds),
      supabase
        .from('lesson_reflections')
        .select(
          'id, lesson_id, learned, difficult, next_step, confidence_level, updated_at, created_at'
        )
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds)
        .order('updated_at', { ascending: false }),
      supabase
        .from('feedback_requests')
        .select(
          'id, lesson_id, status, student_message, teacher_feedback, created_at, reviewed_at'
        )
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('student_submissions')
        .select(
          'id, task_id, lesson_id, course_id, student_id, submission_type, file_path, file_name, file_mime_type, external_url, student_comment, status, teacher_score, teacher_feedback, reviewed_at, created_at, updated_at'
        )
        .eq('student_id', user.id)
        .in('lesson_id', lessonIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('quizzes')
        .select('id, lesson_id, title, quiz_type, pass_percentage')
        .in('lesson_id', lessonIds),
    ])

    progressRows = (progressResult.data ?? []) as ProgressRow[]
    reflections = (reflectionsResult.data ?? []) as Reflection[]
    feedbackRequests = (feedbackResult.data ?? []) as FeedbackRequest[]
    submissions = (submissionsResult.data ?? []) as StudentSubmission[]
    quizzes = (quizzesResult.data ?? []) as Quiz[]

    const taskIds = [...new Set(submissions.map((item) => item.task_id))]
    const quizIds = quizzes.map((quiz) => quiz.id)

    if (taskIds.length > 0) {
      const { data } = await supabase
        .from('lesson_submission_tasks')
        .select(
          'id, lesson_id, title, instructions, is_required_for_completion, is_required_for_certificate'
        )
        .in('id', taskIds)

      tasks = (data ?? []) as SubmissionTask[]
    }

    if (quizIds.length > 0) {
      const { data } = await supabase
        .from('quiz_attempts')
        .select(
          'id, quiz_id, score_percentage, correct_count, total_questions, passed, created_at'
        )
        .eq('user_id', user.id)
        .in('quiz_id', quizIds)
        .order('created_at', { ascending: false })

      quizAttempts = (data ?? []) as QuizAttempt[]
    }
  }

  if (courseIds.length > 0) {
    const { data } = await supabase
      .from('certificates')
      .select('id, course_id, verification_code, status, issued_at')
      .eq('user_id', user.id)
      .in('course_id', courseIds)

    certificates = (data ?? []) as Certificate[]
  }

  const { data: highlightsData } = await supabase
    .from('student_portfolio_highlights')
    .select('id, user_id, item_type, item_id, title, subtitle, note, link_url, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  highlights = (highlightsData ?? []) as PortfolioHighlight[]

  const courseMap = new Map(courses.map((course) => [course.id, course]))
  const lessonMap = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const taskMap = new Map(tasks.map((task) => [task.id, task]))

  const signedFileEntries = await Promise.all(
    submissions.map(async (submission) => {
      if (submission.submission_type !== 'file' || !submission.file_path) {
        return [submission.id, null] as const
      }

      const { data } = await serviceSupabase.storage
        .from('student-submissions')
        .createSignedUrl(submission.file_path, 60 * 30)

      return [submission.id, data?.signedUrl ?? null] as const
    })
  )

  const signedFileMap = new Map<number, string | null>(signedFileEntries)

  let rubricScores: RubricScore[] = []
  const submissionIds = submissions.map((submission) => submission.id)

  if (submissionIds.length > 0) {
    const { data } = await supabase
      .from('student_submission_rubric_scores')
      .select(
        'id, submission_id, criterion_key, criterion_label, level, score, feedback'
      )
      .in('submission_id', submissionIds)

    rubricScores = (data ?? []) as RubricScore[]
  }

  const rubricMap = new Map<number, RubricScore[]>()

  for (const score of rubricScores) {
    const existing = rubricMap.get(score.submission_id) ?? []
    existing.push(score)
    rubricMap.set(score.submission_id, existing)
  }

  const portfolioSubmissions: PortfolioSubmission[] = submissions.map(
    (submission) => ({
      submission,
      task: taskMap.get(submission.task_id) ?? null,
      lesson: lessonMap.get(submission.lesson_id) ?? null,
      course: courseMap.get(submission.course_id) ?? null,
      signedFileUrl: signedFileMap.get(submission.id) ?? null,
      rubricScores: rubricMap.get(submission.id) ?? [],
    })
  )

  const completedLessonIds = new Set(
    progressRows.filter((row) => row.completed).map((row) => row.lesson_id)
  )

  const completedLessons = lessons.filter((lesson) =>
    completedLessonIds.has(lesson.id)
  ).length

  const totalLessons = lessons.length
  const overallProgress =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  const acceptedSubmissions = submissions.filter(
    (submission) => submission.status === 'accepted'
  ).length
  const needsRevisionSubmissions = submissions.filter(
    (submission) => submission.status === 'needs_revision'
  ).length
  const reviewedSubmissions = submissions.filter(
    (submission) => submission.status !== 'submitted'
  ).length
  const issuedCertificates = certificates.filter(
    (certificate) => certificate.status === 'issued'
  )

  const passedAttempts = quizAttempts.filter((attempt) => attempt.passed).length
  const bestAverage =
    quizAttempts.length > 0
      ? Math.round(
          quizAttempts.reduce(
            (total, attempt) => total + Number(attempt.score_percentage || 0),
            0
          ) / quizAttempts.length
        )
      : 0

  const recentEvidence = portfolioSubmissions.slice(0, 8)
  const reflectionHighlights = reflections.slice(0, 6)
  const feedbackHighlights = feedbackRequests.slice(0, 6)

  const skillTracker = Object.entries(LEARNER_ATTRIBUTE_MAP).map(
    ([criterionKey, info]) => {
      const matchingScores = rubricScores.filter(
        (score) => score.criterion_key === criterionKey
      )

      const numericValues = matchingScores
        .map((score) => {
          if (typeof score.score === 'number') {
            return Math.max(0, Math.min(4, score.score / 25))
          }

          return levelValue(score.level)
        })
        .filter((value) => value > 0)

      const average =
        numericValues.length > 0
          ? numericValues.reduce((total, value) => total + value, 0) /
            numericValues.length
          : 0

      const strongestEvidence = portfolioSubmissions.find((item) =>
        item.rubricScores.some(
          (score) =>
            score.criterion_key === criterionKey &&
            (score.level === 'Excellent' || score.level === 'Secure')
        )
      )

      const needsPractice = matchingScores.some(
        (score) =>
          score.level === 'Beginning' ||
          score.level === 'Developing' ||
          (typeof score.score === 'number' && score.score < 65)
      )

      return {
        criterionKey,
        criterionLabel:
          matchingScores[0]?.criterion_label ||
          criterionKey.charAt(0).toUpperCase() + criterionKey.slice(1),
        attribute: info.attribute,
        description: info.description,
        evidencePrompt: info.evidencePrompt,
        evidenceCount: matchingScores.length,
        average,
        band: getSkillBand(average),
        strongestEvidence,
        needsPractice,
      }
    }
  )

  const strongestSkills = skillTracker
    .filter((skill) => skill.average > 0)
    .sort((a, b) => b.average - a.average)
    .slice(0, 2)

  const growthSkills = skillTracker
    .filter((skill) => skill.evidenceCount > 0 && skill.average < 2.5)
    .sort((a, b) => a.average - b.average)
    .slice(0, 2)


  function getCourseProgress(courseId: number) {
    const courseLessons = lessons.filter((lesson) => lesson.course_id === courseId)
    const completed = courseLessons.filter((lesson) =>
      completedLessonIds.has(lesson.id)
    ).length

    const percentage =
      courseLessons.length > 0
        ? Math.round((completed / courseLessons.length) * 100)
        : 0

    return {
      total: courseLessons.length,
      completed,
      percentage,
    }
  }

  const highlightKeys = new Set(
    highlights.map((highlight) => `${highlight.item_type}:${highlight.item_id}`)
  )

  function isHighlighted(itemType: string, itemId: number | string) {
    return highlightKeys.has(`${itemType}:${String(itemId)}`)
  }

  async function addPortfolioHighlight(formData: FormData) {
    'use server'

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login?next=/portfolio')
    }

    const itemType = String(formData.get('item_type') || '').trim()
    const itemId = String(formData.get('item_id') || '').trim()
    const title = String(formData.get('title') || '').trim()
    const subtitle = String(formData.get('subtitle') || '').trim()
    const note = String(formData.get('note') || '').trim()
    const linkUrl = String(formData.get('link_url') || '').trim()

    if (!itemType || !itemId || !title) {
      return
    }

    await supabase.from('student_portfolio_highlights').upsert(
      {
        user_id: user.id,
        item_type: itemType,
        item_id: itemId,
        title,
        subtitle: subtitle || null,
        note: note || null,
        link_url: linkUrl || null,
      },
      {
        onConflict: 'user_id,item_type,item_id',
      }
    )

    redirect('/portfolio')
  }

  async function removePortfolioHighlight(formData: FormData) {
    'use server'

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login?next=/portfolio')
    }

    const highlightId = String(formData.get('highlight_id') || '').trim()

    if (!highlightId) {
      return
    }

    await supabase
      .from('student_portfolio_highlights')
      .delete()
      .eq('id', highlightId)
      .eq('user_id', user.id)

    redirect('/portfolio')
  }

  return (
    <main className="min-h-screen bg-[#f7f3e8] text-slate-900">
      <section className="bg-gradient-to-br from-black via-[#17120a] to-[#5b4300] text-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 hover:text-amber-300"
            >
              ← Back to dashboard
            </Link>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/progress"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 hover:text-amber-300"
              >
                Progress report
              </Link>

              <Link
                href="/certificates"
                className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
              >
                Certificates
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-300">
                Flex Scholar Portfolio
              </p>

              <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight md:text-5xl">
                My learning portfolio
              </h1>

              <p className="mt-5 max-w-3xl text-lg leading-8 text-amber-50/90">
                A record of your learning journey: progress, evidence,
                reflections, teacher feedback, quiz performance, and certificate
                readiness.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-amber-100">
                  IB/Cambridge-style evidence
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-amber-100">
                  Reflection and growth
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-amber-100">
                  Teacher feedback history
                </span>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/30 p-6 shadow-2xl backdrop-blur">
              <div className="flex items-center gap-4">
                <div className="rounded-full ring-2 ring-amber-400/30">
                  <UserAvatar
                    src={profile?.avatar_url}
                    name={profile?.full_name}
                    email={profile?.email || user.email}
                    size="lg"
                  />
                </div>

                <div>
                  <p className="text-sm text-amber-100/80">Portfolio owner</p>
                  <p className="text-xl font-bold text-white">{displayName}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-amber-300">
                    {profile?.role || 'student'}
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
                  {completedLessons} of {totalLessons} lessons completed
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-6 py-12">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Courses"
            value={courses.length}
            note="Enrolled courses"
            icon={<BookOpen className="h-5 w-5" />}
          />
          <StatCard
            label="Progress"
            value={`${overallProgress}%`}
            note={`${completedLessons}/${totalLessons} lessons`}
            icon={<Trophy className="h-5 w-5" />}
            tone="amber"
          />
          <StatCard
            label="Evidence"
            value={submissions.length}
            note={`${acceptedSubmissions} accepted`}
            icon={<FolderOpen className="h-5 w-5" />}
            tone="blue"
          />
          <StatCard
            label="Certificates"
            value={issuedCertificates.length}
            note="Issued certificates"
            icon={<Award className="h-5 w-5" />}
            tone="emerald"
          />
        </section>

        <section>
          <SectionHeading
            eyebrow="Skills and learner attributes"
            title="My growth tracker"
            description="This tracker uses teacher rubric feedback to show strengths, growth areas, and evidence linked to IB/Cambridge-style learner attributes."
            icon={<TrendingUp className="h-5 w-5" />}
          />

          {rubricScores.length === 0 ? (
            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">
                No rubric evidence yet
              </h3>
              <p className="mt-2 text-slate-600">
                When your teacher reviews submissions with rubric criteria, your
                skills and learner attributes will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-900">
                        Current strengths
                      </p>
                      {strongestSkills.length === 0 ? (
                        <p className="mt-2 text-sm leading-7 text-slate-700">
                          Keep submitting work to build stronger evidence.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {strongestSkills.map((skill) => (
                            <p
                              key={skill.criterionKey}
                              className="text-sm leading-7 text-slate-700"
                            >
                              <span className="font-semibold text-slate-900">
                                {skill.attribute}
                              </span>{' '}
                              through {skill.criterionLabel.toLowerCase()}.
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
                      <Lightbulb className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-900">
                        Suggested growth focus
                      </p>
                      {growthSkills.length === 0 ? (
                        <p className="mt-2 text-sm leading-7 text-slate-700">
                          No urgent growth focus yet. Continue collecting
                          teacher-reviewed evidence.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {growthSkills.map((skill) => (
                            <p
                              key={skill.criterionKey}
                              className="text-sm leading-7 text-slate-700"
                            >
                              Practice{' '}
                              <span className="font-semibold text-slate-900">
                                {skill.criterionLabel.toLowerCase()}
                              </span>{' '}
                              to strengthen your {skill.attribute.toLowerCase()}{' '}
                              profile.
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {skillTracker.map((skill) => (
                  <article
                    key={skill.criterionKey}
                    className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                          {skill.attribute}
                        </p>
                        <h3 className="mt-2 text-2xl font-bold text-slate-900">
                          {skill.criterionLabel}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {skill.description}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${skillBandClasses(
                          skill.average
                        )}`}
                      >
                        {skill.band}
                      </span>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>Evidence strength</span>
                        <span>
                          {skill.average > 0
                            ? `${Math.round((skill.average / 4) * 100)}%`
                            : '—'}
                        </span>
                      </div>

                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{
                            width: `${
                              skill.average > 0
                                ? Math.round((skill.average / 4) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        Based on {skill.evidenceCount} rubric review
                        {skill.evidenceCount === 1 ? '' : 's'}.
                      </p>
                    </div>

                    <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">
                        What counts as evidence?
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {skill.evidencePrompt}
                      </p>
                    </div>

                    {skill.strongestEvidence?.lesson && (
                      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-sm font-semibold text-emerald-900">
                          Linked evidence
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-700">
                          {skill.strongestEvidence.task?.title ||
                            'Submission evidence'}{' '}
                          · {skill.strongestEvidence.lesson.title}
                        </p>
                        <div className="mt-3">
                          <Link
                            href={`/lessons/${skill.strongestEvidence.lesson.slug}`}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-black"
                          >
                            Open evidence lesson
                          </Link>
                        </div>
                      </div>
                    )}

                    {skill.needsPractice && (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-900">
                          Growth suggestion
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-700">
                          In your next submission, focus on making this skill
                          more visible and ask your teacher for specific
                          feedback.
                        </p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

        <section>
          <SectionHeading
            eyebrow="Showcase highlights"
            title="My selected portfolio highlights"
            description="Mark your strongest evidence, reflections, or teacher-reviewed work as showcase pieces."
            icon={<Star className="h-5 w-5" />}
          />

          {highlights.length === 0 ? (
            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">
                No highlights selected yet
              </h3>
              <p className="mt-2 text-slate-600">
                Use the “Add to highlights” buttons below to showcase your best
                submissions and reflections.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {highlights.map((highlight) => (
                <article
                  key={highlight.id}
                  className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-amber-300">
                        <Star className="h-3.5 w-3.5" />
                        {highlight.item_type.replaceAll('_', ' ')}
                      </div>

                      <h3 className="mt-4 text-2xl font-bold text-slate-900">
                        {highlight.title}
                      </h3>

                      {highlight.subtitle && (
                        <p className="mt-2 text-sm leading-7 text-slate-700">
                          {highlight.subtitle}
                        </p>
                      )}

                      {highlight.note && (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                          {highlight.note}
                        </p>
                      )}

                      <p className="mt-3 text-xs text-slate-500">
                        Added: {formatDate(highlight.created_at)}
                      </p>
                    </div>

                    <form action={removePortfolioHighlight}>
                      <input
                        type="hidden"
                        name="highlight_id"
                        value={highlight.id}
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        <StarOff className="h-4 w-4" />
                        Remove
                      </button>
                    </form>
                  </div>

                  {highlight.link_url && (
                    <div className="mt-5">
                      <Link
                        href={highlight.link_url}
                        className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-amber-300 transition hover:bg-black"
                      >
                        Open item
                      </Link>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeading
            eyebrow="Learning progress"
            title="Course progress overview"
            description="A high-level view of each enrolled course and how far you have progressed."
            icon={<GraduationCap className="h-5 w-5" />}
          />

          {courses.length === 0 ? (
            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-slate-700">
                You are not enrolled in any courses yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {courses.map((course) => {
                const progress = getCourseProgress(course.id)
                const certificate = certificates.find(
                  (item) =>
                    item.course_id === course.id && item.status === 'issued'
                )

                return (
                  <article
                    key={course.id}
                    className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">
                          {course.title}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {course.description || 'No description yet.'}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          progress.percentage === 100
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {progress.percentage}%
                      </span>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>
                          {progress.completed} of {progress.total} lessons
                        </span>
                        <span>{progress.percentage}%</span>
                      </div>

                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                    </div>

                    {certificate && (
                      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="font-semibold text-emerald-800">
                          Certificate issued
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          Code: {certificate.verification_code}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Issued: {formatDate(certificate.issued_at)}
                        </p>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href={`/courses/${course.slug}`}
                        className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-amber-300 transition hover:bg-black"
                      >
                        Open course
                      </Link>

                      {certificate && (
                        <Link
                          href={`/certificates/${certificate.id}`}
                          className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          View certificate
                        </Link>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <SectionHeading
            eyebrow="Evidence portfolio"
            title="Submitted work and teacher review"
            description="Your uploaded files, external project links, teacher scores, and feedback."
            icon={<FolderOpen className="h-5 w-5" />}
          />

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <StatCard
              label="Reviewed"
              value={reviewedSubmissions}
              icon={<CheckCircle2 className="h-5 w-5" />}
              tone="blue"
            />
            <StatCard
              label="Accepted"
              value={acceptedSubmissions}
              icon={<Trophy className="h-5 w-5" />}
              tone="emerald"
            />
            <StatCard
              label="Needs revision"
              value={needsRevisionSubmissions}
              icon={<RefreshCcw className="h-5 w-5" />}
              tone={needsRevisionSubmissions > 0 ? 'red' : 'white'}
            />
          </div>

          {recentEvidence.length === 0 ? (
            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-slate-700">
                No evidence submissions yet. When you submit files or links in
                lessons, they will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {recentEvidence.map((card) => {
                const submission = card.submission
                const lessonTitle = card.lesson?.title || 'Unknown lesson'
                const courseTitle = card.course?.title || 'Unknown course'
                const taskTitle = card.task?.title || 'Submission task'

                return (
                  <article
                    key={submission.id}
                    className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                              submission.status
                            )}`}
                          >
                            {statusLabel(submission.status)}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {submission.submission_type === 'file'
                              ? 'File evidence'
                              : 'Link evidence'}
                          </span>

                          {card.task?.is_required_for_certificate && (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                              Certificate evidence
                            </span>
                          )}
                        </div>

                        <h3 className="mt-4 text-2xl font-bold text-slate-900">
                          {taskTitle}
                        </h3>

                        <p className="mt-2 text-slate-600">
                          {courseTitle} · {lessonTitle}
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                          Submitted: {formatDate(submission.created_at)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {submission.submission_type === 'file' &&
                          card.signedFileUrl && (
                            <a
                              href={card.signedFileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-amber-300 transition hover:bg-black"
                            >
                              <FileText className="h-4 w-4" />
                              Open file
                            </a>
                          )}

                        {submission.submission_type === 'link' &&
                          submission.external_url && (
                            <a
                              href={submission.external_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-amber-300 transition hover:bg-black"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Open link
                            </a>
                          )}

                        {card.lesson && (
                          <Link
                            href={`/lessons/${card.lesson.slug}`}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
                          >
                            View lesson
                          </Link>
                        )}

                        {isHighlighted('submission', submission.id) ? (
                          <span className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 font-semibold text-amber-900">
                            <Star className="h-4 w-4" />
                            Highlighted
                          </span>
                        ) : (
                          <form action={addPortfolioHighlight}>
                            <input type="hidden" name="item_type" value="submission" />
                            <input type="hidden" name="item_id" value={submission.id} />
                            <input type="hidden" name="title" value={taskTitle} />
                            <input
                              type="hidden"
                              name="subtitle"
                              value={`${courseTitle} · ${lessonTitle}`}
                            />
                            <input
                              type="hidden"
                              name="note"
                              value={
                                submission.teacher_feedback ||
                                submission.student_comment ||
                                'Selected evidence from my learning portfolio.'
                              }
                            />
                            <input
                              type="hidden"
                              name="link_url"
                              value={card.lesson ? `/lessons/${card.lesson.slug}` : '/portfolio'}
                            />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 font-semibold text-amber-900 transition hover:bg-amber-100"
                            >
                              <Star className="h-4 w-4" />
                              Add to highlights
                            </button>
                          </form>
                        )}
                      </div>
                    </div>

                    {submission.student_comment && (
                      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">
                          My comment
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                          {submission.student_comment}
                        </p>
                      </div>
                    )}

                    {(submission.teacher_feedback ||
                      typeof submission.teacher_score === 'number') && (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-900">
                          Teacher review
                        </p>

                        {typeof submission.teacher_score === 'number' && (
                          <p className="mt-2 text-sm text-slate-700">
                            Score:{' '}
                            <span className="font-semibold text-slate-900">
                              {submission.teacher_score}
                            </span>
                          </p>
                        )}

                        {submission.teacher_feedback && (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                            {submission.teacher_feedback}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-slate-500">
                          Reviewed: {formatDate(submission.reviewed_at)}
                        </p>
                      </div>
                    )}

                    {card.rubricScores.length > 0 && (
                      <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4 text-blue-700" />
                          <p className="text-sm font-semibold text-blue-900">
                            Rubric feedback
                          </p>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {card.rubricScores.map((score) => (
                            <div
                              key={score.id}
                              className="rounded-2xl border border-blue-100 bg-white p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold text-slate-900">
                                  {score.criterion_label}
                                </p>

                                {score.level && (
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rubricLevelClasses(
                                      score.level
                                    )}`}
                                  >
                                    {score.level}
                                  </span>
                                )}
                              </div>

                              {typeof score.score === 'number' && (
                                <p className="mt-2 text-sm text-slate-700">
                                  Score: {score.score}
                                </p>
                              )}

                              {score.feedback && (
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                  {score.feedback}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
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
            eyebrow="Reflection journal"
            title="Metacognition and learning habits"
            description="Your reflections show how your understanding, confidence, and next steps are developing."
            icon={<NotebookPen className="h-5 w-5" />}
          />

          {reflectionHighlights.length === 0 ? (
            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-slate-700">
                No reflections yet. Lesson reflection answers will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {reflectionHighlights.map((reflection) => {
                const lesson = lessonMap.get(reflection.lesson_id)
                const course = lesson ? courseMap.get(lesson.course_id) : null

                return (
                  <article
                    key={reflection.id}
                    className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">
                          {lesson?.title || 'Lesson reflection'}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {course?.title || 'Course'} ·{' '}
                          {formatDate(reflection.updated_at || reflection.created_at)}
                        </p>
                      </div>

                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        Confidence: {reflection.confidence_level ?? '—'}
                      </span>
                    </div>

                    <div className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
                      <div>
                        <p className="font-semibold text-slate-900">
                          What I learned
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">
                          {reflection.learned || 'No answer yet.'}
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold text-slate-900">
                          What was difficult
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">
                          {reflection.difficult || 'No answer yet.'}
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold text-slate-900">Next step</p>
                        <p className="mt-1 whitespace-pre-wrap">
                          {reflection.next_step || 'No answer yet.'}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="font-semibold text-slate-900">
                          Confidence meaning
                        </p>
                        <p className="mt-1">
                          {confidenceLabel(reflection.confidence_level)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      {lesson && (
                        <Link
                          href={`/lessons/${lesson.slug}`}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
                        >
                          Open lesson
                        </Link>
                      )}

                      {isHighlighted('reflection', reflection.id) ? (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 font-semibold text-amber-900">
                          <Star className="h-4 w-4" />
                          Highlighted
                        </span>
                      ) : (
                        <form action={addPortfolioHighlight}>
                          <input type="hidden" name="item_type" value="reflection" />
                          <input type="hidden" name="item_id" value={reflection.id} />
                          <input
                            type="hidden"
                            name="title"
                            value={lesson?.title || 'Lesson reflection'}
                          />
                          <input
                            type="hidden"
                            name="subtitle"
                            value={`${course?.title || 'Course'} · Reflection`}
                          />
                          <input
                            type="hidden"
                            name="note"
                            value={
                              reflection.learned ||
                              reflection.next_step ||
                              'Selected reflection from my learning portfolio.'
                            }
                          />
                          <input
                            type="hidden"
                            name="link_url"
                            value={lesson ? `/lessons/${lesson.slug}` : '/portfolio'}
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 font-semibold text-amber-900 transition hover:bg-amber-100"
                          >
                            <Star className="h-4 w-4" />
                            Add to highlights
                          </button>
                        </form>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <SectionHeading
            eyebrow="Teacher feedback"
            title="Feedback requests and replies"
            description="A record of questions you asked and feedback your teacher returned."
            icon={<MessageSquareText className="h-5 w-5" />}
          />

          {feedbackHighlights.length === 0 ? (
            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-slate-700">
                No feedback requests yet. When you ask for help in a lesson,
                the conversation will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {feedbackHighlights.map((feedback) => {
                const lesson = lessonMap.get(feedback.lesson_id)
                const course = lesson ? courseMap.get(lesson.course_id) : null

                return (
                  <article
                    key={feedback.id}
                    className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">
                          {lesson?.title || 'Feedback request'}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {course?.title || 'Course'} ·{' '}
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

                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">
                        My message
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                        {feedback.student_message}
                      </p>
                    </div>

                    {feedback.teacher_feedback ? (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-900">
                          Teacher reply
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                          {feedback.teacher_feedback}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Reviewed: {formatDate(feedback.reviewed_at)}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                        Waiting for teacher reply.
                      </div>
                    )}

                    {lesson && (
                      <div className="mt-5">
                        <Link
                          href={`/lessons/${lesson.slug}`}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
                        >
                          Open lesson
                        </Link>
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
            eyebrow="Assessment"
            title="Quiz performance"
            description="A quick overview of your quiz attempts and passing evidence."
            icon={<Target className="h-5 w-5" />}
          />

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <StatCard
              label="Quiz attempts"
              value={quizAttempts.length}
              icon={<Target className="h-5 w-5" />}
            />
            <StatCard
              label="Passed attempts"
              value={passedAttempts}
              icon={<CheckCircle2 className="h-5 w-5" />}
              tone="emerald"
            />
            <StatCard
              label="Average score"
              value={quizAttempts.length > 0 ? `${bestAverage}%` : '—'}
              icon={<Sparkles className="h-5 w-5" />}
              tone="amber"
            />
          </div>

          {quizAttempts.length === 0 ? (
            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-slate-700">
                No quiz attempts yet. Completed quiz attempts will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-3">
                {quizAttempts.slice(0, 10).map((attempt) => {
                  const quiz = quizzes.find((item) => item.id === attempt.quiz_id)
                  const lesson = quiz ? lessonMap.get(quiz.lesson_id) : null

                  return (
                    <div
                      key={attempt.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {quiz?.title || 'Quiz attempt'}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {lesson?.title || 'Lesson'} · {formatDate(attempt.created_at)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            attempt.passed
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {attempt.passed ? 'Passed' : 'Attempted'}
                        </span>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {attempt.score_percentage}%
                        </span>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {attempt.correct_count}/{attempt.total_questions}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
