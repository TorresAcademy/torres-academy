import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  Award,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  FolderOpen,
  Link2,
  MessageSquareMore,
  PencilLine,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

type Course = {
  id: number
  title: string
  slug: string
  teacher_id: string
}

type Lesson = {
  id: number
  title: string
  slug: string
  course_id: number
}

type SubmissionTask = {
  id: number
  lesson_id: number
  title: string
  instructions: string | null
  is_required_for_completion: boolean
  is_required_for_certificate: boolean
}

type StudentProfile = {
  id: string
  full_name: string | null
  email: string | null
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
  reviewed_by: string | null
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

type SubmissionCard = {
  submission: StudentSubmission
  student: StudentProfile | null
  task: SubmissionTask | null
  lesson: Lesson | null
  course: Course | null
  signedFileUrl: string | null
  rubricScores: RubricScore[]
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function statusLabel(status: SubmissionStatus) {
  return status.replaceAll('_', ' ')
}

function statusClasses(status: SubmissionStatus) {
  if (status === 'accepted') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (status === 'reviewed') {
    return 'bg-amber-100 text-amber-900'
  }

  if (status === 'needs_revision') {
    return 'bg-yellow-100 text-yellow-900'
  }

  if (status === 'rejected') {
    return 'bg-red-100 text-red-700'
  }

  return 'bg-slate-100 text-slate-700'
}

const RUBRIC_CRITERIA = [
  {
    key: 'understanding',
    label: 'Understanding',
    description: 'Shows accurate understanding of the lesson concept.',
  },
  {
    key: 'reasoning',
    label: 'Reasoning',
    description: 'Explains thinking, steps, choices, or problem-solving process.',
  },
  {
    key: 'evidence',
    label: 'Evidence',
    description: 'Uses examples, working, sources, images, or proof to support the work.',
  },
  {
    key: 'presentation',
    label: 'Presentation',
    description: 'Organizes the work clearly and communicates ideas effectively.',
  },
  {
    key: 'reflection',
    label: 'Reflection',
    description: 'Shows learning awareness, improvements, or next steps.',
  },
] as const

const RUBRIC_LEVELS = [
  'Beginning',
  'Developing',
  'Secure',
  'Excellent',
] as const

function getRubricScore(
  scores: RubricScore[],
  key: string
): RubricScore | undefined {
  return scores.find((score) => score.criterion_key === key)
}

function rubricLevelClasses(level: string | null | undefined) {
  if (level === 'Excellent') return 'bg-emerald-100 text-emerald-700'
  if (level === 'Secure') return 'bg-blue-100 text-blue-700'
  if (level === 'Developing') return 'bg-amber-100 text-amber-900'
  if (level === 'Beginning') return 'bg-slate-100 text-slate-700'
  return 'bg-slate-100 text-slate-500'
}

async function createSubmissionReviewNotification(params: {
  studentId: string
  lessonSlug: string
  lessonTitle: string
  status: SubmissionStatus
  teacherFeedback: string | null
}) {
  if (params.status === 'submitted') return

  const serviceSupabase = createServiceRoleClient()

  const titleMap: Record<Exclude<SubmissionStatus, 'submitted'>, string> = {
    reviewed: 'Your submission was reviewed',
    needs_revision: 'Your submission needs revision',
    accepted: 'Your submission was accepted',
    rejected: 'Your submission was rejected',
  }

  const defaultMessageMap: Record<Exclude<SubmissionStatus, 'submitted'>, string> =
    {
      reviewed: `Your teacher reviewed your work for ${params.lessonTitle}.`,
      needs_revision: `Your teacher asked you to revise your work for ${params.lessonTitle}.`,
      accepted: `Great work. Your submission for ${params.lessonTitle} was accepted.`,
      rejected: `Your submission for ${params.lessonTitle} was rejected. Please read the feedback carefully.`,
    }

  const feedbackText = params.teacherFeedback?.trim()

  await serviceSupabase.from('notifications').insert({
    user_id: params.studentId,
    type: `submission_${params.status}`,
    title: titleMap[params.status],
    message: feedbackText || defaultMessageMap[params.status],
    link_url: `/lessons/${params.lessonSlug}`,
  })
}

function StatCard({
  label,
  value,
  tone = 'slate',
}: {
  label: string
  value: number
  tone?: 'slate' | 'amber' | 'yellow' | 'emerald' | 'red'
}) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    yellow: 'border-yellow-200 bg-yellow-50 text-yellow-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    red: 'border-red-200 bg-red-50 text-red-700',
  } as const

  const labelTones = {
    slate: 'text-slate-500',
    amber: 'text-amber-700',
    yellow: 'text-yellow-700',
    emerald: 'text-emerald-700',
    red: 'text-red-700',
  } as const

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className={`text-sm ${labelTones[tone]}`}>{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  )
}

export default async function TeacherSubmissionsPage() {
  const { supabase, user, profile } = await requireTeacherOrAdmin()
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

  async function updateSubmissionReview(formData: FormData) {
    'use server'

    const { supabase, user, profile } = await requireTeacherOrAdmin()
    const isAdmin = profile.role === 'admin'

    const submissionId = Number(formData.get('submission_id'))
    const status = String(formData.get('status') || '') as SubmissionStatus
    const teacherScoreRaw = String(formData.get('teacher_score') || '').trim()
    const teacherFeedback = String(formData.get('teacher_feedback') || '').trim()

    const rubricRows = RUBRIC_CRITERIA.map((criterion) => {
      const level = String(
        formData.get(`rubric_level_${criterion.key}`) || ''
      ).trim()
      const scoreRaw = String(
        formData.get(`rubric_score_${criterion.key}`) || ''
      ).trim()
      const feedback = String(
        formData.get(`rubric_feedback_${criterion.key}`) || ''
      ).trim()

      const score = scoreRaw === '' ? null : Number(scoreRaw)

      return {
        criterion_key: criterion.key,
        criterion_label: criterion.label,
        level: level || null,
        score,
        feedback: feedback || null,
      }
    })

    if (!submissionId || Number.isNaN(submissionId)) {
      redirect('/teacher/submissions')
    }

    if (
      status !== 'submitted' &&
      status !== 'reviewed' &&
      status !== 'needs_revision' &&
      status !== 'accepted' &&
      status !== 'rejected'
    ) {
      redirect('/teacher/submissions')
    }

    const teacherScore =
      teacherScoreRaw === '' ? null : Number(teacherScoreRaw)

    if (teacherScore !== null && Number.isNaN(teacherScore)) {
      redirect('/teacher/submissions')
    }

    const hasInvalidRubricScore = rubricRows.some(
      (row) => row.score !== null && Number.isNaN(row.score)
    )

    if (hasInvalidRubricScore) {
      redirect('/teacher/submissions')
    }

    const { data: existingSubmission } = await supabase
      .from('student_submissions')
      .select(
        'id, student_id, lesson_id, course_id, status, teacher_feedback, teacher_score'
      )
      .eq('id', submissionId)
      .maybeSingle()

    if (!existingSubmission) {
      redirect('/teacher/submissions')
    }

    const { data: course } = await supabase
      .from('courses')
      .select('id, title, slug, teacher_id')
      .eq('id', existingSubmission.course_id)
      .maybeSingle()

    if (!course) {
      redirect('/teacher/submissions')
    }

    if (!isAdmin && course.teacher_id !== user.id) {
      redirect('/teacher/submissions')
    }

    const { data: lesson } = await supabase
      .from('lessons')
      .select('id, title, slug')
      .eq('id', existingSubmission.lesson_id)
      .maybeSingle()

    if (!lesson) {
      redirect('/teacher/submissions')
    }

    const reviewTimestamp =
      status === 'submitted' ? null : new Date().toISOString()

    await supabase
      .from('student_submissions')
      .update({
        status,
        teacher_score: teacherScore,
        teacher_feedback: teacherFeedback || null,
        reviewed_by: status === 'submitted' ? null : user.id,
        reviewed_at: reviewTimestamp,
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    await supabase
      .from('student_submission_rubric_scores')
      .delete()
      .eq('submission_id', submissionId)

    const rubricRowsToInsert = rubricRows.filter(
      (row) => row.level || row.score !== null || row.feedback
    )

    if (rubricRowsToInsert.length > 0) {
      await supabase.from('student_submission_rubric_scores').insert(
        rubricRowsToInsert.map((row) => ({
          submission_id: submissionId,
          ...row,
          updated_at: new Date().toISOString(),
        }))
      )
    }

    const hasMeaningfulChange =
      existingSubmission.status !== status ||
      (existingSubmission.teacher_feedback ?? '') !== (teacherFeedback || '') ||
      (existingSubmission.teacher_score ?? null) !== (teacherScore ?? null)

    if (hasMeaningfulChange && status !== 'submitted') {
      await createSubmissionReviewNotification({
        studentId: existingSubmission.student_id,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
        status,
        teacherFeedback: teacherFeedback || null,
      })
    }

    revalidatePath('/teacher/submissions')
    revalidatePath(`/teacher/lessons/${lesson.id}/submissions`)
    revalidatePath(`/lessons/${lesson.slug}`)
    revalidatePath(`/courses/${course.slug}`)
    revalidatePath('/dashboard')
  }

  if (courseIds.length === 0) {
    return (
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                Submission Inbox
              </p>

              <h2 className="mt-2 text-3xl font-bold md:text-4xl">
                Student evidence submissions
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                Review student uploads and secure links from lesson submission
                tasks in one premium review space.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-black">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Premium submission inbox
                  </p>
                  <p className="text-sm text-slate-300">
                    Review student evidence with speed and clarity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-700">
            No teacher courses found yet, so there are no submissions to review.
          </p>
        </div>
      </div>
    )
  }

  const { data: submissionsData } = await supabase
    .from('student_submissions')
    .select(
      'id, task_id, lesson_id, course_id, student_id, submission_type, file_path, file_name, file_mime_type, external_url, student_comment, status, teacher_score, teacher_feedback, reviewed_by, reviewed_at, created_at, updated_at'
    )
    .in('course_id', courseIds)
    .order('created_at', { ascending: false })

  const submissions = (submissionsData ?? []) as StudentSubmission[]

  const taskIds = [...new Set(submissions.map((item) => item.task_id))]
  const lessonIds = [...new Set(submissions.map((item) => item.lesson_id))]
  const studentIds = [...new Set(submissions.map((item) => item.student_id))]

  let tasks: SubmissionTask[] = []
  let lessons: Lesson[] = []
  let students: StudentProfile[] = []

  if (taskIds.length > 0) {
    const { data } = await supabase
      .from('lesson_submission_tasks')
      .select(
        'id, lesson_id, title, instructions, is_required_for_completion, is_required_for_certificate'
      )
      .in('id', taskIds)

    tasks = (data ?? []) as SubmissionTask[]
  }

  if (lessonIds.length > 0) {
    const { data } = await supabase
      .from('lessons')
      .select('id, title, slug, course_id')
      .in('id', lessonIds)

    lessons = (data ?? []) as Lesson[]
  }

  if (studentIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds)

    students = (data ?? []) as StudentProfile[]
  }

  const taskMap = new Map(tasks.map((task) => [task.id, task]))
  const lessonMap = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const courseMap = new Map(courses.map((course) => [course.id, course]))
  const studentMap = new Map(students.map((student) => [student.id, student]))

  const serviceSupabase = createServiceRoleClient()

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

  const cards: SubmissionCard[] = submissions.map((submission) => ({
    submission,
    student: studentMap.get(submission.student_id) ?? null,
    task: taskMap.get(submission.task_id) ?? null,
    lesson: lessonMap.get(submission.lesson_id) ?? null,
    course: courseMap.get(submission.course_id) ?? null,
    signedFileUrl: signedFileMap.get(submission.id) ?? null,
    rubricScores: rubricMap.get(submission.id) ?? [],
  }))

  const pendingCount = cards.filter(
    (item) => item.submission.status === 'submitted'
  ).length
  const reviewedCount = cards.filter(
    (item) => item.submission.status === 'reviewed'
  ).length
  const needsRevisionCount = cards.filter(
    (item) => item.submission.status === 'needs_revision'
  ).length
  const acceptedCount = cards.filter(
    (item) => item.submission.status === 'accepted'
  ).length
  const rejectedCount = cards.filter(
    (item) => item.submission.status === 'rejected'
  ).length

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              Submission Inbox
            </p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Student evidence submissions
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Review student uploads and secure links from lesson submission
              tasks in one premium review space.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-black">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  Premium submission inbox
                </p>
                <p className="text-sm text-slate-300">
                  Review student evidence with speed and clarity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <StatCard label="Pending" value={pendingCount} tone="amber" />
        <StatCard label="Reviewed" value={reviewedCount} tone="slate" />
        <StatCard
          label="Needs revision"
          value={needsRevisionCount}
          tone="yellow"
        />
        <StatCard label="Accepted" value={acceptedCount} tone="emerald" />
        <StatCard label="Rejected" value={rejectedCount} tone="red" />
      </section>

      {cards.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-700">
            No student submissions yet. Once students upload files or send secure
            links, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {cards.map((card) => {
            const submission = card.submission
            const studentName =
              card.student?.full_name || card.student?.email || 'Student'
            const studentEmail = card.student?.email || 'No email'
            const lessonTitle = card.lesson?.title || 'Unknown lesson'
            const lessonSlug = card.lesson?.slug || ''
            const courseTitle = card.course?.title || 'Unknown course'
            const taskTitle = card.task?.title || 'Submission task'

            return (
              <article
                key={submission.id}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
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
                          ? 'File submission'
                          : 'Link submission'}
                      </span>

                      {card.task?.is_required_for_completion && (
                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-900">
                          Required for completion
                        </span>
                      )}

                      {card.task?.is_required_for_certificate && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                          Required for certificate
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
                      Student: {studentName} · {studentEmail}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Submitted: {formatDate(submission.created_at)}
                    </p>

                    {submission.reviewed_at && (
                      <p className="mt-1 text-sm text-slate-500">
                        Last reviewed: {formatDate(submission.reviewed_at)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {submission.submission_type === 'file' && card.signedFileUrl && (
                      <a
                        href={card.signedFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-amber-300 transition hover:bg-black"
                      >
                        <FolderOpen className="h-4 w-4" />
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

                    {lessonSlug && (
                      <Link
                        href={`/lessons/${lessonSlug}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
                      >
                        <FileText className="h-4 w-4" />
                        View lesson
                      </Link>
                    )}

                    {card.lesson && (
                      <Link
                        href={`/teacher/lessons/${card.lesson.id}/submissions`}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Task page
                      </Link>
                    )}
                  </div>
                </div>

                {card.task?.instructions && (
                  <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Task instructions
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {card.task.instructions}
                    </p>
                  </div>
                )}

                {submission.student_comment && (
                  <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <MessageSquareMore className="h-4 w-4 text-amber-700" />
                      <p className="text-sm font-semibold text-slate-900">
                        Student comment
                      </p>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {submission.student_comment}
                    </p>
                  </div>
                )}

                {submission.submission_type === 'file' && (
                  <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      File details
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      Name: {submission.file_name || 'Unnamed file'}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      Type: {submission.file_mime_type || 'Unknown type'}
                    </p>
                  </div>
                )}

                {card.rubricScores.length > 0 && (
                  <div className="mt-5 rounded-3xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-blue-700" />
                      <p className="text-sm font-semibold text-blue-900">
                        Current rubric feedback
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

                <form action={updateSubmissionReview} className="mt-6 space-y-4">
                  <input
                    type="hidden"
                    name="submission_id"
                    value={submission.id}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Review status
                      </label>
                      <select
                        name="status"
                        defaultValue={submission.status}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                      >
                        <option value="submitted">submitted</option>
                        <option value="reviewed">reviewed</option>
                        <option value="needs_revision">needs revision</option>
                        <option value="accepted">accepted</option>
                        <option value="rejected">rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Teacher score
                      </label>
                      <input
                        name="teacher_score"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        defaultValue={
                          submission.teacher_score === null
                            ? ''
                            : String(submission.teacher_score)
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                        placeholder="Optional score"
                      />
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
                        <ClipboardCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          Rubric feedback
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          Use IB/Cambridge-style criteria to show how the
                          student is improving.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      {RUBRIC_CRITERIA.map((criterion) => {
                        const existingScore = getRubricScore(
                          card.rubricScores,
                          criterion.key
                        )

                        return (
                          <div
                            key={criterion.key}
                            className="rounded-2xl border border-slate-200 bg-white p-4"
                          >
                            <div className="mb-3">
                              <p className="font-semibold text-slate-900">
                                {criterion.label}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {criterion.description}
                              </p>
                            </div>

                            <div className="grid gap-3 md:grid-cols-[1fr_140px]">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">
                                  Level
                                </label>
                                <select
                                  name={`rubric_level_${criterion.key}`}
                                  defaultValue={existingScore?.level ?? ''}
                                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                                >
                                  <option value="">No level</option>
                                  {RUBRIC_LEVELS.map((level) => (
                                    <option key={level} value={level}>
                                      {level}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">
                                  Score
                                </label>
                                <input
                                  name={`rubric_score_${criterion.key}`}
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  defaultValue={
                                    existingScore?.score === null ||
                                    existingScore?.score === undefined
                                      ? ''
                                      : String(existingScore.score)
                                  }
                                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                                  placeholder="Optional"
                                />
                              </div>
                            </div>

                            <div className="mt-3">
                              <label className="mb-1 block text-xs font-medium text-slate-600">
                                Criterion feedback
                              </label>
                              <textarea
                                name={`rubric_feedback_${criterion.key}`}
                                rows={2}
                                defaultValue={existingScore?.feedback ?? ''}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                                placeholder={`Feedback for ${criterion.label.toLowerCase()}...`}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Teacher feedback
                    </label>
                    <textarea
                      name="teacher_feedback"
                      rows={5}
                      defaultValue={submission.teacher_feedback ?? ''}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                      placeholder="Write clear overall feedback for the student..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-amber-300 transition hover:bg-black"
                  >
                    <PencilLine className="h-4 w-4" />
                    Save review
                  </button>
                </form>

                {submission.status === 'accepted' && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Accepted work
                  </div>
                )}

                {submission.status === 'rejected' && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                    <XCircle className="h-4 w-4" />
                    Rejected work
                  </div>
                )}

                {submission.submission_type === 'link' &&
                  submission.external_url && (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                      <Link2 className="h-4 w-4" />
                      External link provided
                    </div>
                  )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}