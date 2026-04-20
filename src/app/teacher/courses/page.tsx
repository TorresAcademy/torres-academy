// src/app/teacher/courses/page.tsx
import Link from 'next/link'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'

type Course = {
  id: number
  title: string
  slug: string
  description: string | null
  is_published: boolean | null
}

type Lesson = {
  id: number
  course_id: number
}

export default async function TeacherCoursesPage() {
  const { supabase, user, profile } = await requireTeacherOrAdmin()
  const isAdmin = profile.role === 'admin'

  const { data: coursesData } = isAdmin
    ? await supabase
        .from('courses')
        .select('id, title, slug, description, is_published')
        .order('created_at', { ascending: false })
    : await supabase
        .from('courses')
        .select('id, title, slug, description, is_published')
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
            Create and manage the courses you teach.
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
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      course.is_published
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {course.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/teacher/courses/${course.id}/edit`}
                    className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Edit
                  </Link>

                  <Link
                    href={`/courses/${course.slug}`}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    View public page
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}