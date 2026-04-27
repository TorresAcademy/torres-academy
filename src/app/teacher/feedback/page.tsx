import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  CheckCircle2,
  Lock,
  MessageSquareMore,
  Send,
  Sparkles,
  UserRound,
  XCircle,
} from 'lucide-react'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import UserAvatar from '@/components/user-avatar'

type FeedbackRequest = {
  id: number
  lesson_id: number
  user_id: string
  teacher_id: string | null
  status: string
  student_message: string
  teacher_feedback: string | null
  created_at: string | null
  reviewed_at: string | null
}

type Lesson = {
  id: number
  title: string
  slug: string
  course_id: number
}

type Course = {
  id: number
  title: string
  teacher_id?: string | null
}

type Student = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

async function createStudentFeedbackNotification(params: {
  studentId: string
  lessonSlug: string
  lessonTitle: string
  type: 'feedback_reviewed' | 'feedback_closed'
  teacherFeedback?: string | null
}) {
  const serviceSupabase = createServiceRoleClient()

  const title =
    params.type === 'feedback_reviewed'
      ? `Teacher replied: ${params.lessonTitle}`
      : `Feedback request closed: ${params.lessonTitle}`

  const message =
    params.type === 'feedback_reviewed'
      ? params.teacherFeedback?.trim() ||
        `Your teacher replied to your feedback request for ${params.lessonTitle}.`
      : `Your feedback request for ${params.lessonTitle} was marked closed.`

  await serviceSupabase.from('notifications').insert({
    user_id: params.studentId,
    type: params.type,
    title,
    message,
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
  tone?: 'slate' | 'amber' | 'emerald' | 'zinc'
}) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    zinc: 'border-slate-300 bg-slate-100 text-slate-700',
  } as const

  const labelTones = {
    slate: 'text-slate-500',
    amber: 'text-amber-700',
    emerald: 'text-emerald-700',
    zinc: 'text-slate-500',
  } as const

  return (
    <div className={`rounded-3xl border p-6 shadow-sm ${tones[tone]}`}>
      <p className={`text-sm ${labelTones[tone]}`}>{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  )
}

function getStatusBadgeClass(status: string) {
  if (status === 'reviewed') return 'bg-emerald-100 text-emerald-700'
  if (status === 'closed') return 'bg-slate-200 text-slate-700'
  return 'bg-amber-100 text-amber-900'
}

export default async function TeacherFeedbackPage() {
  const { supabase, user, profile } = await requireTeacherOrAdmin()
  const isAdmin = profile.role === 'admin'

  const { data: coursesData } = isAdmin
    ? await supabase.from('courses').select('id, title, teacher_id')
    : await supabase
        .from('courses')
        .select('id, title, teacher_id')
        .eq('teacher_id', user.id)

  const courses = (coursesData ?? []) as Course[]
  const courseIds = courses.map((course) => course.id)

  let lessons: Lesson[] = []
  let requests: FeedbackRequest[] = []
  let students: Student[] = []

  if (courseIds.length > 0) {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, title, slug, course_id')
      .in('course_id', courseIds)

    lessons = (lessonsData ?? []) as Lesson[]

    const lessonIds = lessons.map((lesson) => lesson.id)

    if (lessonIds.length > 0) {
      const { data: requestsData } = await supabase
        .from('feedback_requests')
        .select(
          'id, lesson_id, user_id, teacher_id, status, student_message, teacher_feedback, created_at, reviewed_at'
        )
        .in('lesson_id', lessonIds)
        .order('created_at', { ascending: false })

      requests = (requestsData ?? []) as FeedbackRequest[]

      const studentIds = [...new Set(requests.map((request) => request.user_id))]

      if (studentIds.length > 0) {
        const { data: studentsData } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', studentIds)

        students = (studentsData ?? []) as Student[]
      }
    }
  }

  const courseMap = new Map(courses.map((course) => [course.id, course.title]))
  const lessonMap = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const studentMap = new Map(students.map((student) => [student.id, student]))

  const pendingCount = requests.filter((request) => request.status === 'pending').length
  const reviewedCount = requests.filter((request) => request.status === 'reviewed').length
  const closedCount = requests.filter((request) => request.status === 'closed').length

  async function replyToRequest(formData: FormData) {
    'use server'

    const { supabase, user, profile } = await requireTeacherOrAdmin()
    const serviceSupabase = createServiceRoleClient()
    const isAdmin = profile.role === 'admin'

    const requestId = Number(formData.get('request_id'))
    const teacherFeedback = String(formData.get('teacher_feedback') || '').trim()

    if (!requestId || !teacherFeedback) {
      redirect('/teacher/feedback')
    }

    const { data: existingRequest } = await serviceSupabase
      .from('feedback_requests')
      .select('id, lesson_id, user_id, status')
      .eq('id', requestId)
      .maybeSingle()

    if (!existingRequest) {
      redirect('/teacher/feedback')
    }

    const { data: lesson } = await serviceSupabase
      .from('lessons')
      .select('id, slug, title, course_id')
      .eq('id', existingRequest.lesson_id)
      .maybeSingle()

    if (!lesson) {
      redirect('/teacher/feedback')
    }

    const { data: course } = await serviceSupabase
      .from('courses')
      .select('id, teacher_id')
      .eq('id', lesson.course_id)
      .maybeSingle()

    if (!course) {
      redirect('/teacher/feedback')
    }

    if (!isAdmin && course.teacher_id !== user.id) {
      redirect('/teacher/feedback')
    }

    await supabase
      .from('feedback_requests')
      .update({
        teacher_id: user.id,
        teacher_feedback: teacherFeedback,
        status: 'reviewed',
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    try {
      await createStudentFeedbackNotification({
        studentId: existingRequest.user_id,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
        type: 'feedback_reviewed',
        teacherFeedback,
      })
    } catch (notificationError) {
      console.error('Student feedback notification error:', notificationError)
    }

    revalidatePath('/teacher/feedback')
    revalidatePath('/dashboard')
    revalidatePath(`/lessons/${lesson.slug}`)
    redirect('/teacher/feedback')
  }

  async function closeRequest(formData: FormData) {
    'use server'

    const { supabase, user, profile } = await requireTeacherOrAdmin()
    const serviceSupabase = createServiceRoleClient()
    const isAdmin = profile.role === 'admin'

    const requestId = Number(formData.get('request_id'))

    if (!requestId) {
      redirect('/teacher/feedback')
    }

    const { data: existingRequest } = await serviceSupabase
      .from('feedback_requests')
      .select('id, lesson_id, user_id')
      .eq('id', requestId)
      .maybeSingle()

    if (!existingRequest) {
      redirect('/teacher/feedback')
    }

    const { data: lesson } = await serviceSupabase
      .from('lessons')
      .select('id, slug, title, course_id')
      .eq('id', existingRequest.lesson_id)
      .maybeSingle()

    if (!lesson) {
      redirect('/teacher/feedback')
    }

    const { data: course } = await serviceSupabase
      .from('courses')
      .select('id, teacher_id')
      .eq('id', lesson.course_id)
      .maybeSingle()

    if (!course) {
      redirect('/teacher/feedback')
    }

    if (!isAdmin && course.teacher_id !== user.id) {
      redirect('/teacher/feedback')
    }

    await supabase
      .from('feedback_requests')
      .update({
        status: 'closed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    try {
      await createStudentFeedbackNotification({
        studentId: existingRequest.user_id,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
        type: 'feedback_closed',
      })
    } catch (notificationError) {
      console.error('Student feedback close notification error:', notificationError)
    }

    revalidatePath('/teacher/feedback')
    revalidatePath('/dashboard')
    revalidatePath(`/lessons/${lesson.slug}`)
    redirect('/teacher/feedback')
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              Feedback
            </p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Teacher feedback requests
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Review student questions, reflections, and requests for human
              feedback in one premium response space.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-black">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  Premium feedback review
                </p>
                <p className="text-sm text-slate-300">
                  Reply, guide, and close requests with clarity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-4">
        <StatCard label="Total requests" value={requests.length} tone="slate" />
        <StatCard label="Pending" value={pendingCount} tone="amber" />
        <StatCard label="Reviewed" value={reviewedCount} tone="emerald" />
        <StatCard label="Closed" value={closedCount} tone="zinc" />
      </section>

      {requests.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-700">No feedback requests yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {requests.map((request) => {
            const lesson = lessonMap.get(request.lesson_id)
            const student = studentMap.get(request.user_id)
            const courseTitle = lesson ? courseMap.get(lesson.course_id) : null

            return (
              <article
                key={request.id}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <UserAvatar
                      src={student?.avatar_url}
                      name={student?.full_name}
                      email={student?.email}
                      size="md"
                    />

                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        {courseTitle || 'Course'}
                      </p>

                      <h3 className="mt-1 text-xl font-bold text-slate-900">
                        {lesson?.title || 'Lesson'}
                      </h3>

                      <p className="mt-1 text-sm text-slate-600">
                        Student:{' '}
                        {student?.full_name || student?.email || 'Student'}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Requested:{' '}
                        {request.created_at
                          ? new Date(request.created_at).toLocaleString()
                          : '—'}
                      </p>

                      {request.reviewed_at && (
                        <p className="mt-1 text-xs text-slate-500">
                          Reviewed:{' '}
                          {new Date(request.reviewed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                      request.status
                    )}`}
                  >
                    {request.status}
                  </span>
                </div>

                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
                      <MessageSquareMore className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      Student message
                    </p>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">
                    {request.student_message}
                  </p>
                </div>

                {request.teacher_feedback && (
                  <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-emerald-800">
                        Your feedback
                      </p>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">
                      {request.teacher_feedback}
                    </p>
                  </div>
                )}

                <form action={replyToRequest} className="mt-6">
                  <input type="hidden" name="request_id" value={request.id} />

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Teacher feedback
                  </label>

                  <textarea
                    name="teacher_feedback"
                    defaultValue={request.teacher_feedback ?? ''}
                    rows={5}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                    placeholder="Write helpful feedback, correction, advice, or next steps..."
                  />

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-amber-300 transition hover:bg-black"
                    >
                      <Send className="h-4 w-4" />
                      Send feedback
                    </button>

                    {lesson && (
                      <Link
                        href={`/lessons/${lesson.slug}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
                      >
                        <UserRound className="h-4 w-4" />
                        Open lesson
                      </Link>
                    )}
                  </div>
                </form>

                {request.status !== 'closed' && (
                  <form action={closeRequest} className="mt-3">
                    <input type="hidden" name="request_id" value={request.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Mark closed
                    </button>
                  </form>
                )}

                {request.status === 'closed' && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                    <Lock className="h-4 w-4" />
                    This request is closed
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