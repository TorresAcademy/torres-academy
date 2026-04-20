import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'
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
}

type Student = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

export default async function TeacherFeedbackPage() {
  const { supabase, user, profile } = await requireTeacherOrAdmin()
  const isAdmin = profile.role === 'admin'

  const { data: coursesData } = isAdmin
    ? await supabase.from('courses').select('id, title')
    : await supabase.from('courses').select('id, title').eq('teacher_id', user.id)

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

    const { supabase, user } = await requireTeacherOrAdmin()

    const requestId = Number(formData.get('request_id'))
    const teacherFeedback = String(formData.get('teacher_feedback') || '').trim()

    if (!requestId || !teacherFeedback) {
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

    revalidatePath('/teacher/feedback')
    redirect('/teacher/feedback')
  }

  async function closeRequest(formData: FormData) {
    'use server'

    const { supabase } = await requireTeacherOrAdmin()

    const requestId = Number(formData.get('request_id'))

    if (!requestId) {
      redirect('/teacher/feedback')
    }

    await supabase
      .from('feedback_requests')
      .update({
        status: 'closed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    revalidatePath('/teacher/feedback')
    redirect('/teacher/feedback')
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Feedback
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Teacher feedback requests
        </h2>

        <p className="mt-2 text-slate-600">
          Review student questions, reflections, and requests for human feedback.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Total requests</p>
          <p className="mt-2 text-3xl font-bold">{requests.length}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{pendingCount}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Reviewed</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{reviewedCount}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Closed</p>
          <p className="mt-2 text-3xl font-bold text-slate-600">{closedCount}</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
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
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
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
                      <p className="text-sm font-semibold text-blue-700">
                        {courseTitle || 'Course'}
                      </p>

                      <h3 className="mt-1 text-xl font-bold text-slate-900">
                        {lesson?.title || 'Lesson'}
                      </h3>

                      <p className="mt-1 text-sm text-slate-600">
                        Student: {student?.full_name || student?.email || 'Student'}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Requested:{' '}
                        {request.created_at
                          ? new Date(request.created_at).toLocaleString()
                          : '—'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
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

                <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-900">
                    Student message
                  </p>
                  <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">
                    {request.student_message}
                  </p>
                </div>

                {request.teacher_feedback && (
                  <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-5">
                    <p className="text-sm font-semibold text-green-800">
                      Your feedback
                    </p>
                    <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">
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
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="Write helpful feedback, correction, advice, or next steps..."
                  />

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                    >
                      Send feedback
                    </button>

                    {lesson && (
                      <Link
                        href={`/lessons/${lesson.slug}`}
                        className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                      >
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
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Mark closed
                    </button>
                  </form>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}