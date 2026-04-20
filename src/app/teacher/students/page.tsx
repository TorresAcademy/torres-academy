import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'

type StudentProfile = {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
}

export default async function TeacherStudentsPage() {
  const { supabase, user, profile } = await requireTeacherOrAdmin()

  const isAdmin = profile.role === 'admin'

  let courseIds: number[] = []

  if (isAdmin) {
    const { data: allCourses } = await supabase.from('courses').select('id')
    courseIds = (allCourses ?? []).map((c) => c.id)
  } else {
    const { data: teacherCourses } = await supabase
      .from('courses')
      .select('id')
      .eq('teacher_id', user.id)

    courseIds = (teacherCourses ?? []).map((c) => c.id)
  }

  let studentIds: string[] = []

  if (courseIds.length > 0) {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('user_id')
      .in('course_id', courseIds)

    studentIds = [...new Set((enrollments ?? []).map((e) => e.user_id))]
  }

  let students: StudentProfile[] = []

  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('id', studentIds)
      .order('created_at', { ascending: false })

    students = (profiles ?? []) as StudentProfile[]
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Students
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          My students
        </h2>
        <p className="mt-2 text-slate-600">
          Students enrolled in your courses.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {students.length === 0 ? (
          <p className="text-slate-700">No students enrolled yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4">Name</th>
                  <th className="py-3 pr-4">Email</th>
                  <th className="py-3 pr-4">Role</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 text-slate-900">
                      {student.full_name || '—'}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {student.email || '—'}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {student.role || 'student'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}