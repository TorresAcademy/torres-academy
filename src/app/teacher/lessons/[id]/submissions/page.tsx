import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Link2,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

type PageProps = {
  params: Promise<{ id: string }>
}

type Task = {
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
  created_at: string | null
}

type Submission = {
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

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

function prettyStatus(status?: string | null) {
  if (!status) return 'submitted'
  return status.replaceAll('_', ' ')
}

function statusClasses(status?: string | null) {
  const value = (status ?? '').toLowerCase()

  if (value === 'accepted') {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  }

  if (value === 'reviewed') {
    return 'bg-blue-100 text-blue-700 border-blue-200'
  }

  if (value === 'needs_revision') {
    return 'bg-amber-100 text-amber-800 border-amber-200'
  }

  if (value === 'rejected') {
    return 'bg-red-100 text-red-700 border-red-200'
  }

  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function formatDate(value?: string | null) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function SectionCard({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description?: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
          {description && (
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {description}
            </p>
          )}
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
          {icon}
        </div>
      </div>

      <div className="mt-6">{children}</div>
    </section>
  )
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string
  value: number | string
  note?: string
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  )
}

export default async function TeacherLessonSubmissionsPage({
  params,
}: PageProps) {
  const { id } = await params
  const lessonId = Number(id)

  if (!lessonId || Number.isNaN(lessonId)) {
    notFound()
  }

  const { supabase, user, profile } = await requireTeacherOrAdmin()
  const isAdmin = profile.role === 'admin'

  const { data: lessonData } = await supabase
    .from('lessons')
    .select('id, title, slug, course_id')
    .eq('id', lessonId)
    .maybeSingle()

  if (!lessonData) {
    notFound()
  }

  const lesson = lessonData

  const { data: courseData } = await supabase
    .from('courses')
    .select('id, title, teacher_id')
    .eq('id', lesson.course_id)
    .maybeSingle()

  if (!courseData) {
    notFound()
  }

  const course = courseData

  if (!isAdmin && course.teacher_id !== user.id) {
    notFound()
  }

  const { data: tasksData } = await supabase
    .from('lesson_submission_tasks')
    .select(
      'id, lesson_id, title, instructions, accept_file, accept_link, accepted_file_types, accepted_link_types, is_required_for_completion, is_required_for_certificate, is_published, created_at'
    )
    .eq('lesson_id', lesson.id)
    .order('created_at', { ascending: false })

  const tasks = (tasksData ?? []) as Task[]
  const taskMap = new Map(tasks.map((task) => [task.id, task]))

  const serviceSupabase = createServiceRoleClient()

  const { data: submissionsData } = await serviceSupabase
    .from('student_submissions')
    .select(
      'id, task_id, lesson_id, course_id, student_id, submission_type, file_path, file_name, file_mime_type, external_url, student_comment, status, teacher_score, teacher_feedback, reviewed_by, reviewed_at, created_at, updated_at'
    )
    .eq('lesson_id', lesson.id)
    .order('updated_at', { ascending: false })

  const submissions = (submissionsData ?? []) as Submission[]

  const studentIds = Array.from(
    new Set(submissions.map((item) => item.student_id).filter(Boolean))
  )

  const reviewerIds = Array.from(
    new Set(submissions.map((item) => item.reviewed_by).filter(Boolean))
  ) as string[]

  let studentProfiles: ProfileRow[] = []
  let reviewerProfiles: ProfileRow[] = []

  if (studentIds.length > 0) {
    const { data } = await serviceSupabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', studentIds)

    studentProfiles = (data ?? []) as ProfileRow[]
  }

  if (reviewerIds.length > 0) {
    const { data } = await serviceSupabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', reviewerIds)

    reviewerProfiles = (data ?? []) as ProfileRow[]
  }

  const studentProfileMap = new Map(
    studentProfiles.map((item) => [item.id, item])
  )
  const reviewerProfileMap = new Map(
    reviewerProfiles.map((item) => [item.id, item])
  )

  const submissionsWithFiles = await Promise.all(
    submissions.map(async (submission) => {
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
        student: studentProfileMap.get(submission.student_id) ?? null,
        reviewer: submission.reviewed_by
          ? reviewerProfileMap.get(submission.reviewed_by) ?? null
          : null,
        task: taskMap.get(submission.task_id) ?? null,
      }
    })
  )

  const submittedCount = submissionsWithFiles.filter(
    (item) => item.status === 'submitted'
  ).length
  const reviewedCount = submissionsWithFiles.filter(
    (item) => item.status === 'reviewed'
  ).length
  const needsRevisionCount = submissionsWithFiles.filter(
    (item) => item.status === 'needs_revision'
  ).length
  const acceptedCount = submissionsWithFiles.filter(
    (item) => item.status === 'accepted'
  ).length
  const rejectedCount = submissionsWithFiles.filter(
    (item) => item.status === 'rejected'
  ).length

  async function createTask(formData: FormData) {
    'use server'

    const { supabase, user, profile } = await requireTeacherOrAdmin()
    const isAdmin = profile.role === 'admin'

    const title = String(formData.get('title') || '').trim()
    const instructions = String(formData.get('instructions') || '').trim()
    const acceptFile = formData.get('accept_file') === 'on'
    const acceptLink = formData.get('accept_link') === 'on'
    const acceptedFileTypes = [
      formData.get('accept_pdf') === 'on' ? 'pdf' : null,
      formData.get('accept_png') === 'on' ? 'png' : null,
      formData.get('accept_jpg') === 'on' ? 'jpg' : null,
      formData.get('accept_jpeg') === 'on' ? 'jpeg' : null,
    ].filter(Boolean) as string[]
    const isRequiredForCompletion =
      formData.get('is_required_for_completion') === 'on'
    const isRequiredForCertificate =
      formData.get('is_required_for_certificate') === 'on'
    const isPublished = formData.get('is_published') === 'on'

    if (!title) {
      redirect(`/teacher/lessons/${lessonId}/submissions`)
    }

    if (!acceptFile && !acceptLink) {
      redirect(`/teacher/lessons/${lessonId}/submissions`)
    }

    const { data: lessonCheck } = await supabase
      .from('lessons')
      .select('id, slug, course_id')
      .eq('id', lessonId)
      .maybeSingle()

    if (!lessonCheck) {
      redirect('/teacher/lessons')
    }

    const { data: courseCheck } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', lessonCheck.course_id)
      .maybeSingle()

    if (!courseCheck) {
      redirect('/teacher/lessons')
    }

    if (!isAdmin && courseCheck.teacher_id !== user.id) {
      redirect('/teacher/lessons')
    }

    await supabase.from('lesson_submission_tasks').insert({
      lesson_id: lessonId,
      title,
      instructions: instructions || null,
      accept_file: acceptFile,
      accept_link: acceptLink,
      accepted_file_types:
        acceptedFileTypes.length > 0
          ? acceptedFileTypes
          : ['pdf', 'png', 'jpg', 'jpeg'],
      accepted_link_types: [
        'youtube',
        'vimeo',
        'loom',
        'screencast',
        'canva',
        'prezi',
        'powerpoint',
        'google_slides',
        'other',
      ],
      is_required_for_completion: isRequiredForCompletion,
      is_required_for_certificate: isRequiredForCertificate,
      is_published: isPublished,
      updated_at: new Date().toISOString(),
    })

    revalidatePath(`/teacher/lessons/${lessonId}/submissions`)
    revalidatePath(`/lessons/${lessonCheck.slug}`)
  }

  async function togglePublished(formData: FormData) {
    'use server'

    const { supabase, user, profile } = await requireTeacherOrAdmin()
    const isAdmin = profile.role === 'admin'

    const taskId = Number(formData.get('task_id'))
    const nextPublished = formData.get('next_published') === 'true'

    if (!taskId || Number.isNaN(taskId)) {
      return
    }

    const { data: task } = await supabase
      .from('lesson_submission_tasks')
      .select('id, lesson_id')
      .eq('id', taskId)
      .maybeSingle()

    if (!task) return

    const { data: lessonCheck } = await supabase
      .from('lessons')
      .select('id, slug, course_id')
      .eq('id', task.lesson_id)
      .maybeSingle()

    if (!lessonCheck) return

    const { data: courseCheck } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', lessonCheck.course_id)
      .maybeSingle()

    if (!courseCheck) return

    if (!isAdmin && courseCheck.teacher_id !== user.id) {
      return
    }

    await supabase
      .from('lesson_submission_tasks')
      .update({
        is_published: nextPublished,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    revalidatePath(`/teacher/lessons/${lessonCheck.id}/submissions`)
    revalidatePath(`/lessons/${lessonCheck.slug}`)
  }

  async function deleteTask(formData: FormData) {
    'use server'

    const { supabase, user, profile } = await requireTeacherOrAdmin()
    const isAdmin = profile.role === 'admin'

    const taskId = Number(formData.get('task_id'))

    if (!taskId || Number.isNaN(taskId)) return

    const { data: task } = await supabase
      .from('lesson_submission_tasks')
      .select('id, lesson_id')
      .eq('id', taskId)
      .maybeSingle()

    if (!task) return

    const { data: lessonCheck } = await supabase
      .from('lessons')
      .select('id, slug, course_id')
      .eq('id', task.lesson_id)
      .maybeSingle()

    if (!lessonCheck) return

    const { data: courseCheck } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', lessonCheck.course_id)
      .maybeSingle()

    if (!courseCheck) return

    if (!isAdmin && courseCheck.teacher_id !== user.id) {
      return
    }

    await supabase.from('lesson_submission_tasks').delete().eq('id', taskId)

    revalidatePath(`/teacher/lessons/${lessonCheck.id}/submissions`)
    revalidatePath(`/lessons/${lessonCheck.slug}`)
  }

  async function updateSubmissionReview(formData: FormData) {
    'use server'

    const { supabase, user, profile } = await requireTeacherOrAdmin()
    const isAdmin = profile.role === 'admin'
    const submissionId = Number(formData.get('submission_id'))
    const status = String(formData.get('status') || '').trim()
    const teacherFeedback = String(formData.get('teacher_feedback') || '').trim()
    const teacherScoreRaw = String(formData.get('teacher_score') || '').trim()

    if (!submissionId || Number.isNaN(submissionId)) {
      return
    }

    const allowedStatuses = [
      'submitted',
      'reviewed',
      'needs_revision',
      'accepted',
      'rejected',
    ]

    if (!allowedStatuses.includes(status)) {
      return
    }

    const serviceSupabase = createServiceRoleClient()

    const { data: submission } = await serviceSupabase
      .from('student_submissions')
      .select('id, lesson_id')
      .eq('id', submissionId)
      .maybeSingle()

    if (!submission) {
      return
    }

    const { data: lessonCheck } = await supabase
      .from('lessons')
      .select('id, slug, course_id')
      .eq('id', submission.lesson_id)
      .maybeSingle()

    if (!lessonCheck) {
      return
    }

    const { data: courseCheck } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', lessonCheck.course_id)
      .maybeSingle()

    if (!courseCheck) {
      return
    }

    if (!isAdmin && courseCheck.teacher_id !== user.id) {
      return
    }

    let teacherScore: number | null = null

    if (teacherScoreRaw) {
      const numericScore = Number(teacherScoreRaw)
      teacherScore = Number.isNaN(numericScore) ? null : numericScore
    }

    await serviceSupabase
      .from('student_submissions')
      .update({
        status,
        teacher_score: teacherScore,
        teacher_feedback: teacherFeedback || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    revalidatePath(`/teacher/lessons/${lessonCheck.id}/submissions`)
    revalidatePath(`/lessons/${lessonCheck.slug}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/teacher/lessons"
          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
        >
          ← Back to lessons
        </Link>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              Lesson submissions
            </p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              {lesson.title}
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Create evidence submission tasks and review student work for this
              lesson in the premium teacher workspace.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-black">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  Premium submission manager
                </p>
                <p className="text-sm text-slate-300">
                  Create tasks and review student evidence with clarity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <StatCard label="Total submissions" value={submissionsWithFiles.length} />
        <StatCard label="Submitted" value={submittedCount} />
        <StatCard label="Reviewed" value={reviewedCount} />
        <StatCard label="Needs revision" value={needsRevisionCount} />
        <StatCard
          label="Accepted"
          value={acceptedCount}
          note={rejectedCount > 0 ? `Rejected: ${rejectedCount}` : undefined}
        />
      </section>

      <SectionCard
        title="Create task"
        description="Allow students to submit files, links, or both, and mark tasks required for completion or certificate flow."
        icon={<PlusCircle className="h-5 w-5" />}
      >
        <form action={createTask}>
          <div className="grid gap-6">
            <div>
              <label className="text-sm font-medium text-slate-700">Title</label>
              <input
                name="title"
                type="text"
                required
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
                placeholder="Example: Upload your worksheet"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Instructions
              </label>
              <textarea
                name="instructions"
                rows={5}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
                placeholder="Tell students exactly what to submit..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  name="accept_file"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-medium text-slate-900">Accept files</p>
                  <p className="text-sm text-slate-500">PDF, PNG, JPG, JPEG</p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  name="accept_link"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-medium text-slate-900">Accept links</p>
                  <p className="text-sm text-slate-500">
                    YouTube, Vimeo, Loom, Canva, Slides, Prezi
                  </p>
                </div>
              </label>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700">
                Accepted file types
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    name="accept_pdf"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4"
                  />
                  <span className="font-medium text-slate-900">PDF</span>
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    name="accept_png"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4"
                  />
                  <span className="font-medium text-slate-900">PNG</span>
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    name="accept_jpg"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4"
                  />
                  <span className="font-medium text-slate-900">JPG</span>
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    name="accept_jpeg"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4"
                  />
                  <span className="font-medium text-slate-900">JPEG</span>
                </label>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  name="is_required_for_completion"
                  type="checkbox"
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-medium text-slate-900">
                    Required for completion
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  name="is_required_for_certificate"
                  type="checkbox"
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-medium text-slate-900">
                    Required for certificate
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  name="is_published"
                  type="checkbox"
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-medium text-slate-900">Published</p>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-amber-300 transition hover:bg-black"
          >
            Create task
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="Existing tasks"
        description="Publish, unpublish, or remove lesson submission tasks."
        icon={<ClipboardCheck className="h-5 w-5" />}
      >
        {tasks.length === 0 ? (
          <p className="text-slate-600">No submission tasks yet for this lesson.</p>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <article
                key={task.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">
                      {task.title}
                    </h4>

                    {task.instructions && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {task.instructions}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {task.is_required_for_completion ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          Required for completion
                        </span>
                      ) : null}

                      {task.is_required_for_certificate ? (
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                          Required for certificate
                        </span>
                      ) : null}

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          task.is_published
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {task.is_published ? 'Published' : 'Draft'}
                      </span>

                      {task.accept_file ? (
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
                          Files: {task.accepted_file_types.join(', ').toUpperCase()}
                        </span>
                      ) : null}

                      {task.accept_link ? (
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
                          Links: {(task.accepted_link_types ?? []).join(', ')}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <form action={togglePublished}>
                      <input type="hidden" name="task_id" value={task.id} />
                      <input
                        type="hidden"
                        name="next_published"
                        value={task.is_published ? 'false' : 'true'}
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-black"
                      >
                        {task.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                    </form>

                    <form action={deleteTask}>
                      <input type="hidden" name="task_id" value={task.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Student submissions"
        description="Review uploaded files, submitted links, comments, scores, and feedback for this lesson."
        icon={<ShieldCheck className="h-5 w-5" />}
      >
        {submissionsWithFiles.length === 0 ? (
          <p className="text-slate-600">
            No student submissions yet for this lesson.
          </p>
        ) : (
          <div className="space-y-5">
            {submissionsWithFiles.map((submission) => (
              <article
                key={submission.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-bold text-slate-900">
                        {submission.student?.full_name ||
                          submission.student?.email ||
                          submission.student_id}
                      </h4>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                          submission.status
                        )}`}
                      >
                        {prettyStatus(submission.status)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                        Task: {submission.task?.title || `Task #${submission.task_id}`}
                      </span>

                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                        Type: {submission.submission_type}
                      </span>

                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                        Submitted: {formatDate(submission.created_at)}
                      </span>

                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                        Updated: {formatDate(submission.updated_at)}
                      </span>
                    </div>

                    {submission.student?.email ? (
                      <p className="mt-3 text-sm text-slate-600">
                        Student email: {submission.student.email}
                      </p>
                    ) : null}

                    {submission.file_url && submission.file_name ? (
                      <p className="mt-4 text-sm text-slate-700">
                        File:{' '}
                        <a
                          href={submission.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-amber-700 hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          {submission.file_name}
                        </a>
                      </p>
                    ) : null}

                    {submission.external_url ? (
                      <p className="mt-4 text-sm text-slate-700">
                        Link:{' '}
                        <a
                          href={submission.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-amber-700 hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open submitted link
                        </a>
                      </p>
                    ) : null}

                    {submission.student_comment ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-semibold text-slate-900">
                          Student comment
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {submission.student_comment}
                        </p>
                      </div>
                    ) : null}

                    {(submission.teacher_feedback ||
                      submission.teacher_score !== null ||
                      submission.reviewed_at) && (
                      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">
                          Current teacher review
                        </p>

                        {submission.teacher_score !== null ? (
                          <p className="mt-2 text-sm text-slate-700">
                            Score: {submission.teacher_score}
                          </p>
                        ) : null}

                        {submission.teacher_feedback ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {submission.teacher_feedback}
                          </p>
                        ) : null}

                        {submission.reviewed_at ? (
                          <p className="mt-2 text-xs text-slate-500">
                            Reviewed {formatDate(submission.reviewed_at)}
                            {submission.reviewer?.full_name
                              ? ` by ${submission.reviewer.full_name}`
                              : ''}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h5 className="text-lg font-bold text-slate-900">
                      Review this submission
                    </h5>

                    <form action={updateSubmissionReview} className="mt-4 space-y-4">
                      <input
                        type="hidden"
                        name="submission_id"
                        value={submission.id}
                      />

                      <div>
                        <label className="text-sm font-medium text-slate-700">
                          Status
                        </label>
                        <select
                          name="status"
                          defaultValue={submission.status}
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
                        >
                          <option value="submitted">submitted</option>
                          <option value="reviewed">reviewed</option>
                          <option value="needs_revision">needs revision</option>
                          <option value="accepted">accepted</option>
                          <option value="rejected">rejected</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700">
                          Score
                        </label>
                        <input
                          name="teacher_score"
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={
                            submission.teacher_score !== null
                              ? String(submission.teacher_score)
                              : ''
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
                          placeholder="Optional score"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700">
                          Feedback
                        </label>
                        <textarea
                          name="teacher_feedback"
                          defaultValue={submission.teacher_feedback ?? ''}
                          rows={6}
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
                          placeholder="Write feedback for the student..."
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-amber-300 transition hover:bg-black"
                      >
                        Save review
                      </button>
                    </form>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                      {submission.submission_type === 'file' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                          <FileText className="h-3.5 w-3.5" />
                          File submission
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                          <Link2 className="h-3.5 w-3.5" />
                          Link submission
                        </span>
                      )}

                      {submission.status === 'accepted' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Accepted
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
