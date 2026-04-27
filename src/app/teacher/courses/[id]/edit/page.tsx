// src/app/teacher/courses/[id]/edit/page.tsx
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  BookOpen,
  CalendarDays,
  Eye,
  FolderOpen,
  Pencil,
  PlusCircle,
  Sparkles,
  Trash2,
} from 'lucide-react'
import TeacherCourseForm from '@/components/teacher/teacher-course-form'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'

type TeacherEditCoursePageProps = {
  params: Promise<{ id: string }>
}

type Lesson = {
  id: string | number
  title: string
  slug: string
  position: number
  is_published: boolean | null
  module_id: string | number | null
}

type CourseStatus = 'draft' | 'published' | 'archived'

type Module = {
  id: string | number
  course_id: string | number
  title: string
  description: string | null
  position: number
  is_published: boolean
  release_at: string | null
  due_at: string | null
}

function normalizeStatus(
  status: string | null,
  isPublished: boolean | null
): CourseStatus {
  if (status === 'published' || status === 'archived' || status === 'draft') {
    return status
  }

  return isPublished ? 'published' : 'draft'
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  const localDate = new Date(date.getTime() - offsetMs)

  return localDate.toISOString().slice(0, 16)
}

function formatDate(value?: string | null) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string
  value: number | string
  note?: string
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  )
}

export default async function TeacherEditCoursePage({
  params,
}: TeacherEditCoursePageProps) {
  const { id } = await params
  const { supabase, user, profile } = await requireTeacherOrAdmin()
  const isAdmin = profile.role === 'admin'

  // IMPORTANT:
  // Keep the route param as a string. This prevents false 404s when Supabase IDs
  // are UUID/text values. Supabase can still compare numeric IDs from a string URL.
  const courseId = String(id || '').trim()

  if (!courseId) {
    notFound()
  }

  const { data: course, error } = await supabase
    .from('courses')
    .select(
      'id, title, slug, description, is_free, is_published, status, enrollment_opens_at, enrollment_closes_at, course_starts_at, course_ends_at, recommended_duration_label, teacher_id'
    )
    .eq('id', courseId)
    .single()

  if (error || !course) {
    notFound()
  }

  if (!isAdmin && course.teacher_id !== user.id) {
    notFound()
  }

  const { data: modulesData } = await supabase
    .from('course_modules')
    .select(
      'id, course_id, title, description, position, is_published, release_at, due_at'
    )
    .eq('course_id', courseId)
    .order('position', { ascending: true })
    .order('id', { ascending: true })

  const modules = (modulesData ?? []) as Module[]

  const { data: lessonsData } = await supabase
    .from('lessons')
    .select('id, title, slug, position, is_published, module_id')
    .eq('course_id', courseId)
    .order('position', { ascending: true })

  const lessons = (lessonsData ?? []) as Lesson[]

  async function createModule(formData: FormData) {
    'use server'

    const { supabase, user, profile } = await requireTeacherOrAdmin()
    const isAdmin = profile.role === 'admin'

    const title = String(formData.get('title') || '').trim()
    const description = String(formData.get('description') || '').trim()
    const position = Number(formData.get('position') || 1)
    const isPublished = formData.get('is_published') === 'on'
    const releaseAtRaw = String(formData.get('release_at') || '').trim()
    const dueAtRaw = String(formData.get('due_at') || '').trim()

    if (!title) {
      redirect(`/teacher/courses/${courseId}/edit`)
    }

    const { data: courseCheck } = await supabase
      .from('courses')
      .select('id, slug, teacher_id')
      .eq('id', courseId)
      .maybeSingle()

    if (!courseCheck) {
      redirect('/teacher/courses')
    }

    if (!isAdmin && courseCheck.teacher_id !== user.id) {
      redirect('/teacher/courses')
    }

    const releaseAt = releaseAtRaw ? new Date(releaseAtRaw).toISOString() : null
    const dueAt = dueAtRaw ? new Date(dueAtRaw).toISOString() : null

    if (releaseAt && dueAt && releaseAt > dueAt) {
      redirect(`/teacher/courses/${courseId}/edit`)
    }

    await supabase.from('course_modules').insert({
      course_id: courseCheck.id,
      title,
      description: description || null,
      position: position || 1,
      is_published: isPublished,
      release_at: releaseAt,
      due_at: dueAt,
      updated_at: new Date().toISOString(),
    })

    revalidatePath(`/teacher/courses/${courseCheck.id}/edit`)
    revalidatePath(`/courses/${courseCheck.slug}`)
    redirect(`/teacher/courses/${courseCheck.id}/edit`)
  }

  async function updateModule(formData: FormData) {
    'use server'

    const { supabase, user, profile } = await requireTeacherOrAdmin()
    const isAdmin = profile.role === 'admin'

    const moduleId = String(formData.get('module_id') || '').trim()
    const title = String(formData.get('title') || '').trim()
    const description = String(formData.get('description') || '').trim()
    const position = Number(formData.get('position') || 1)
    const isPublished = formData.get('is_published') === 'on'
    const releaseAtRaw = String(formData.get('release_at') || '').trim()
    const dueAtRaw = String(formData.get('due_at') || '').trim()

    if (!moduleId || !title) {
      redirect(`/teacher/courses/${courseId}/edit`)
    }

    const { data: moduleRow } = await supabase
      .from('course_modules')
      .select('id, course_id')
      .eq('id', moduleId)
      .maybeSingle()

    if (!moduleRow) {
      redirect(`/teacher/courses/${courseId}/edit`)
    }

    const { data: courseCheck } = await supabase
      .from('courses')
      .select('id, slug, teacher_id')
      .eq('id', moduleRow.course_id)
      .maybeSingle()

    if (!courseCheck) {
      redirect('/teacher/courses')
    }

    if (!isAdmin && courseCheck.teacher_id !== user.id) {
      redirect('/teacher/courses')
    }

    const releaseAt = releaseAtRaw ? new Date(releaseAtRaw).toISOString() : null
    const dueAt = dueAtRaw ? new Date(dueAtRaw).toISOString() : null

    if (releaseAt && dueAt && releaseAt > dueAt) {
      redirect(`/teacher/courses/${courseCheck.id}/edit`)
    }

    await supabase
      .from('course_modules')
      .update({
        title,
        description: description || null,
        position: position || 1,
        is_published: isPublished,
        release_at: releaseAt,
        due_at: dueAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', moduleId)

    revalidatePath(`/teacher/courses/${courseCheck.id}/edit`)
    revalidatePath(`/courses/${courseCheck.slug}`)
    redirect(`/teacher/courses/${courseCheck.id}/edit`)
  }

  async function toggleModulePublished(formData: FormData) {
    'use server'

    const { supabase, user, profile } = await requireTeacherOrAdmin()
    const isAdmin = profile.role === 'admin'

    const moduleId = String(formData.get('module_id') || '').trim()
    const nextPublished = formData.get('next_published') === 'true'

    if (!moduleId) return

    const { data: moduleRow } = await supabase
      .from('course_modules')
      .select('id, course_id')
      .eq('id', moduleId)
      .maybeSingle()

    if (!moduleRow) return

    const { data: courseCheck } = await supabase
      .from('courses')
      .select('id, slug, teacher_id')
      .eq('id', moduleRow.course_id)
      .maybeSingle()

    if (!courseCheck) return

    if (!isAdmin && courseCheck.teacher_id !== user.id) {
      return
    }

    await supabase
      .from('course_modules')
      .update({
        is_published: nextPublished,
        updated_at: new Date().toISOString(),
      })
      .eq('id', moduleId)

    revalidatePath(`/teacher/courses/${courseCheck.id}/edit`)
    revalidatePath(`/courses/${courseCheck.slug}`)
  }

  async function deleteModule(formData: FormData) {
    'use server'

    const { supabase, user, profile } = await requireTeacherOrAdmin()
    const isAdmin = profile.role === 'admin'

    const moduleId = String(formData.get('module_id') || '').trim()

    if (!moduleId) return

    const { data: moduleRow } = await supabase
      .from('course_modules')
      .select('id, course_id')
      .eq('id', moduleId)
      .maybeSingle()

    if (!moduleRow) return

    const { data: courseCheck } = await supabase
      .from('courses')
      .select('id, slug, teacher_id')
      .eq('id', moduleRow.course_id)
      .maybeSingle()

    if (!courseCheck) return

    if (!isAdmin && courseCheck.teacher_id !== user.id) {
      return
    }

    await supabase.from('course_modules').delete().eq('id', moduleId)

    revalidatePath(`/teacher/courses/${courseCheck.id}/edit`)
    revalidatePath(`/courses/${courseCheck.slug}`)
  }

  const publishedLessonsCount = lessons.filter((lesson) => lesson.is_published).length
  const publishedModulesCount = modules.filter((module) => module.is_published).length

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              Courses
            </p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Edit course
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Update course details, lifecycle, seasonal dates, pacing modules,
              and lesson structure inside the premium teacher workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-black">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Premium course editor
                  </p>
                  <p className="text-sm text-slate-300">
                    Structure, pace, and refine your course.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href={`/courses/${course.slug}`}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10 hover:text-amber-300"
            >
              <Eye className="h-4 w-4" />
              View public page
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Modules" value={modules.length} />
        <MetricCard label="Published modules" value={publishedModulesCount} />
        <MetricCard label="Lessons" value={lessons.length} />
        <MetricCard
          label="Published lessons"
          value={publishedLessonsCount}
          note={`Course slug: ${course.slug}`}
        />
      </section>

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
          status: normalizeStatus(course.status, course.is_published),
          enrollment_opens_at: course.enrollment_opens_at ?? null,
          enrollment_closes_at: course.enrollment_closes_at ?? null,
          course_starts_at: course.course_starts_at ?? null,
          course_ends_at: course.course_ends_at ?? null,
          recommended_duration_label:
            course.recommended_duration_label ?? '',
        }}
      />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Course modules</h3>
            <p className="mt-2 text-slate-600">
              Organize lessons into modules and add pacing with release and due
              dates.
            </p>
          </div>
        </div>

        <form
          action={createModule}
          className="mt-6 rounded-[2rem] border border-slate-200 bg-slate-50 p-5"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Create module</p>
              <p className="text-sm text-slate-500">
                Add a module to structure pacing and lesson grouping.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Module title
              </label>
              <input
                name="title"
                required
                placeholder="Module 1: Foundations"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
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
                defaultValue={modules.length + 1}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              name="description"
              rows={4}
              placeholder="Optional module overview..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Release date
              </label>
              <input
                name="release_at"
                type="datetime-local"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
              />
              <p className="mt-2 text-xs text-slate-500">
                Optional. Shows when this module should open.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Due date
              </label>
              <input
                name="due_at"
                type="datetime-local"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
              />
              <p className="mt-2 text-xs text-slate-500">
                Optional. Shows the recommended deadline for this module.
              </p>
            </div>
          </div>

          <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <input
              name="is_published"
              type="checkbox"
              defaultChecked
              className="h-4 w-4"
            />
            <div>
              <p className="font-medium text-slate-900">Published</p>
              <p className="text-sm text-slate-500">
                Visible on the course page
              </p>
            </div>
          </label>

          <button
            type="submit"
            className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-amber-300 transition hover:bg-black"
          >
            Create module
          </button>
        </form>

        {modules.length === 0 ? (
          <p className="mt-6 text-slate-700">
            No modules yet. You can still keep lessons flat, or create modules
            now.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {modules.map((module) => {
              const moduleLessons = lessons.filter(
                (lesson) => String(lesson.module_id) === String(module.id)
              )

              return (
                <div
                  key={module.id}
                  className="rounded-[2rem] border border-slate-200 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500">
                        Position {module.position}
                      </p>
                      <h4 className="text-lg font-semibold text-slate-900">
                        {module.title}
                      </h4>

                      {module.description && (
                        <p className="mt-2 text-sm text-slate-600">
                          {module.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            module.is_published
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {module.is_published ? 'Published' : 'Draft'}
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {moduleLessons.length} lesson
                          {moduleLessons.length === 1 ? '' : 's'}
                        </span>

                        {module.release_at && (
                          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-900">
                            Opens: {formatDate(module.release_at)}
                          </span>
                        )}

                        {module.due_at && (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                            Due: {formatDate(module.due_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <form action={toggleModulePublished}>
                        <input type="hidden" name="module_id" value={module.id} />
                        <input
                          type="hidden"
                          name="next_published"
                          value={module.is_published ? 'false' : 'true'}
                        />
                        <button
                          type="submit"
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-black"
                        >
                          {module.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                      </form>

                      <form action={deleteModule}>
                        <input type="hidden" name="module_id" value={module.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>

                  <form
                    action={updateModule}
                    className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                  >
                    <input type="hidden" name="module_id" value={module.id} />

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Module title
                        </label>
                        <input
                          name="title"
                          defaultValue={module.title}
                          required
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
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
                          defaultValue={module.position}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Description
                      </label>
                      <textarea
                        name="description"
                        rows={3}
                        defaultValue={module.description ?? ''}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Release date
                        </label>
                        <input
                          name="release_at"
                          type="datetime-local"
                          defaultValue={toDateTimeLocal(module.release_at)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Due date
                        </label>
                        <input
                          name="due_at"
                          type="datetime-local"
                          defaultValue={toDateTimeLocal(module.due_at)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <input
                        name="is_published"
                        type="checkbox"
                        defaultChecked={module.is_published}
                        className="h-4 w-4"
                      />
                      <div>
                        <p className="font-medium text-slate-900">Published</p>
                        <p className="text-sm text-slate-500">
                          Visible on the course page
                        </p>
                      </div>
                    </label>

                    <button
                      type="submit"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-amber-300 transition hover:bg-black"
                    >
                      <Pencil className="h-4 w-4" />
                      Save module details
                    </button>
                  </form>

                  {moduleLessons.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {moduleLessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div>
                            <p className="text-sm text-slate-500">
                              Lesson position {lesson.position}
                            </p>
                            <p className="font-medium text-slate-900">
                              {lesson.title}
                            </p>
                          </div>

                          <Link
                            href={`/teacher/lessons/${lesson.id}/edit`}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
                          >
                            Edit lesson
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Course lessons</h3>
            <p className="mt-2 text-slate-600">
              Manage the lessons inside this course.
            </p>
          </div>

          <Link
            href="/teacher/lessons/new"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-amber-300 transition hover:bg-black"
          >
            <PlusCircle className="h-4 w-4" />
            New lesson
          </Link>
        </div>

        {lessons.length === 0 ? (
          <p className="mt-6 text-slate-700">No lessons yet for this course.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {lessons.map((lesson) => {
              const module = modules.find(
                (item) => String(item.id) === String(lesson.module_id)
              )

              return (
                <div
                  key={lesson.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
                      <BookOpen className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">Position {lesson.position}</p>
                      <h4 className="font-semibold text-slate-900">{lesson.title}</h4>
                      <p className="mt-1 text-sm text-slate-600">{lesson.slug}</p>

                      <p className="mt-2 text-xs text-slate-500">
                        Module: {module?.title || 'No module assigned'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        lesson.is_published
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {lesson.is_published ? 'Published' : 'Draft'}
                    </span>

                    <Link
                      href={`/teacher/lessons/${lesson.id}/edit`}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
                    >
                      Edit lesson
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/courses/${course.slug}`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
          >
            <Eye className="h-4 w-4" />
            Open course overview
          </Link>

          <Link
            href="/teacher/lessons"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
          >
            <FolderOpen className="h-4 w-4" />
            View all lessons
          </Link>

          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
            <CalendarDays className="h-4 w-4" />
            Seasonal dates and pacing can both be managed here.
          </div>
        </div>
      </section>
    </div>
  )
}
