import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'
import { dir } from 'console'

export default async function TeacherHomePage() {
  const { supabase, user, profile } = await requireTeacherOrAdmin()

  const isAdmin = profile.role === 'admin'

  const coursesQuery = supabase
    .from('courses')
    .select('id', { count: 'exact', head: true })

  const lessonsQuery = supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })

  const enrollmentsQuery = supabase
    .from('enrollments')
    .select('id', { count: 'exact', head: true })

  const progressQuery = supabase
    .from('lesson_progress')
    .select('id', { count: 'exact', head: true })
    .eq('completed', true)

  const [
    courseCountResult,
    lessonCountResult,
    enrollmentCountResult,
    progressCountResult,
  ] = await Promise.all(
    isAdmin
      ? [coursesQuery, lessonsQuery, enrollmentsQuery, progressQuery]
      : [
          supabase
            .from('courses')
            .select('id', { count: 'exact', head: true })
            .eq('teacher_id', user.id),
          supabase
            .from('lessons')
            .select('id, course_id')
            .in(
              'course_id',
              (
                await supabase
                  .from('courses')
                  .select('id')
                  .eq('teacher_id', user.id)
              ).data?.map((c) => c.id) || [-1]
            ),
          supabase
            .from('enrollments')
            .select('id, course_id')
            .in(
              'course_id',
              (
                await supabase
                  .from('courses')
                  .select('id')
                  .eq('teacher_id', user.id)
              ).data?.map((c) => c.id) || [-1]
            ),
          supabase
            .from('lesson_progress')
            .select('id, lesson_id')
            .in(
              'lesson_id',
              (
                await supabase
                  .from('lessons')
                  .select('id, course_id')
                  .in(
                    'course_id',
                    (
                      await supabase
                        .from('courses')
                        .select('id')
                        .eq('teacher_id', user.id)
                    ).data?.map((c) => c.id) || [-1]
                  )
              ).data?.map((l) => l.id) || [-1]
            )
            .eq('completed', true),
        ]
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Teacher Hub
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Welcome, {profile.full_name || profile.email}
        </h2>
        <p className="mt-2 text-slate-600">
          Manage your courses, lessons, and students from here.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Courses</p>
          <p className="mt-2 text-3xl font-bold">{courseCountResult.count ?? 0}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Lessons</p>
          <p className="mt-2 text-3xl font-bold">{lessonCountResult.count ?? 0}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Enrollments</p>
          <p className="mt-2 text-3xl font-bold">{enrollmentCountResult.count ?? 0}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Completed lessons</p>
          <p className="mt-2 text-3xl font-bold">{progressCountResult.count ?? 0}</p>
        </div>
      </div>
    </div>
  )
}dir