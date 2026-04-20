// src/app/teacher/courses/[id]/edit/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import TeacherCourseForm from '@/components/teacher/teacher-course-form'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'

type TeacherEditCoursePageProps = {
  params: Promise<{ id: string }>
}

type Lesson = {
  id: number
  title: string
  slug: string
  position: number
  is_published: boolean | null
}

export default async function TeacherEditCoursePage({
  params,
}: TeacherEditCoursePageProps) {
  const { id } = await params
  const { supabase, user } = await requireTeacherOrAdmin()

  const courseId = Number(id)

  if (!courseId || Number.isNaN(courseId)) {
    notFound()
  }

  const { data: course, error } = await supabase
    .from('courses')
    .select('id, title, slug, description, is_free, is_published')
    .eq('id', courseId)
    .single()

  if (error || !course) {
    notFound()
  }

  const { data: lessonsData } = await supabase
    .from('lessons')
    .select('id, title, slug, position, is_published')
    .eq('course_id', courseId)
    .order('position', { ascending: true })

  const lessons = (lessonsData ?? []) as Lesson[]

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Courses
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Edit course
        </h2>
        <p className="mt-2 text-slate-600">
          Update your course details and lesson structure.
        </p>
      </div>

      <TeacherCourseForm
        mode="edit"
        ownerId={user.id}
        courseId={course.id}
        initialValues={{
          title: course.title ?? '',
          slug: course.slug ?? '',
          description: course.description ?? '',
          is_free: course.is_free ?? true,
          is_published: course.is_published ?? false,
        }}
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Course lessons</h3>
            <p className="mt-2 text-slate-600">
              Manage the lessons inside this course.
            </p>
          </div>

          <Link
            href="/teacher/lessons/new"
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            New lesson
          </Link>
        </div>

        {lessons.length === 0 ? (
          <p className="mt-6 text-slate-700">No lessons yet for this course.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
              >
                <div>
                  <p className="text-sm text-slate-500">Position {lesson.position}</p>
                  <h4 className="font-semibold text-slate-900">{lesson.title}</h4>
                  <p className="mt-1 text-sm text-slate-600">{lesson.slug}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      lesson.is_published
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {lesson.is_published ? 'Published' : 'Draft'}
                  </span>

                  <Link
                    href={`/teacher/lessons/${lesson.id}/edit`}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    Edit lesson
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}