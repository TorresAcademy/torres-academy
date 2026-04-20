import Link from 'next/link'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'
import UserAvatar from '@/components/user-avatar'

type Course = {
  id: number
  title: string
  slug: string
  is_published: boolean | null
}

type Lesson = {
  id: number
  course_id: number
  title: string
  position: number
  is_published: boolean | null
}

type Enrollment = {
  user_id: string
  course_id: number
}

type Progress = {
  user_id: string
  lesson_id: number
  completed: boolean
}

type Student = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

function getProgressColor(progress: number) {
  if (progress >= 75) return 'bg-green-500'
  if (progress >= 40) return 'bg-blue-500'
  if (progress > 0) return 'bg-amber-500'
  return 'bg-red-500'
}

function getProgressLabel(progress: number) {
  if (progress >= 75) return 'Doing well'
  if (progress >= 40) return 'In progress'
  if (progress > 0) return 'Needs support'
  return 'Not started'
}

export default async function TeacherAnalyticsPage() {
  const { supabase, user, profile } = await requireTeacherOrAdmin()
  const isAdmin = profile.role === 'admin'

  const { data: coursesData } = isAdmin
    ? await supabase
        .from('courses')
        .select('id, title, slug, is_published')
        .order('created_at', { ascending: false })
    : await supabase
        .from('courses')
        .select('id, title, slug, is_published')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

  const courses = (coursesData ?? []) as Course[]
  const courseIds = courses.map((course) => course.id)

  let lessons: Lesson[] = []
  let enrollments: Enrollment[] = []
  let progressRows: Progress[] = []
  let students: Student[] = []

  if (courseIds.length > 0) {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, course_id, title, position, is_published')
      .in('course_id', courseIds)
      .order('position', { ascending: true })

    lessons = (lessonsData ?? []) as Lesson[]

    const { data: enrollmentsData } = await supabase
      .from('enrollments')
      .select('user_id, course_id')
      .in('course_id', courseIds)

    enrollments = (enrollmentsData ?? []) as Enrollment[]

    const studentIds = [...new Set(enrollments.map((item) => item.user_id))]

    if (studentIds.length > 0) {
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', studentIds)
        .order('full_name', { ascending: true })

      students = (studentsData ?? []) as Student[]
    }

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

  const publishedLessons = lessons.filter((lesson) => lesson.is_published)
  const publishedLessonIds = new Set(publishedLessons.map((lesson) => lesson.id))

  const completedProgressRows = progressRows.filter((row) =>
    publishedLessonIds.has(row.lesson_id)
  )

  function getCourseStats(course: Course) {
    const courseLessons = publishedLessons.filter(
      (lesson) => lesson.course_id === course.id
    )

    const courseLessonIds = new Set(courseLessons.map((lesson) => lesson.id))

    const courseEnrollments = enrollments.filter(
      (enrollment) => enrollment.course_id === course.id
    )

    const enrolledStudentIds = [
      ...new Set(courseEnrollments.map((item) => item.user_id)),
    ]

    const possibleCompletions = enrolledStudentIds.length * courseLessons.length

    const completedCompletions = completedProgressRows.filter(
      (row) =>
        enrolledStudentIds.includes(row.user_id) &&
        courseLessonIds.has(row.lesson_id)
    ).length

    const progress =
      possibleCompletions > 0
        ? Math.round((completedCompletions / possibleCompletions) * 100)
        : 0

    const notStartedStudents = enrolledStudentIds.filter((studentId) => {
      const completedForStudent = completedProgressRows.filter(
        (row) => row.user_id === studentId && courseLessonIds.has(row.lesson_id)
      ).length

      return completedForStudent === 0
    }).length

    const lowProgressStudents = enrolledStudentIds.filter((studentId) => {
      const completedForStudent = completedProgressRows.filter(
        (row) => row.user_id === studentId && courseLessonIds.has(row.lesson_id)
      ).length

      const studentProgress =
        courseLessons.length > 0
          ? Math.round((completedForStudent / courseLessons.length) * 100)
          : 0

      return studentProgress > 0 && studentProgress < 40
    }).length

    return {
      lessons: courseLessons.length,
      students: enrolledStudentIds.length,
      completedCompletions,
      possibleCompletions,
      progress,
      notStartedStudents,
      lowProgressStudents,
    }
  }

  function getStudentStats(student: Student) {
    const studentEnrollments = enrollments.filter(
      (enrollment) => enrollment.user_id === student.id
    )

    const studentCourseIds = new Set(
      studentEnrollments.map((enrollment) => enrollment.course_id)
    )

    const studentLessons = publishedLessons.filter((lesson) =>
      studentCourseIds.has(lesson.course_id)
    )

    const studentLessonIds = new Set(studentLessons.map((lesson) => lesson.id))

    const completedCount = completedProgressRows.filter(
      (row) => row.user_id === student.id && studentLessonIds.has(row.lesson_id)
    ).length

    const totalLessons = studentLessons.length

    const progress =
      totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

    return {
      courses: studentCourseIds.size,
      completedCount,
      totalLessons,
      missingLessons: Math.max(totalLessons - completedCount, 0),
      progress,
      label: getProgressLabel(progress),
    }
  }

  const courseStats = courses.map((course) => ({
    course,
    stats: getCourseStats(course),
  }))

  const studentStats = students.map((student) => ({
    student,
    stats: getStudentStats(student),
  }))

  const studentsNeedingAttention = studentStats
    .filter((item) => item.stats.totalLessons > 0 && item.stats.progress < 40)
    .sort((a, b) => a.stats.progress - b.stats.progress)

  const notStartedStudents = studentStats
    .filter((item) => item.stats.totalLessons > 0 && item.stats.progress === 0)
    .sort((a, b) => a.student.full_name?.localeCompare(b.student.full_name || '') || 0)

  const activeStudents = studentStats.filter(
    (item) => item.stats.progress > 0
  ).length

  const totalStudents = students.length
  const totalCourses = courses.length
  const totalPublishedCourses = courses.filter((course) => course.is_published)
    .length
  const totalPublishedLessons = publishedLessons.length
  const totalCompleted = completedProgressRows.length

  const totalPossibleCompletions = enrollments.reduce((total, enrollment) => {
    const courseLessons = publishedLessons.filter(
      (lesson) => lesson.course_id === enrollment.course_id
    )

    return total + courseLessons.length
  }, 0)

  const overallProgress =
    totalPossibleCompletions > 0
      ? Math.round((totalCompleted / totalPossibleCompletions) * 100)
      : 0

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Analytics
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Teacher analytics
        </h2>

        <p className="mt-2 text-slate-600">
          Track course completion, identify students who need support, and spot
          missing lesson progress.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Overall completion</p>
          <p className="mt-2 text-3xl font-bold">{overallProgress}%</p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${getProgressColor(overallProgress)}`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Students</p>
          <p className="mt-2 text-3xl font-bold">{totalStudents}</p>
          <p className="mt-2 text-sm text-slate-600">
            {activeStudents} active students
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Courses</p>
          <p className="mt-2 text-3xl font-bold">{totalCourses}</p>
          <p className="mt-2 text-sm text-slate-600">
            {totalPublishedCourses} published
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Published lessons</p>
          <p className="mt-2 text-3xl font-bold">{totalPublishedLessons}</p>
          <p className="mt-2 text-sm text-slate-600">
            {totalCompleted} completions
          </p>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">
              Students needing attention
            </h3>
            <p className="mt-2 text-slate-600">
              Students below 40% completion across your published lessons.
            </p>
          </div>

          <Link
            href="/teacher/students"
            className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
          >
            View all students
          </Link>
        </div>

        {studentsNeedingAttention.length === 0 ? (
          <p className="mt-6 text-slate-700">
            No students need attention right now.
          </p>
        ) : (
          <div className="mt-6 grid gap-4">
            {studentsNeedingAttention.slice(0, 8).map(({ student, stats }) => (
              <div
                key={student.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    src={student.avatar_url}
                    name={student.full_name}
                    email={student.email}
                    size="sm"
                  />

                  <div>
                    <h4 className="font-semibold text-slate-900">
                      {student.full_name || student.email || 'Student'}
                    </h4>
                    <p className="text-sm text-slate-500">
                      {stats.label} · {stats.missingLessons} missing lessons
                    </p>
                  </div>
                </div>

                <div className="w-full md:w-64">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>{stats.completedCount}/{stats.totalLessons}</span>
                    <span>{stats.progress}%</span>
                  </div>

                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${getProgressColor(
                        stats.progress
                      )}`}
                      style={{ width: `${stats.progress}%` }}
                    />
                  </div>
                </div>

                <Link
                  href={`/teacher/students/${student.id}`}
                  className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                >
                  Help student
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-2xl font-bold text-slate-900">
            Course progress
          </h3>
          <p className="mt-2 text-slate-600">
            Completion percentage across enrolled students.
          </p>

          {courseStats.length === 0 ? (
            <p className="mt-6 text-slate-700">No courses yet.</p>
          ) : (
            <div className="mt-6 space-y-5">
              {courseStats.map(({ course, stats }, index) => {
                const accent =
                  index % 4 === 0
                    ? 'bg-blue-500'
                    : index % 4 === 1
                    ? 'bg-green-500'
                    : index % 4 === 2
                    ? 'bg-amber-500'
                    : 'bg-purple-500'

                return (
                  <div key={course.id}>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          {course.title}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {stats.students} students · {stats.lessons} lessons
                        </p>
                      </div>

                      <span className="font-semibold text-slate-900">
                        {stats.progress}%
                      </span>
                    </div>

                    <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${accent}`}
                        style={{ width: `${stats.progress}%` }}
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{stats.notStartedStudents} not started</span>
                      <span>{stats.lowProgressStudents} low progress</span>
                      <span>
                        {stats.completedCompletions}/{stats.possibleCompletions}{' '}
                        completions
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-2xl font-bold text-slate-900">
            Not started yet
          </h3>
          <p className="mt-2 text-slate-600">
            Students enrolled but with 0 completed lessons.
          </p>

          {notStartedStudents.length === 0 ? (
            <p className="mt-6 text-slate-700">
              No not-started students right now.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {notStartedStudents.slice(0, 8).map(({ student, stats }) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      src={student.avatar_url}
                      name={student.full_name}
                      email={student.email}
                      size="sm"
                    />

                    <div>
                      <h4 className="font-semibold text-slate-900">
                        {student.full_name || student.email || 'Student'}
                      </h4>
                      <p className="text-sm text-slate-500">
                        {stats.courses} courses · {stats.totalLessons} lessons
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/teacher/students/${student.id}`}
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">
          Student progress overview
        </h3>
        <p className="mt-2 text-slate-600">
          A quick view of every student enrolled in your courses.
        </p>

        {studentStats.length === 0 ? (
          <p className="mt-6 text-slate-700">No student progress yet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4">Student</th>
                  <th className="py-3 pr-4">Courses</th>
                  <th className="py-3 pr-4">Completed</th>
                  <th className="py-3 pr-4">Missing</th>
                  <th className="py-3 pr-4">Progress</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Details</th>
                </tr>
              </thead>

              <tbody>
                {studentStats
                  .sort((a, b) => a.stats.progress - b.stats.progress)
                  .map(({ student, stats }) => (
                    <tr key={student.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            src={student.avatar_url}
                            name={student.full_name}
                            email={student.email}
                            size="sm"
                          />
                          <div>
                            <p className="font-medium text-slate-900">
                              {student.full_name || '—'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {student.email || '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 pr-4 text-slate-700">
                        {stats.courses}
                      </td>

                      <td className="py-3 pr-4 text-slate-700">
                        {stats.completedCount}/{stats.totalLessons}
                      </td>

                      <td className="py-3 pr-4 text-slate-700">
                        {stats.missingLessons}
                      </td>

                      <td className="py-3 pr-4">
                        <div className="w-36">
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>{stats.progress}%</span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full ${getProgressColor(
                                stats.progress
                              )}`}
                              style={{ width: `${stats.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            stats.progress >= 75
                              ? 'bg-green-100 text-green-700'
                              : stats.progress >= 40
                              ? 'bg-blue-100 text-blue-700'
                              : stats.progress > 0
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {stats.label}
                        </span>
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
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}