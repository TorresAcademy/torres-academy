import CourseForm from '@/components/admin/course-form'
import { requireAdmin } from '@/lib/admin/require-admin'

export default async function NewCoursePage() {
  await requireAdmin()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Courses
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Create course
        </h2>
        <p className="mt-2 text-slate-600">
          Add a new course to Torres Academy.
        </p>
      </div>

      <CourseForm mode="create" />
    </div>
  )
}