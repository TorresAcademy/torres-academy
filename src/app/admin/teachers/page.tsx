import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/require-admin'

type Teacher = {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  created_at: string | null
}

type Course = {
  id: number
  teacher_id: string | null
}

type Lesson = {
  id: number
  course_id: number
}

type Enrollment = {
  user_id: string
  course_id: number
}

export default async function AdminTeachersPage() {
  const { supabase } = await requireAdmin()

  const { data: teachersData } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .eq('role', 'teacher')
    .order('created_at', { ascending: false })

  const teachers = (teachersData ?? []) as Teacher[]
  const teacherIds = teachers.map((teacher) => teacher.id)

  let courses: Course[] = []
  let lessons: Lesson[] = []
  let enrollments: Enrollment[] = []

  if (teacherIds.length > 0) {
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, teacher_id')
      .in('teacher_id', teacherIds)

    courses = (coursesData ?? []) as Course[]

    const courseIds = courses.map((course) => course.id)

    if (courseIds.length > 0) {
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, course_id')
        .in('course_id', courseIds)

      lessons = (lessonsData ?? []) as Lesson[]

      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('user_id, course_id')
        .in('course_id', courseIds)

      enrollments = (enrollmentsData ?? []) as Enrollment[]
    }
  }

  function getTeacherStats(teacherId: string) {
    const teacherCourses = courses.filter(
      (course) => course.teacher_id === teacherId
    )

    const teacherCourseIds = new Set(teacherCourses.map((course) => course.id))

    const teacherLessons = lessons.filter((lesson) =>
      teacherCourseIds.has(lesson.course_id)
    )

    const teacherEnrollments = enrollments.filter((enrollment) =>
      teacherCourseIds.has(enrollment.course_id)
    )

    const uniqueStudentIds = new Set(
      teacherEnrollments.map((enrollment) => enrollment.user_id)
    )

    return {
      courses: teacherCourses.length,
      lessons: teacherLessons.length,
      students: uniqueStudentIds.size,
      enrollments: teacherEnrollments.length,
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Teachers
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Teacher management
          </h2>

          <p className="mt-2 text-slate-600">
            View teachers, their courses, and student activity.
          </p>
        </div>

        <Link
          href="/admin/users"
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Manage user roles
        </Link>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {teachers.length === 0 ? (
          <div>
            <p className="text-slate-700">No teachers yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Go to Admin → Users and change a user role from student to teacher.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4">Teacher</th>
                  <th className="py-3 pr-4">Email</th>
                  <th className="py-3 pr-4">Courses</th>
                  <th className="py-3 pr-4">Lessons</th>
                  <th className="py-3 pr-4">Students</th>
                  <th className="py-3 pr-4">Enrollments</th>
                  <th className="py-3 pr-4">Joined</th>
                  <th className="py-3 pr-4">Details</th>
                </tr>
              </thead>

              <tbody>
                {teachers.map((teacher) => {
                  const stats = getTeacherStats(teacher.id)

                  return (
                    <tr key={teacher.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-medium text-slate-900">
                        {teacher.full_name || 'Unnamed teacher'}
                      </td>

                      <td className="py-3 pr-4 text-slate-700">
                        {teacher.email || '—'}
                      </td>

                      <td className="py-3 pr-4 text-slate-700">
                        {stats.courses}
                      </td>

                      <td className="py-3 pr-4 text-slate-700">
                        {stats.lessons}
                      </td>

                      <td className="py-3 pr-4 text-slate-700">
                        {stats.students}
                      </td>

                      <td className="py-3 pr-4 text-slate-700">
                        {stats.enrollments}
                      </td>

                      <td className="py-3 pr-4 text-slate-700">
                        {teacher.created_at
                          ? new Date(teacher.created_at).toLocaleDateString()
                          : '—'}
                      </td>

                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/teachers/${teacher.id}`}
                          className="rounded-xl border border-slate-300 px-3 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}