import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'
import CourseModuleSelect from '@/components/teacher/course-module-select'

type Course = {
  id: number
  title: string
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

export default async function NewTeacherLessonPage() {
  const { supabase, user, profile } = await requireTeacherOrAdmin()
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

  async function createLesson(formData: FormData) {
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
      redirect('/teacher/lessons/new')
    }

    const { data: targetCourse } = await supabase
      .from('courses')
      .select('id, teacher_id')
      .eq('id', courseId)
      .maybeSingle()

    if (!targetCourse) {
      redirect('/teacher/lessons/new')
    }

    if (!isAdmin && targetCourse.teacher_id !== user.id) {
      redirect('/teacher/lessons')
    }

    if (moduleId) {
      const { data: targetModule } = await supabase
        .from('course_modules')
        .select('id, course_id')
        .eq('id', moduleId)
        .maybeSingle()

      if (!targetModule || targetModule.course_id !== courseId) {
        redirect('/teacher/lessons/new')
      }
    }

    const cleanSlug = slugify(slugValue || title)

    const { data: createdLesson } = await supabase
      .from('lessons')
      .insert({
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
      .select('id')
      .single()

    if (!createdLesson) {
      redirect('/teacher/lessons')
    }

    redirect(`/teacher/lessons/${createdLesson.id}/edit`)
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
          Create lesson
        </h2>

        <p className="mt-2 text-slate-600">
          Create the lesson first, choose its course and module, then add media
          and quizzes from the lesson editor.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-700">
            You need at least one assigned course before creating lessons.
          </p>

          <Link
            href="/teacher/courses"
            className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Go to courses
          </Link>
        </div>
      ) : (
        <form
          action={createLesson}
          className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <section>
            <h3 className="text-2xl font-bold text-slate-900">
              Lesson details
            </h3>

            <div className="mt-6 grid gap-5">
              <CourseModuleSelect courses={courses} modules={modules} />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Lesson title
                </label>

                <input
                  name="title"
                  required
                  placeholder="Lesson 1: Introduce Yourself"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Slug
                </label>

                <input
                  name="slug"
                  placeholder="introduce-yourself"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Leave blank to create one from the title.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Lesson content
                </label>

                <textarea
                  name="content"
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
                  placeholder="Optional old video URL. Protected media is managed separately."
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
                  defaultValue="1"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
            <h3 className="text-2xl font-bold text-slate-900">
              Teacher explanation
            </h3>

            <textarea
              name="teacher_explanation"
              rows={6}
              className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
              placeholder="Add extra explanation, common mistakes, examples, or guidance..."
            />
          </section>

          <section className="rounded-3xl border border-amber-100 bg-amber-50 p-6">
            <h3 className="text-2xl font-bold text-slate-900">
              Encouragement note
            </h3>

            <div className="mt-5 grid gap-5">
              <input
                name="encouragement_title"
                placeholder="Teaching note"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
              />

              <textarea
                name="encouragement_text"
                rows={5}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                placeholder="Encourage students, give reminders, or guide their next step..."
              />
            </div>
          </section>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <input name="is_published" type="checkbox" className="h-4 w-4" />

            <div>
              <p className="font-medium text-slate-900">Published</p>
              <p className="text-sm text-slate-500">
                Students can only access published lessons.
              </p>
            </div>
          </label>

          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Create lesson
          </button>
        </form>
      )}
    </div>
  )
}