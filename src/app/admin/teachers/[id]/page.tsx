import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/require-admin'

type TeacherPageProps = {
  params: Promise<{ id: string }>
}

type Course = {
  id: number
  title: string
  slug: string
  description: string | null
  is_published: boolean | null
  is_free: boolean | null
}

type Lesson = {
  id: number
  course_id: number
  title: string
  is_published: boolean | null
}

type Enrollment = {
  user_id: string
  course_id: number
}

type Student = {
  id: string
  full_name: string | null
  email: string | null
}

export default async function AdminTeacherDetailPage({
  params,
}: TeacherPageProps) {
  const { id: teacherId } = await params
  const { supabase } = await requireAdmin()

  const { data: teacher } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, bio, github_username, created_at')
    .eq('id', teacherId)
    .eq('role', 'teacher')
    .maybeSingle()

  if (!teacher) {
    notFound()
  }

  const { data: coursesData } = await supabase
    .from('courses')
    .select('id, title, slug, description, is_published, is_free')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })

  const courses = (coursesData ?? []) as Course[]
  const courseIds = courses.map((course) => course.id)

  let lessons: Lesson[] = []
  let enrollments: Enrollment[] = []
  let students: Student[] = []

  if (courseIds.length > 0) {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, course_id, title, is_published')
      .in('course_id', courseIds)

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
        .select('id, full_name, email')
        .in('id', studentIds)
        .order('full_name', { ascending: true })

      students = (studentsData ?? []) as Student[]
    }
  }

  const totalPublishedCourses = courses.filter(
    (course) => course.is_published
  ).length

  const totalPublishedLessons = lessons.filter(
    (lesson) => lesson.is_published
  ).length

  function getCourseStats(courseId: number) {
    const courseLessons = lessons.filter((lesson) => lesson.course_id === courseId)
    const courseEnrollments = enrollments.filter(
      (enrollment) => enrollment.course_id === courseId
    )

    const uniqueStudents = new Set(
      courseEnrollments.map((enrollment) => enrollment.user_id)
    )

    return {
      lessons: courseLessons.length,
      publishedLessons: courseLessons.filter((lesson) => lesson.is_published)
        .length,
      students: uniqueStudents.size,
      enrollments: courseEnrollments.length,
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/teachers"
          className="text-sm font-medium text-blue-600 underline"
        >
          ← Back to teachers
        </Link>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Teacher Detail
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          {teacher.full_name || teacher.email || 'Teacher'}
        </h2>

        <p className="mt-2 text-slate-600">
          Teacher profile, owned courses, and student reach.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Courses</p>
          <p className="mt-2 text-3xl font-bold">{courses.length}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Published courses</p>
          <p className="mt-2 text-3xl font-bold">{totalPublishedCourses}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Published lessons</p>
          <p className="mt-2 text-3xl font-bold">{totalPublishedLessons}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Students</p>
          <p className="mt-2 text-3xl font-bold">{students.length}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900">Teacher profile</h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">Email</p>
            <p className="font-medium text-slate-900">{teacher.email || '—'}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500">GitHub</p>
            <p className="font-medium text-slate-900">
              {teacher.github_username || '—'}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Joined</p>
            <p className="font-medium text-slate-900">
              {teacher.created_at
                ? new Date(teacher.created_at).toLocaleDateString()
                : '—'}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Role</p>
            <p className="font-medium text-slate-900">{teacher.role}</p>
          </div>

          <div className="md:col-span-2">
            <p className="text-sm text-slate-500">Bio</p>
            <p className="text-slate-700">{teacher.bio || 'No bio added.'}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Owned courses</h3>
            <p className="mt-1 text-slate-600">
              Courses assigned to this teacher.
            </p>
          </div>

          <Link
            href="/admin/courses/new"
            className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
          >
            New course
          </Link>
        </div>

        {courses.length === 0 ? (
          <p className="mt-6 text-slate-700">No courses assigned yet.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {courses.map((course) => {
              const stats = getCourseStats(course.id)

              return (
                <div
                  key={course.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        {course.title}
                      </h4>

                      <p className="mt-1 text-sm text-slate-600">
                        {course.description || 'No description yet.'}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                        <span>Lessons: {stats.lessons}</span>
                        <span>Published lessons: {stats.publishedLessons}</span>
                        <span>Students: {stats.students}</span>
                        <span>{course.is_free ? 'Free' : 'Not free'}</span>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        course.is_published
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {course.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/admin/courses/${course.id}/edit`}
                      className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                    >
                      Edit course
                    </Link>

                    <Link
                      href={`/courses/${course.slug}`}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                    >
                      View public page
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900">Students reached</h3>

        {students.length === 0 ? (
          <p className="mt-4 text-slate-700">No students enrolled yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4">Name</th>
                  <th className="py-3 pr-4">Email</th>
                </tr>
              </thead>

              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      {student.full_name || '—'}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {student.email || '—'}
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