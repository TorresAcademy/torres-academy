import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/require-admin'

type Lesson = {
  id: number
  course_id: number
  title: string
  slug: string
  position: number
  is_published: boolean | null
}

type Course = {
  id: number
  title: string
}

export default async function AdminLessonsPage() {
  const { supabase } = await requireAdmin()

  const { data: lessonsData } = await supabase
    .from('lessons')
    .select('id, course_id, title, slug, position, is_published')
    .order('course_id', { ascending: true })
    .order('position', { ascending: true })

  const { data: coursesData } = await supabase
    .from('courses')
    .select('id, title')
    .order('title', { ascending: true })

  const lessons = (lessonsData ?? []) as Lesson[]
  const courses = (coursesData ?? []) as Course[]
  const courseMap = new Map(courses.map((course) => [course.id, course.title]))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Lessons
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Manage lessons
          </h2>
          <p className="mt-2 text-slate-600">
            Create, edit, and organize lesson content.
          </p>
        </div>

        <Link
          href="/admin/lessons/new"
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          New lesson
        </Link>
      </div>

      <div className="grid gap-6">
        {lessons.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-slate-700">No lessons yet.</p>
          </div>
        ) : (
          lessons.map((lesson) => (
            <article
              key={lesson.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    {courseMap.get(lesson.course_id) || 'Unknown course'}
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900">
                    {lesson.title}
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span>Slug: {lesson.slug}</span>
                    <span>Position: {lesson.position}</span>
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    lesson.is_published
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {lesson.is_published ? 'Published' : 'Draft'}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/admin/lessons/${lesson.id}/edit`}
                  className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                >
                  Edit
                </Link>

                <Link
                  href={`/lessons/${lesson.slug}`}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                >
                  View lesson
                </Link>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}