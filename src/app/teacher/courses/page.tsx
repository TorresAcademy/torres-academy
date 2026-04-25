// src/app/teacher/courses/page.tsx
import Link from 'next/link'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'

type CourseStatus = 'draft' | 'published' | 'archived'

type Course = {
  id: number
  title: string
  slug: string
  description: string | null
  is_published: boolean | null
  status: CourseStatus | null
  enrollment_opens_at: string | null
  enrollment_closes_at: string | null
  course_starts_at: string | null
  course_ends_at: string | null
  recommended_duration_label: string | null
}

type Lesson = {
  id: number
  course_id: number
}

function normalizeStatus(
  status: CourseStatus | null,
  isPublished: boolean | null
): CourseStatus {
  if (status === 'draft' || status === 'published' || status === 'archived') {
    return status
  }

  return isPublished ? 'published' : 'draft'
}

function formatDate(value: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getStatusBadgeClass(status: CourseStatus) {
  if (status === 'published') return 'bg-green-100 text-green-700'
  if (status === 'archived') return 'bg-slate-200 text-slate-700'
  return 'bg-amber-100 text-amber-700'
}

export default async function TeacherCoursesPage() {
  const { supabase, user, profile } = await requireTeacherOrAdmin()
  const isAdmin = profile.role === 'admin'

  const { data: coursesData } = isAdmin
    ? await supabase
        .from('courses')
        .select(
          'id, title, slug, description, is_published, status, enrollment_opens_at, enrollment_closes_at, course_starts_at, course_ends_at, recommended_duration_label'
        )
        .order('created_at', { ascending: false })
    : await supabase
        .from('courses')
        .select(
          'id, title, slug, description, is_published, status, enrollment_opens_at, enrollment_closes_at, course_starts_at, course_ends_at, recommended_duration_label'
        )
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

  const courses = (coursesData ?? []) as Course[]
  const courseIds = courses.map((course) => course.id)

  let lessons: Lesson[] = []
  if (courseIds.length > 0) {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, course_id')
      .in('course_id', courseIds)

    lessons = (lessonsData ?? []) as Lesson[]
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Courses
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            My courses
          </h2>
          <p className="mt-2 text-slate-600">
            Create and manage courses with lifecycle, seasonal timing, and
            duration planning.
          </p>
        </div>

        <Link
          href="/teacher/courses/new"
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          New course
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-700">No courses assigned yet.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {courses.map((course) => {
            const lessonCount = lessons.filter(
              (lesson) => lesson.course_id === course.id
            ).length

            const status = normalizeStatus(course.status, course.is_published)
            const enrollmentOpensAt = formatDate(course.enrollment_opens_at)
            const enrollmentClosesAt = formatDate(course.enrollment_closes_at)
            const courseStartsAt = formatDate(course.course_starts_at)
            const courseEndsAt = formatDate(course.course_ends_at)

            return (
              <article
                key={course.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {course.title}
                    </h3>
                    <p className="mt-2 text-slate-700">
                      {course.description || 'No description yet.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                      <span>Slug: {course.slug}</span>
                      <span>Lessons: {lessonCount}</span>
                      {course.recommended_duration_label && (
                        <span>
                          Recommended: {course.recommended_duration_label}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                      status
                    )}`}
                  >
                    {status === 'published'
                      ? 'Published'
                      : status === 'archived'
                        ? 'Archived'
                        : 'Draft'}
                  </span>
                </div>

                {(enrollmentOpensAt ||
                  enrollmentClosesAt ||
                  courseStartsAt ||
                  courseEndsAt) && (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Seasonal timing
                    </p>

                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                          Enrollment opens
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {enrollmentOpensAt || '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                          Enrollment closes
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {enrollmentClosesAt || '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                          Course starts
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {courseStartsAt || '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                          Course ends
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {courseEndsAt || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/teacher/courses/${course.id}/edit`}
                    className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Edit
                  </Link>

                  {status === 'published' ? (
                    <Link
                      href={`/courses/${course.slug}`}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                    >
                      View public page
                    </Link>
                  ) : (
                    <span className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-500">
                      Hidden from students until published
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}