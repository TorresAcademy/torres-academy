import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'

type TeacherEditLessonPageProps = {
  params: Promise<{ id: string }>
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default async function TeacherEditLessonPage({
  params,
}: TeacherEditLessonPageProps) {
  const { id } = await params
  const { supabase, user, profile } = await requireTeacherOrAdmin()

  const lessonId = Number(id)

  if (!lessonId || Number.isNaN(lessonId)) {
    notFound()
  }

  const isAdmin = profile.role === 'admin'

  const { data: coursesData } = isAdmin
    ? await supabase
        .from('courses')
        .select('id, title')
        .order('title', { ascending: true })
    : await supabase
        .from('courses')
        .select('id, title')
        .eq('teacher_id', user.id)
        .order('title', { ascending: true })

  const courses = coursesData ?? []

  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('id, course_id, title, slug, content, video_url, position, is_published')
    .eq('id', lessonId)
    .maybeSingle()

  if (error || !lesson) {
    notFound()
  }

  const canEdit =
    isAdmin || courses.some((course) => course.id === lesson.course_id)

  if (!canEdit) {
    notFound()
  }

  async function updateLesson(formData: FormData) {
    'use server'

    const { supabase, user, profile } = await requireTeacherOrAdmin()
    const isAdmin = profile.role === 'admin'

    const courseId = Number(formData.get('course_id'))
    const title = String(formData.get('title') || '').trim()
    const slug = slugify(String(formData.get('slug') || title))
    const position = Number(formData.get('position') || 1)
    const videoUrl = String(formData.get('video_url') || '').trim()
    const content = String(formData.get('content') || '').trim()
    const isPublished = formData.get('is_published') === 'on'

    if (!courseId || !title || !slug || !position) {
      redirect(`/teacher/lessons/${lessonId}/edit`)
    }

    if (!isAdmin) {
      const { data: ownedCourse } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .maybeSingle()

      if (!ownedCourse) {
        redirect('/teacher/lessons')
      }
    }

    const { error } = await supabase
      .from('lessons')
      .update({
        course_id: courseId,
        title,
        slug,
        position,
        video_url: videoUrl || null,
        content,
        is_published: isPublished,
      })
      .eq('id', lessonId)

    if (error) {
      console.error(error)
      redirect(`/teacher/lessons/${lessonId}/edit`)
    }

    redirect('/teacher/lessons')
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/teacher/lessons"
          className="text-sm font-medium text-blue-600 underline"
        >
          ← Back to lessons
        </Link>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Lessons
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Edit lesson
        </h2>

        <p className="mt-2 text-slate-600">
          Update lesson content, order, and publishing status.
        </p>
      </div>

      <form
        action={updateLesson}
        className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Course
            </label>
            <select
              name="course_id"
              defaultValue={lesson.course_id}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Lesson title
            </label>
            <input
              name="title"
              type="text"
              defaultValue={lesson.title ?? ''}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Slug
            </label>
            <input
              name="slug"
              type="text"
              defaultValue={lesson.slug ?? ''}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Position
            </label>
            <input
              name="position"
              type="number"
              min="1"
              defaultValue={lesson.position ?? 1}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Video URL
            </label>
            <input
              name="video_url"
              type="text"
              defaultValue={lesson.video_url ?? ''}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Lesson content
            </label>
            <textarea
              name="content"
              rows={10}
              defaultValue={lesson.content ?? ''}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              name="is_published"
              type="checkbox"
              defaultChecked={lesson.is_published ?? false}
              className="h-4 w-4"
            />
            <div>
              <p className="font-medium text-slate-900">Published</p>
              <p className="text-sm text-slate-500">
                Make this lesson visible to students.
              </p>
            </div>
          </label>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Save changes
          </button>

          <Link
            href="/teacher/lessons"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}