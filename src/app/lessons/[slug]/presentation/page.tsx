import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import LessonPresentationSlides, {
  type PresentationSlide,
} from '@/components/lesson/lesson-presentation-slides'

type PresentationLessonPageProps = {
  params: Promise<{
    slug: string
  }>
}

type CourseModule = {
  id: number
  course_id: number
  title: string
  position: number
  is_published: boolean
  release_at: string | null
  due_at: string | null
}

type CourseLesson = {
  id: number
  title: string
  slug: string
  position: number
  is_published: boolean | null
  module_id: number | null
}

type LessonRecord = {
  id: number
  title: string
  slug: string
  content: string | null
  position: number
  course_id: number
  module_id: number | null
  is_published: boolean | null
  media_path: string | null
  media_type: string | null
  media_original_name: string | null
  media_mime_type: string | null
  teacher_explanation: string | null
  encouragement_title: string | null
  encouragement_text: string | null
}

type LessonMediaItemRow = {
  id: string
  title: string | null
  description: string | null
  media_path: string
  media_type: string
  mime_type: string | null
  original_name: string | null
  position: number
}

function isModuleAccessible(
  moduleRow: CourseModule | null | undefined,
  canBypassEnrollment: boolean
) {
  if (canBypassEnrollment) return true
  if (!moduleRow) return true
  if (!moduleRow.is_published) return false

  if (moduleRow.release_at) {
    const releaseAt = new Date(moduleRow.release_at)
    if (!Number.isNaN(releaseAt.getTime()) && new Date() < releaseAt) {
      return false
    }
  }

  return true
}

function formatDate(value: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default async function PresentationLessonPage({
  params,
}: PresentationLessonPageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const serviceSupabase = createServiceRoleClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/lessons/${slug}/presentation`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()

  const canBypassEnrollment =
    profile?.role === 'admin' || profile?.role === 'teacher'

  let lessonQuery = supabase
    .from('lessons')
    .select(
      'id, title, slug, content, position, course_id, module_id, is_published, media_path, media_type, media_original_name, media_mime_type, teacher_explanation, encouragement_title, encouragement_text'
    )
    .eq('slug', slug)

  if (!canBypassEnrollment) {
    lessonQuery = lessonQuery.eq('is_published', true)
  }

  const { data: lessonData } = await lessonQuery.maybeSingle()
  const lesson = lessonData as LessonRecord | null

  if (!lesson) {
    notFound()
  }

  const { data: course } = await supabase
    .from('courses')
    .select('id, title, slug, is_published, is_free, status')
    .eq('id', lesson.course_id)
    .maybeSingle()

  if (!course) {
    notFound()
  }

  if (
    !canBypassEnrollment &&
    (!course.is_published || course.status !== 'published')
  ) {
    notFound()
  }

  if (!canBypassEnrollment) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .maybeSingle()

    if (!enrollment) {
      if (course.is_published && course.is_free && course.status === 'published') {
        const { error: enrollError } = await supabase.from('enrollments').insert({
          user_id: user.id,
          course_id: course.id,
        })

        if (enrollError) {
          redirect(`/courses/${course.slug}`)
        }
      } else {
        redirect(`/courses/${course.slug}`)
      }
    }
  }

  const { data: courseModulesData } = await supabase
    .from('course_modules')
    .select('id, course_id, title, position, is_published, release_at, due_at')
    .eq('course_id', course.id)
    .order('position', { ascending: true })
    .order('id', { ascending: true })

  const courseModules = (courseModulesData ?? []) as CourseModule[]
  const courseModuleMap = new Map(courseModules.map((module) => [module.id, module]))

  const currentModule =
    lesson.module_id !== null ? courseModuleMap.get(lesson.module_id) ?? null : null

  if (!isModuleAccessible(currentModule, canBypassEnrollment)) {
    redirect(`/courses/${course.slug}`)
  }

  let courseLessonsQuery = supabase
    .from('lessons')
    .select('id, title, slug, position, is_published, module_id')
    .eq('course_id', course.id)
    .order('position', { ascending: true })

  if (!canBypassEnrollment) {
    courseLessonsQuery = courseLessonsQuery.eq('is_published', true)
  }

  const { data: courseLessonsData } = await courseLessonsQuery
  const courseLessonsRaw = (courseLessonsData ?? []) as CourseLesson[]

  const courseLessons = courseLessonsRaw.filter((item) => {
    const itemModule =
      item.module_id !== null ? courseModuleMap.get(item.module_id) ?? null : null

    return isModuleAccessible(itemModule, canBypassEnrollment)
  })

  const currentIndex = courseLessons.findIndex((item) => item.id === lesson.id)

  const previousLesson =
    currentIndex > 0 ? courseLessons[currentIndex - 1] : null

  const nextLesson =
    currentIndex >= 0 && currentIndex < courseLessons.length - 1
      ? courseLessons[currentIndex + 1]
      : null

  const { data: mediaItemRows } = await serviceSupabase
    .from('lesson_media_items')
    .select(
      'id, title, description, media_path, media_type, mime_type, original_name, position'
    )
    .eq('lesson_id', lesson.id)
    .eq('is_published', true)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  const newSlides = await Promise.all(
    ((mediaItemRows ?? []) as LessonMediaItemRow[]).map(async (item) => {
      const { data } = await serviceSupabase.storage
        .from('lesson-media')
        .createSignedUrl(item.media_path, 60 * 30)

      return {
        id: String(item.id),
        title: item.title,
        description: item.description,
        mediaType: item.media_type,
        mimeType: item.mime_type,
        originalName: item.original_name,
        position: item.position,
        signedUrl: data?.signedUrl ?? null,
      } satisfies PresentationSlide
    })
  )

  let legacySlide: PresentationSlide | null = null

  if (lesson.media_path) {
    const { data } = await serviceSupabase.storage
      .from('lesson-media')
      .createSignedUrl(lesson.media_path, 60 * 30)

    legacySlide = {
      id: `legacy-${lesson.id}`,
      title: lesson.media_original_name || lesson.title,
      description: null,
      mediaType: lesson.media_type,
      mimeType: lesson.media_mime_type,
      originalName: lesson.media_original_name,
      position: 1,
      signedUrl: data?.signedUrl ?? null,
    }
  }

  const presentationSlides =
    newSlides.length > 0 ? newSlides : legacySlide ? [legacySlide] : []

  const moduleReleaseLabel = formatDate(currentModule?.release_at ?? null)
  const moduleDueLabel = formatDate(currentModule?.due_at ?? null)

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
              Presentation View
            </p>
            <h1 className="mt-1 text-2xl font-bold">{lesson.title}</h1>
            <p className="mt-1 text-sm text-slate-300">
              {course.title}
              {currentModule
                ? ` · Module ${currentModule.position}: ${currentModule.title}`
                : ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/lessons/${lesson.slug}`}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Standard View
            </Link>

            <Link
              href={`/courses/${course.slug}`}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Course Page
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {canBypassEnrollment && lesson.is_published === false && (
          <div className="mb-6 rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4 text-sm text-amber-100">
            Preview mode: this lesson is not published for students yet.
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-3">
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-slate-100">
            Lesson {lesson.position}
          </span>

          <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm font-semibold text-blue-100">
            {presentationSlides.length} slide
            {presentationSlides.length === 1 ? '' : 's'}
          </span>

          {moduleReleaseLabel && (
            <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm font-semibold text-blue-100">
              Opens: {moduleReleaseLabel}
            </span>
          )}

          {moduleDueLabel && (
            <span className="rounded-full bg-amber-400/20 px-3 py-1 text-sm font-semibold text-amber-100">
              Due: {moduleDueLabel}
            </span>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl">
              <LessonPresentationSlides slides={presentationSlides} />

              <div className="mt-6 rounded-3xl border border-white/10 bg-white p-8 text-slate-900">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  Lesson Content
                </p>

                <div className="mt-4 whitespace-pre-wrap text-lg leading-9 text-slate-800">
                  {lesson.content?.trim() || 'No lesson content added yet.'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <div className="flex flex-wrap gap-3">
                {previousLesson ? (
                  <Link
                    href={`/lessons/${previousLesson.slug}/presentation`}
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
                  >
                    ← {previousLesson.title}
                  </Link>
                ) : (
                  <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-slate-500">
                    No previous lesson
                  </span>
                )}

                {nextLesson ? (
                  <Link
                    href={`/lessons/${nextLesson.slug}/presentation`}
                    className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                  >
                    {nextLesson.title} →
                  </Link>
                ) : (
                  <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-slate-500">
                    No next lesson
                  </span>
                )}
              </div>

              <Link
                href={`/lessons/${lesson.slug}`}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
              >
                Open interactive lesson
              </Link>
            </div>
          </section>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                Teacher Explanation
              </p>

              <div className="mt-4 whitespace-pre-wrap text-base leading-7 text-slate-200">
                {lesson.teacher_explanation?.trim() ||
                  'No teacher explanation added yet.'}
              </div>
            </div>

            {(lesson.encouragement_title || lesson.encouragement_text) && (
              <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
                  Teaching Note
                </p>

                {lesson.encouragement_title && (
                  <h2 className="mt-3 text-xl font-bold text-white">
                    {lesson.encouragement_title}
                  </h2>
                )}

                {lesson.encouragement_text && (
                  <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-amber-50">
                    {lesson.encouragement_text}
                  </p>
                )}
              </div>
            )}

            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                Lesson Navigation
              </p>

              <div className="mt-4 space-y-3">
                {courseLessons.map((item) => (
                  <Link
                    key={item.id}
                    href={`/lessons/${item.slug}/presentation`}
                    className={`block rounded-2xl border px-4 py-3 transition ${
                      item.id === lesson.id
                        ? 'border-blue-400 bg-blue-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
                      Lesson {item.position}
                    </p>
                    <p className="mt-1 font-semibold">{item.title}</p>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
