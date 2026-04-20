// src/app/teacher/courses/new/page.tsx
import TeacherCourseForm from '@/components/teacher/teacher-course-form'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'

export default async function TeacherNewCoursePage() {
  const { user } = await requireTeacherOrAdmin()

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
          Create a new course for your teacher hub.
        </p>
      </div>

      <TeacherCourseForm mode="create" ownerId={user.id} />
    </div>
  )
}