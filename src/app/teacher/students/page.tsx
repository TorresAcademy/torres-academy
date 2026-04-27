import Link from 'next/link'
import {
  BookOpen,
  GraduationCap,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
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

function getProgressTone(progress: number) {
  if (progress >= 75) {
    return {
      badge: 'bg-emerald-100 text-emerald-700',
      bar: 'bg-emerald-500',
      label: 'Doing well',
    }
  }

  if (progress >= 40) {
    return {
      badge: 'bg-amber-100 text-amber-900',
      bar: 'bg-amber-400',
      label: 'In progress',
    }
  }

  if (progress > 0) {
    return {
      badge: 'bg-yellow-100 text-yellow-900',
      bar: 'bg-yellow-500',
      label: 'Needs support',
    }
  }

  return {
    badge: 'bg-red-100 text-red-700',
    bar: 'bg-red-500',
    label: 'Not started',
  }
}

export default async function TeacherStudentsPage() {
  const { supabase, user, profile } = await requireTeacherOrAdmin()
  const isAdmin = profile.role === 'admin'

  const { data: coursesData } = isAdmin
    ? await supabase.from('courses').select('id, title')
    : await supabase
        .from('courses')
        .select('id, title')
        .eq('teacher_id', user.id)

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

  const totalStudents = students.length
  const totalEnrollments = enrollments.length
  const totalPublishedLessons = lessons.length
  const activeStudents = students.filter((student) => {
    const stats = getStudentStats(student.id)
    return stats.progress > 0
  }).length

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              Students
            </p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Student progress
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Track students enrolled in your courses, monitor lesson
              completion, and quickly open each student record for deeper
              support.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-black">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  Premium student overview
                </p>
                <p className="text-sm text-slate-300">
                  Enrollment, progress, and visibility in one place.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Students" value={totalStudents} />
        <MetricCard label="Active students" value={activeStudents} />
        <MetricCard label="Enrollments" value={totalEnrollments} />
        <MetricCard
          label="Published lessons"
          value={totalPublishedLessons}
          note={`${courseIds.length} teacher course${courseIds.length === 1 ? '' : 's'}`}
        />
      </section>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        {students.length === 0 ? (
          <p className="text-slate-700">No students enrolled yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4">Student</th>
                  <th className="py-3 pr-4">Email</th>
                  <th className="py-3 pr-4">Courses</th>
                  <th className="py-3 pr-4">Progress</th>
                  <th className="py-3 pr-4">Completed</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Details</th>
                </tr>
              </thead>

              <tbody>
                {students.map((student) => {
                  const stats = getStudentStats(student.id)
                  const tone = getProgressTone(stats.progress)

                  return (
                    <tr key={student.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
                            <UserRound className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {student.full_name || '—'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {student.role || 'student'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 pr-4 text-slate-700">
                        {student.email || '—'}
                      </td>

                      <td className="py-3 pr-4">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          <BookOpen className="h-3.5 w-3.5" />
                          {stats.enrolledCourses}
                        </div>
                      </td>

                      <td className="py-3 pr-4">
                        <div className="w-36">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{stats.progress}%</span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full ${tone.bar}`}
                              style={{ width: `${stats.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 pr-4">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          <GraduationCap className="h-3.5 w-3.5" />
                          {stats.completedCount}/{stats.totalLessons}
                        </div>
                      </td>

                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}
                        >
                          {tone.label}
                        </span>
                      </td>

                      <td className="py-3 pr-4">
                        <Link
                          href={`/teacher/students/${student.id}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
                        >
                          <Users className="h-4 w-4" />
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