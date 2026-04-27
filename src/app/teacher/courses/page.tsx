// src/app/teacher/courses/page.tsx
import Link from 'next/link'
import {
  BookOpen,
  CalendarDays,
  Eye,
  GraduationCap,
  Pencil,
  PlusCircle,
  Sparkles,
} from 'lucide-react'
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
  if (status === 'published') return 'bg-emerald-100 text-emerald-700'
  if (status === 'archived') return 'bg-slate-200 text-slate-700'
  return 'bg-amber-100 text-amber-900'
}

function MetricCard({
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

  const publishedCount = courses.filter(
    (course) => normalizeStatus(course.status, course.is_published) === 'published'
  ).length

  const draftCount = courses.filter(
    (course) => normalizeStatus(course.status, course.is_published) === 'draft'
  ).length

  const archivedCount = courses.filter(
    (course) => normalizeStatus(course.status, course.is_published) === 'archived'
  ).length

  const totalLessons = lessons.length

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              Courses
            </p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              My courses
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Create and manage courses with lifecycle controls, seasonal timing,
              and duration planning in one premium workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-black">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Premium course management
                  </p>
                  <p className="text-sm text-slate-300">
                    Structure, publish, and schedule with clarity.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/teacher/courses/new"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black transition hover:bg-amber-300"
            >
              <PlusCircle className="h-4 w-4" />
              New course
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total courses" value={courses.length} />
        <MetricCard label="Published" value={publishedCount} />
        <MetricCard label="Drafts" value={draftCount} />
        <MetricCard label="Total lessons" value={totalLessons} note={`${archivedCount} archived courses`} />
      </section>

      {courses.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
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
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
                        <BookOpen className="h-5 w-5" />
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-slate-900">
                          {course.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Slug: {course.slug}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-slate-700">
                      {course.description || 'No description yet.'}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Lessons: {lessonCount}
                      </span>

                      {course.recommended_duration_label && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
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
                  <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        Seasonal timing
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                          Enrollment opens
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {enrollmentOpensAt || '—'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                          Enrollment closes
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {enrollmentClosesAt || '—'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                          Course starts
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {courseStartsAt || '—'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
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
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-amber-300 transition hover:bg-black"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>

                  {status === 'published' ? (
                    <Link
                      href={`/courses/${course.slug}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
                    >
                      <Eye className="h-4 w-4" />
                      View public page
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-500">
                      <GraduationCap className="h-4 w-4" />
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