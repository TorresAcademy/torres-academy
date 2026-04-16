import Link from 'next/link'
import LessonForm from '@/components/admin/lesson-form'
import { requireAdmin } from '@/lib/admin/require-admin'

export default async function NewLessonPage() {
  const { supabase } = await requireAdmin()

  const { data: coursesData } = await supabase
    .from('courses')
    .select('id, title')
    .order('title', { ascending: true })

  const courses =
    (coursesData ?? []).map((course) => ({
      id: course.id,
      title: course.title,
    })) || []

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Lessons
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Create lesson
        </h2>
        <p className="mt-2 text-slate-600">
          Add a new lesson to one of your courses.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-700">
            You need at least one course before creating lessons.
          </p>
          <div className="mt-4">
            <Link
              href="/admin/courses/new"
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Create course first
            </Link>
          </div>
        </div>
      ) : (
        <LessonForm mode="create" courses={courses} />
      )}
    </div>
  )
}