import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'
import CourseModuleSelect from '@/components/teacher/course-module-select'

type TeacherEditLessonPageProps = {
  params: Promise<{ id: string }>
}

type Course = {
  id: number
  title: string
  slug: string
}

type Module = {
  id: number
  course_id: number
  title: string
  position: number
  is_published: boolean
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
      'id, course_id, module_id, title, slug, content, video_url, position, is_published, teacher_explanation, encouragement_title, encouragement_text, media_path, media_type'
    )
    .eq('id', lessonId)
    .maybeSingle()

  if (!lesson) {
    notFound()
  }

  const { data: lessonCourse } = await supabase
    .from('courses')
    .select('id, title, slug, teacher_id')
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
        .select('id, title, slug')
        .order('title', { ascending: true })
    : await supabase
        .from('courses')
        .select('id, title, slug')
        .eq('teacher_id', user.id)
        .order('title', { ascending: true })

  const courses = (coursesData ?? []) as Course[]
  const courseIds = courses.map((course) => course.id)

  let modules: Module[] = []

  if (courseIds.length > 0) {
    const { data: modulesData } = await supabase
      .from('course_modules')
      .select('id, course_id, title, position, is_published')
      .in('course_id', courseIds)
      .order('course_id', { ascending: true })
      .order('position', { ascending: true })

    modules = (modulesData ?? []) as Module[]
  }

  async function updateLesson(formData: FormData) {
    'use server'

    const { supabase, user, profile } = await requireTeacherOrAdmin()
    const isAdmin = profile.role === 'admin'

    const courseId = Number(formData.get('course_id'))
    const moduleIdRaw = String(formData.get('module_id') || '').trim()
    const moduleId = moduleIdRaw ? Number(moduleIdRaw) : null

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
      .select('id, slug, teacher_id')
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
      .select('id, course_id, slug')
      .eq('id', lessonId)
      .maybeSingle()

    if (!existingLesson) {
      redirect('/teacher/lessons')
    }

    const { data: oldCourse } = await supabase
      .from('courses')
      .select('id, slug')
      .eq('id', existingLesson.course_id)
      .maybeSingle()

    if (moduleId) {
      const { data: targetModule } = await supabase
        .from('course_modules')
        .select('id, course_id')
        .eq('id', moduleId)
        .maybeSingle()

      if (!targetModule || targetModule.course_id !== courseId) {
        redirect(`/teacher/lessons/${lessonId}/edit`)
      }
    }

    const cleanSlug = slugify(slugValue || title)

    await supabase
      .from('lessons')
      .update({
        course_id: courseId,
        module_id: moduleId,
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
    revalidatePath(`/teacher/courses/${courseId}/edit`)
    revalidatePath(`/lessons/${cleanSlug}`)
    revalidatePath(`/lessons/${cleanSlug}/presentation`)

    if (existingLesson.slug && existingLesson.slug !== cleanSlug) {
      revalidatePath(`/lessons/${existingLesson.slug}`)
      revalidatePath(`/lessons/${existingLesson.slug}/presentation`)
    }

    if (targetCourse.slug) {
      revalidatePath(`/courses/${targetCourse.slug}`)
    }

    if (oldCourse?.slug && oldCourse.slug !== targetCourse.slug) {
      revalidatePath(`/courses/${oldCourse.slug}`)
    }

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
          Manage lesson content, module assignment, teacher explanation,
          encouragement, media, quizzes, and presentation-ready teaching notes.
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
              <CourseModuleSelect
                courses={courses}
                modules={modules}
                defaultCourseId={lesson.course_id}
                defaultModuleId={lesson.module_id}
              />

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
              This appears in the lesson page and also in Presentation View. Use
              it for speaking notes, clarification, examples, or classroom
              teaching prompts.
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
                placeholder="Example: Start by asking students what they notice before reading the dialogue..."
              />
            </div>
          </section>

          <section className="rounded-3xl border border-amber-100 bg-amber-50 p-6">
            <h3 className="text-2xl font-bold text-slate-900">
              Encouragement note
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              This is the highlighted teaching note shown under the explanation.
              It also appears in Presentation View.
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
                  placeholder="Example: Encourage students to repeat the dialogue aloud in pairs..."
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
                href={`/teacher/lessons/${lesson.id}/submissions`}
                className="rounded-xl bg-emerald-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-emerald-700"
              >
                Submission tasks
              </Link>

              <Link
                href={`/lessons/${lesson.slug}`}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
              >
                Preview lesson
              </Link>

              <Link
                href={`/lessons/${lesson.slug}/presentation`}
                className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-center font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Presentation View
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

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">
              Module status
            </h3>

            <p className="mt-3 text-sm text-slate-600">
              {lesson.module_id
                ? 'This lesson is currently assigned to a module.'
                : 'This lesson is not assigned to any module yet.'}
            </p>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
            <h3 className="text-xl font-bold text-slate-900">
              Presentation mode
            </h3>

            <p className="mt-3 text-sm leading-7 text-slate-700">
              Presentation View is designed for projector, tutoring, and
              full-screen teaching. It shows the lesson content with the teacher
              explanation and teaching note beside it.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}