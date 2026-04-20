import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'

type StudentPageProps = {
  params: Promise<{ id: string }>
}

type Course = {
  id: number
  title: string
  slug: string
  description: string | null
}

type Lesson = {
  id: number
  course_id: number
  title: string
  slug: string
  position: number
}

type Progress = {
  lesson_id: number
  completed: boolean
}

export default async function TeacherStudentDetailPage({
  params,
}: StudentPageProps) {
  const { id: studentId } = await params
  const { supabase, user, profile } = await requireTeacherOrAdmin()
  const isAdmin = profile.role === 'admin'

  const { data: teacherCoursesData } = isAdmin
    ? await supabase
        .from('courses')
        .select('id, title, slug, description')
        .order('title', { ascending: true })
    : await supabase
        .from('courses')
        .select('id, title, slug, description')
        .eq('teacher_id', user.id)
        .order('title', { ascending: true })

  const teacherCourses = (teacherCoursesData ?? []) as Course[]
  const teacherCourseIds = teacherCourses.map((course) => course.id)

  if (teacherCourseIds.length === 0) {
    notFound()
  }

  const { data: student } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, github_username, bio')
    .eq('id', studentId)
    .maybeSingle()

  if (!student) {
    notFound()
  }

  const { data: enrollmentsData } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', studentId)
    .in('course_id', teacherCourseIds)

  const enrolledCourseIds = (enrollmentsData ?? []).map((item) => item.course_id)

  if (enrolledCourseIds.length === 0) {
    notFound()
  }

  const courses = teacherCourses.filter((course) =>
    enrolledCourseIds.includes(course.id)
  )

  const { data: lessonsData } = await supabase
    .from('lessons')
    .select('id, course_id, title, slug, position')
    .in('course_id', enrolledCourseIds)
    .eq('is_published', true)
    .order('position', { ascending: true })

  const lessons = (lessonsData ?? []) as Lesson[]
  const lessonIds = lessons.map((lesson) => lesson.id)

  let progressRows: Progress[] = []

  if (lessonIds.length > 0) {
    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', studentId)
      .in('lesson_id', lessonIds)

    progressRows = (progressData ?? []) as Progress[]
  }

  const completedLessonIds = new Set(
    progressRows.filter((row) => row.completed).map((row) => row.lesson_id)
  )

  const totalLessons = lessons.length
  const totalCompleted = lessons.filter((lesson) =>
    completedLessonIds.has(lesson.id)
  ).length

  const overallProgress =
    totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/teacher/students"
          className="text-sm font-medium text-blue-600 underline"
        >
          ← Back to students
        </Link>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Student Progress
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          {student.full_name || student.email || 'Student'}
        </h2>

        <p className="mt-2 text-slate-600">
          Detailed progress for this student.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Enrolled courses</p>
          <p className="mt-2 text-3xl font-bold">{courses.length}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Completed lessons</p>
          <p className="mt-2 text-3xl font-bold">
            {totalCompleted}/{totalLessons}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Overall progress</p>
          <p className="mt-2 text-3xl font-bold">{overallProgress}%</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900">Student details</h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">Email</p>
            <p className="font-medium text-slate-900">
              {student.email || '—'}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">GitHub</p>
            <p className="font-medium text-slate-900">
              {student.github_username || '—'}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="text-sm text-slate-500">Bio</p>
            <p className="text-slate-700">{student.bio || 'No bio added.'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {courses.map((course) => {
          const courseLessons = lessons.filter(
            (lesson) => lesson.course_id === course.id
          )

          const completedCount = courseLessons.filter((lesson) =>
            completedLessonIds.has(lesson.id)
          ).length

          const progress =
            courseLessons.length > 0
              ? Math.round((completedCount / courseLessons.length) * 100)
              : 0

          return (
            <div
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
                </div>

                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                  {progress}%
                </span>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>
                    {completedCount} of {courseLessons.length} lessons completed
                  </span>
                  <span>{progress}%</span>
                </div>

                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {courseLessons.length === 0 ? (
                  <p className="text-slate-600">No published lessons.</p>
                ) : (
                  courseLessons.map((lesson) => {
                    const completed = completedLessonIds.has(lesson.id)

                    return (
                      <div
                        key={lesson.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4"
                      >
                        <div>
                          <p className="text-sm text-slate-500">
                            Lesson {lesson.position}
                          </p>
                          <h4 className="font-semibold text-slate-900">
                            {lesson.title}
                          </h4>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            completed
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {completed ? 'Completed' : 'Not completed'}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}