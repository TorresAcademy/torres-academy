import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'

type TeacherEditLessonPageProps = {
  params: Promise<{ id: string }>
}

type Course = {
  id: number
  title: string
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
  const lessonId = Number(id)

  if (!lessonId || Number.isNaN(lessonId)) {
    notFound()
  }

  const { supabase, user, profile } = await requireTeacherOrAdmin()
  const isAdmin = profile.role === 'admin'

  const { data: lesson } = await supabase
    .from('lessons')
    .select(
      'id, course_id, title, slug, content, video_url, position, is_published, teacher_explanation, encouragement_title, encouragement_text, media_path, media_type'
    )
    .eq('id', lessonId)
    .maybeSingle()

  if (!lesson) {
    notFound()
  }

  const { data: lessonCourse } = await supabase
    .from('courses')
    .select('id, title, teacher_id')
    .eq('id', lesson.course_id)
    .maybeSingle()

  if (!lessonCourse) {
    notFound()
  }

  if (!isAdmin && lessonCourse.teacher_id !== user.id) {
    notFound()
  }

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

  const courses = (coursesData ?? []) as Course[]

  async function updateLesson(formData: FormData) {
    'use server'

    const { supabase, user, profile } = await requireTeacherOrAdmin()
    const isAdmin = profile.role === 'admin'

    const courseId = Number(formData.get('course_id'))
    const title = String(formData.get('title') || '').trim()
    const slugValue = String(formData.get('slug') || '').trim()
    const content = String(formData.get('content') || '').trim()
    const videoUrl = String(formData.get('video_url') || '').trim()
    const position = Number(formData.get('position') || 1)
    const isPublished = formData.get('is_published') === 'on'
    const teacherExplanation = String(
      formData.get('teacher_explanation') || ''
    ).trim()
    const encouragementTitle = String(
      formData.get('encouragement_title') || ''
    ).trim()
    const encouragementText = String(
      formData.get('encouragement_text') || ''
    ).trim()

    if (!courseId || !title) {
      redirect(`/teacher/lessons/${lessonId}/edit`)
    }

    const { data: targetCourse } = await supabase
      .from('courses')
      .select('id, teacher_id')
      .eq('id', courseId)
      .maybeSingle()

    if (!targetCourse) {
      redirect('/teacher/lessons')
    }

    if (!isAdmin && targetCourse.teacher_id !== user.id) {
      redirect('/teacher/lessons')
    }

    const { data: existingLesson } = await supabase
      .from('lessons')
      .select('id, course_id')
      .eq('id', lessonId)
      .maybeSingle()

    if (!existingLesson) {
      redirect('/teacher/lessons')
    }

    const cleanSlug = slugify(slugValue || title)

    await supabase
      .from('lessons')
      .update({
        course_id: courseId,
        title,
        slug: cleanSlug,
        content,
        video_url: videoUrl || null,
        position: position || 1,
        is_published: isPublished,
        teacher_explanation: teacherExplanation || null,
        encouragement_title: encouragementTitle || null,
        encouragement_text: encouragementText || null,
      })
      .eq('id', lessonId)

    revalidatePath('/teacher/lessons')
    revalidatePath(`/teacher/lessons/${lessonId}/edit`)
    revalidatePath(`/lessons/${cleanSlug}`)

    redirect(`/teacher/lessons/${lessonId}/edit`)
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
          Unified Lesson Editor
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Edit lesson
        </h2>

        <p className="mt-2 text-slate-600">
          Manage lesson content, teacher explanation, encouragement, media, and
          quizzes from one place.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <form
          action={updateLesson}
          className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <section>
            <h3 className="text-2xl font-bold text-slate-900">
              Lesson details
            </h3>

            <div className="mt-6 grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Course
                </label>

                <select
                  name="course_id"
                  defaultValue={lesson.course_id}
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
                  defaultValue={lesson.title}
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
                  defaultValue={lesson.slug}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Used in the URL, for example /lessons/{lesson.slug}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Lesson content
                </label>

                <textarea
                  name="content"
                  defaultValue={lesson.content ?? ''}
                  rows={12}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  placeholder="Write the main lesson content here..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Video URL
                </label>

                <input
                  name="video_url"
                  defaultValue={lesson.video_url ?? ''}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  placeholder="Optional old video URL. Protected media is managed separately."
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
            <h3 className="text-2xl font-bold text-slate-900">
              Teacher explanation
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              This appears below the lesson content for students. Use it for
              extra explanation, common mistakes, reminders, examples, or
              clarification.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Explanation from teacher
              </label>

              <textarea
                name="teacher_explanation"
                defaultValue={lesson.teacher_explanation ?? ''}
                rows={6}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                placeholder="Example: Remember that the key idea in this lesson is..."
              />
            </div>
          </section>

          <section className="rounded-3xl border border-amber-100 bg-amber-50 p-6">
            <h3 className="text-2xl font-bold text-slate-900">
              Encouragement note
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              This is the highlighted encouragement box students see under the
              teacher explanation.
            </p>

            <div className="mt-5 grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Encouragement title
                </label>

                <input
                  name="encouragement_title"
                  defaultValue={lesson.encouragement_title ?? ''}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  placeholder="Teaching note"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Encouragement message
                </label>

                <textarea
                  name="encouragement_text"
                  defaultValue={lesson.encouragement_text ?? ''}
                  rows={5}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  placeholder="Example: You are doing well. Review the key vocabulary before moving on..."
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-2xl font-bold text-slate-900">
              Publishing
            </h3>

            <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <input
                name="is_published"
                type="checkbox"
                defaultChecked={Boolean(lesson.is_published)}
                className="h-4 w-4"
              />

              <div>
                <p className="font-medium text-slate-900">Published</p>
                <p className="text-sm text-slate-500">
                  Students can only access published lessons.
                </p>
              </div>
            </label>
          </section>

          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Save lesson
          </button>
        </form>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">
              Lesson tools
            </h3>

            <div className="mt-5 grid gap-3">
              <Link
                href={`/teacher/lessons/${lesson.id}/media`}
                className="rounded-xl bg-slate-900 px-4 py-3 text-center font-semibold text-white transition hover:bg-slate-800"
              >
                Manage media
              </Link>

              <Link
                href={`/teacher/lessons/${lesson.id}/quiz`}
                className="rounded-xl bg-purple-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-purple-700"
              >
                Quiz Builder
              </Link>

              <Link
                href={`/lessons/${lesson.slug}`}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
              >
                Preview lesson
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">
              Media status
            </h3>

            <p className="mt-3 text-sm text-slate-600">
              {lesson.media_path
                ? lesson.media_type === 'video'
                  ? 'This lesson has a protected video uploaded.'
                  : 'This lesson has a protected image uploaded.'
                : 'No protected media uploaded yet.'}
            </p>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
            <h3 className="text-xl font-bold text-slate-900">
              Student view
            </h3>

            <p className="mt-3 text-sm leading-7 text-slate-700">
              The teacher explanation and encouragement note will appear inside
              the student lesson page under the learning screen.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}