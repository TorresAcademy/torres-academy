// src/app/teacher/lessons/[id]/edit/page.tsx
import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  BookOpen,
  Eye,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  MessageSquareMore,
  MonitorPlay,
  Sparkles,
  Video,
} from 'lucide-react'
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

type LessonRecord = {
  id: number
  course_id: number
  module_id: number | null
  title: string
  slug: string
  content: string | null
  video_url: string | null
  position: number | null
  is_published: boolean | null
  teacher_explanation: string | null
  encouragement_title: string | null
  encouragement_text: string | null
  media_path: string | null
  media_type: string | null
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function SectionCard({
  title,
  description,
  icon,
  children,
  tone = 'white',
}: {
  title: string
  description?: string
  icon: ReactNode
  children: ReactNode
  tone?: 'white' | 'amber' | 'slate'
}) {
  const tones = {
    white: 'border-slate-200 bg-white',
    amber: 'border-amber-200 bg-amber-50',
    slate: 'border-slate-200 bg-slate-50',
  } as const

  return (
    <section className={`rounded-[2rem] border p-6 shadow-sm ${tones[tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
          {description && (
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {description}
            </p>
          )}
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
          {icon}
        </div>
      </div>

      <div className="mt-6">{children}</div>
    </section>
  )
}

function ToolButton({
  href,
  label,
  tone = 'default',
}: {
  href: string
  label: string
  tone?: 'default' | 'dark' | 'emerald' | 'amber'
}) {
  const tones = {
    default:
      'border border-slate-300 bg-white text-slate-900 hover:border-amber-400 hover:text-amber-700',
    dark: 'bg-slate-900 text-amber-300 hover:bg-black',
    emerald: 'bg-emerald-600 text-white hover:bg-emerald-700',
    amber: 'bg-amber-400 text-black hover:bg-amber-300',
  } as const

  return (
    <Link
      href={href}
      className={`rounded-xl px-4 py-3 text-center font-semibold transition ${tones[tone]}`}
    >
      {label}
    </Link>
  )
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

  const { data: lessonData } = await supabase
    .from('lessons')
    .select(
      'id, course_id, module_id, title, slug, content, video_url, position, is_published, teacher_explanation, encouragement_title, encouragement_text, media_path, media_type'
    )
    .eq('id', lessonId)
    .maybeSingle()

  if (!lessonData) {
    notFound()
  }

  const lesson: LessonRecord = {
    id: Number(lessonData.id),
    course_id: Number(lessonData.course_id),
    module_id:
      lessonData.module_id === null || lessonData.module_id === undefined
        ? null
        : Number(lessonData.module_id),
    title: lessonData.title,
    slug: lessonData.slug,
    content: lessonData.content,
    video_url: lessonData.video_url,
    position: lessonData.position,
    is_published: lessonData.is_published,
    teacher_explanation: lessonData.teacher_explanation,
    encouragement_title: lessonData.encouragement_title,
    encouragement_text: lessonData.encouragement_text,
    media_path: lessonData.media_path,
    media_type: lessonData.media_type,
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

  const courses: Course[] = (coursesData ?? []).map((course) => ({
    id: Number(course.id),
    title: course.title,
    slug: course.slug,
  }))

  const courseIds = courses.map((course) => course.id)

  let modules: Module[] = []

  if (courseIds.length > 0) {
    const { data: modulesData } = await supabase
      .from('course_modules')
      .select('id, course_id, title, position, is_published')
      .in('course_id', courseIds)
      .order('course_id', { ascending: true })
      .order('position', { ascending: true })

    modules = (modulesData ?? []).map((module) => ({
      id: Number(module.id),
      course_id: Number(module.course_id),
      title: module.title,
      position: module.position,
      is_published: module.is_published,
    }))
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

    if (!courseId || Number.isNaN(courseId) || !title) {
      redirect(`/teacher/lessons/${lessonId}/edit`)
    }

    if (moduleId !== null && Number.isNaN(moduleId)) {
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

      if (!targetModule || Number(targetModule.course_id) !== courseId) {
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

  const assignedModule = modules.find((module) => module.id === lesson.module_id)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/teacher/lessons"
          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
        >
          ← Back to lessons
        </Link>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              Unified Lesson Editor
            </p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Edit lesson
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Manage lesson content, module assignment, teacher explanation,
              encouragement, media, quizzes, and presentation-ready teaching notes.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-black">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  Premium lesson editor
                </p>
                <p className="text-sm text-slate-300">
                  Teaching content, presentation notes, and lesson tools.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form action={updateLesson} className="space-y-6">
          <SectionCard
            title="Lesson details"
            description="Edit where this lesson belongs and manage the main learning content."
            icon={<BookOpen className="h-5 w-5" />}
          >
            <div className="grid gap-5">
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Teacher explanation"
            description="This appears in the lesson page and also in Presentation View. Use it for speaking notes, clarification, examples, or classroom teaching prompts."
            icon={<FileText className="h-5 w-5" />}
            tone="slate"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Explanation from teacher
              </label>

              <textarea
                name="teacher_explanation"
                defaultValue={lesson.teacher_explanation ?? ''}
                rows={6}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
                placeholder="Example: Start by asking students what they notice before reading the dialogue..."
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Encouragement note"
            description="This is the highlighted teaching note shown under the explanation. It also appears in Presentation View."
            icon={<MessageSquareMore className="h-5 w-5" />}
            tone="amber"
          >
            <div className="grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Encouragement title
                </label>

                <input
                  name="encouragement_title"
                  defaultValue={lesson.encouragement_title ?? ''}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
                  placeholder="Example: Encourage students to repeat the dialogue aloud in pairs..."
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Publishing"
            description="Choose whether this lesson should be student-visible immediately."
            icon={<Eye className="h-5 w-5" />}
          >
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
          </SectionCard>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">
                  Ready to save this lesson?
                </p>
                <p className="text-sm text-slate-500">
                  Changes will update the lesson page, course page, and presentation view.
                </p>
              </div>

              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-amber-300 transition hover:bg-black"
              >
                Save lesson
              </button>
            </div>
          </section>
        </form>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">Lesson tools</h3>

            <div className="mt-5 grid gap-3">
              <ToolButton
                href={`/teacher/lessons/${lesson.id}/media`}
                label="Manage media"
                tone="dark"
              />

              <ToolButton
                href={`/teacher/lessons/${lesson.id}/quiz`}
                label="Quiz Builder"
                tone="amber"
              />

              <ToolButton
                href={`/teacher/lessons/${lesson.id}/submissions`}
                label="Submission tasks"
                tone="emerald"
              />

              <ToolButton
                href={`/lessons/${lesson.slug}`}
                label="Preview lesson"
              />

              <ToolButton
                href={`/lessons/${lesson.slug}/presentation`}
                label="Presentation View"
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">Media status</h3>

            <div className="mt-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
                {lesson.media_path ? (
                  lesson.media_type === 'video' ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )
                ) : (
                  <FolderOpen className="h-4 w-4" />
                )}
              </div>

              <p className="text-sm leading-7 text-slate-600">
                {lesson.media_path
                  ? lesson.media_type === 'video'
                    ? 'This lesson has a protected video uploaded.'
                    : 'This lesson has a protected image uploaded.'
                  : 'No protected media uploaded yet.'}
              </p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">Module status</h3>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              {lesson.module_id
                ? `This lesson is currently assigned to ${assignedModule?.title || 'a module'}.`
                : 'This lesson is not assigned to any module yet.'}
            </p>
          </section>

          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
                <MonitorPlay className="h-4 w-4" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Presentation mode
              </h3>
            </div>

            <p className="mt-3 text-sm leading-7 text-slate-700">
              Presentation View is designed for projector, tutoring, and
              full-screen teaching. It shows the lesson content with the teacher
              explanation and teaching note beside it.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
