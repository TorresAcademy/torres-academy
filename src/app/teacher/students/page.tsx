import Link from 'next/link'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
}

type Enrollment = {
  user_id: string
  course_id: number
}

type Lesson = {
  id: number
  course_id: number
}

type Progress = {
  user_id: string
  lesson_id: number
  completed: boolean
}

export default async function TeacherStudentsPage() {
  const { supabase, user, profile } = await requireTeacherOrAdmin()
  const isAdmin = profile.role === 'admin'

  const { data: coursesData } = isAdmin
    ? await supabase.from('courses').select('id, title')
    : await supabase.from('courses').select('id, title').eq('teacher_id', user.id)

  const courseIds = (coursesData ?? []).map((course) => course.id)

  let enrollments: Enrollment[] = []
  let lessons: Lesson[] = []
  let progressRows: Progress[] = []
  let students: Profile[] = []

  if (courseIds.length > 0) {
    const { data: enrollmentsData } = await supabase
      .from('enrollments')
      .select('user_id, course_id')
      .in('course_id', courseIds)

    enrollments = (enrollmentsData ?? []) as Enrollment[]

    const studentIds = [...new Set(enrollments.map((item) => item.user_id))]

    if (studentIds.length > 0) {
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', studentIds)
        .order('created_at', { ascending: false })

      students = (studentsData ?? []) as Profile[]
    }

    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, course_id')
      .in('course_id', courseIds)
      .eq('is_published', true)

    lessons = (lessonsData ?? []) as Lesson[]

    const lessonIds = lessons.map((lesson) => lesson.id)

    if (lessonIds.length > 0) {
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('user_id, lesson_id, completed')
        .in('lesson_id', lessonIds)
        .eq('completed', true)

      progressRows = (progressData ?? []) as Progress[]
    }
  }

  function getStudentStats(studentId: string) {
    const studentEnrollments = enrollments.filter(
      (item) => item.user_id === studentId
    )

    const enrolledCourseIds = new Set(
      studentEnrollments.map((item) => item.course_id)
    )

    const studentLessons = lessons.filter((lesson) =>
      enrolledCourseIds.has(lesson.course_id)
    )

    const studentLessonIds = new Set(studentLessons.map((lesson) => lesson.id))

    const completedCount = progressRows.filter(
      (row) => row.user_id === studentId && studentLessonIds.has(row.lesson_id)
    ).length

    const totalLessons = studentLessons.length

    const progress =
      totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

    return {
      enrolledCourses: studentEnrollments.length,
      completedCount,
      totalLessons,
      progress,
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Students
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Student progress
        </h2>
        <p className="mt-2 text-slate-600">
          Track students enrolled in your courses.
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
                  <th className="py-3 pr-4">Courses</th>
                  <th className="py-3 pr-4">Progress</th>
                  <th className="py-3 pr-4">Completed</th>
                  <th className="py-3 pr-4">Details</th>
                </tr>
              </thead>

              <tbody>
                {students.map((student) => {
                  const stats = getStudentStats(student.id)

                  return (
                    <tr key={student.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-medium text-slate-900">
                        {student.full_name || '—'}
                      </td>

                      <td className="py-3 pr-4 text-slate-700">
                        {student.email || '—'}
                      </td>

                      <td className="py-3 pr-4 text-slate-700">
                        {stats.enrolledCourses}
                      </td>

                      <td className="py-3 pr-4">
                        <div className="w-32">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{stats.progress}%</span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${stats.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 pr-4 text-slate-700">
                        {stats.completedCount}/{stats.totalLessons}
                      </td>

                      <td className="py-3 pr-4">
                        <Link
                          href={`/teacher/students/${student.id}`}
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