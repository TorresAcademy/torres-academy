// src/app/teacher/lessons/new/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  BookOpen,
  FileText,
  MessageSquareMore,
  PlusCircle,
  Sparkles,
  Video,
} from 'lucide-react'
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

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
          {icon}
        </div>

        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  )
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
  icon: React.ReactNode
  children: React.ReactNode
  tone?: 'white' | 'amber' | 'slate'
}) {
  const toneClasses = {
    white: 'border-slate-200 bg-white',
    amber: 'border-amber-200 bg-amber-50',
    slate: 'border-slate-200 bg-slate-50',
  } as const

  return (
    <section className={`rounded-[2rem] border p-6 shadow-sm ${toneClasses[tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
          {description && (
            <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
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
              Create lesson
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Create the lesson first, choose its course and module, then add media
              and quizzes from the lesson editor.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-black">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  Premium lesson builder
                </p>
                <p className="text-sm text-slate-300">
                  Structure learning content with clarity and flow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {courses.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-700">
            You need at least one assigned course before creating lessons.
          </p>

          <Link
            href="/teacher/courses"
            className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-3 font-semibold text-amber-300 transition hover:bg-black"
          >
            Go to courses
          </Link>
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              title="Lesson structure"
              description="Choose the course and module, add the lesson title, content, and position."
              icon={<BookOpen className="h-5 w-5" />}
            />
            <FeatureCard
              title="Teacher guidance"
              description="Add explanation notes, examples, and reminders that support live teaching."
              icon={<MessageSquareMore className="h-5 w-5" />}
            />
            <FeatureCard
              title="Next editing step"
              description="After creating the lesson, continue to the editor for media, quiz, and submission setup."
              icon={<PlusCircle className="h-5 w-5" />}
            />
          </section>

          <form action={createLesson} className="space-y-6">
            <SectionCard
              title="Lesson details"
              description="Choose where this lesson belongs and define the main learning content."
              icon={<BookOpen className="h-5 w-5" />}
            >
              <div className="grid gap-5">
                <CourseModuleSelect courses={courses} modules={modules} />

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Lesson title
                  </label>

                  <input
                    name="title"
                    required
                    placeholder="Lesson 1: Introduce Yourself"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Slug
                  </label>

                  <input
                    name="slug"
                    placeholder="introduce-yourself"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
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
                    placeholder="Optional old video URL. Protected media is managed separately."
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Teacher explanation"
              description="Add extra explanation, common mistakes, examples, or live-teaching guidance."
              icon={<FileText className="h-5 w-5" />}
              tone="slate"
            >
              <textarea
                name="teacher_explanation"
                rows={6}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
                placeholder="Add extra explanation, common mistakes, examples, or guidance..."
              />
            </SectionCard>

            <SectionCard
              title="Encouragement note"
              description="Add a motivation block, reminder, or next-step message for the student."
              icon={<Sparkles className="h-5 w-5" />}
              tone="amber"
            >
              <div className="grid gap-5">
                <input
                  name="encouragement_title"
                  placeholder="Teaching note"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
                />

                <textarea
                  name="encouragement_text"
                  rows={5}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
                  placeholder="Encourage students, give reminders, or guide their next step..."
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Publishing"
              description="Choose whether this lesson should be student-visible immediately."
              icon={<Video className="h-5 w-5" />}
            >
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input name="is_published" type="checkbox" className="h-4 w-4" />

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
                    Ready to create this lesson?
                  </p>
                  <p className="text-sm text-slate-500">
                    After saving, you will be taken to the lesson editor for media,
                    quizzes, and submission tasks.
                  </p>
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-amber-300 transition hover:bg-black"
                >
                  Create lesson
                </button>
              </div>
            </section>
          </form>
        </>
      )}
    </div>
  )
}