// src/app/teacher/lessons/page.tsx
import Link from 'next/link'
import {
  BookOpen,
  Eye,
  FileVideo,
  Image as ImageIcon,
  Lock,
  Pencil,
  PlusCircle,
  Sparkles,
  ClipboardList,
  FolderOpen,
} from 'lucide-react'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'

type Lesson = {
  id: number
  course_id: number
  title: string
  slug: string
  position: number
  is_published: boolean | null
  media_path?: string | null
  media_type?: string | null
}

type Course = {
  id: number
  title: string
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

export default async function TeacherLessonsPage() {
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

  const courses: Course[] = (coursesData ?? []).map((course) => ({
    id: Number(course.id),
    title: course.title,
  }))

  const courseMap = new Map(courses.map((course) => [course.id, course.title]))
  const courseIds = courses.map((course) => course.id)

  let lessons: Lesson[] = []

  if (courseIds.length > 0) {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select(
        'id, course_id, title, slug, position, is_published, media_path, media_type'
      )
      .in('course_id', courseIds)
      .order('course_id', { ascending: true })
      .order('position', { ascending: true })

    lessons = (lessonsData ?? []).map((lesson) => ({
      id: Number(lesson.id),
      course_id: Number(lesson.course_id),
      title: lesson.title,
      slug: lesson.slug,
      position: lesson.position,
      is_published: lesson.is_published,
      media_path: lesson.media_path,
      media_type: lesson.media_type,
    }))
  }

  const publishedCount = lessons.filter((lesson) => lesson.is_published).length
  const draftCount = lessons.filter((lesson) => !lesson.is_published).length
  const protectedMediaCount = lessons.filter((lesson) => lesson.media_path).length
  const videoCount = lessons.filter(
    (lesson) => lesson.media_path && lesson.media_type === 'video'
  ).length

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              Lessons
            </p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              My lessons
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Create lessons, upload protected media, connect quizzes, and manage
              lesson delivery across your courses.
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
                    Premium lesson management
                  </p>
                  <p className="text-sm text-slate-300">
                    Media, quizzes, and submissions in one place.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/teacher/lessons/new"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black transition hover:bg-amber-300"
            >
              <PlusCircle className="h-4 w-4" />
              New lesson
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total lessons" value={lessons.length} />
        <MetricCard label="Published" value={publishedCount} />
        <MetricCard label="Drafts" value={draftCount} />
        <MetricCard
          label="Protected media"
          value={protectedMediaCount}
          note={`${videoCount} video lesson${videoCount === 1 ? '' : 's'}`}
        />
      </section>

      {lessons.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-700">No lessons yet.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {lessons.map((lesson) => {
            const courseTitle =
              courseMap.get(lesson.course_id) || 'Unknown course'

            const mediaLabel = lesson.media_path
              ? lesson.media_type === 'video'
                ? 'Video uploaded'
                : 'Image uploaded'
              : 'No media'

            return (
              <article
                key={lesson.id}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
                        <BookOpen className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-amber-800">
                          {courseTitle}
                        </p>

                        <h3 className="mt-1 text-xl font-bold text-slate-900">
                          {lesson.title}
                        </h3>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Slug: {lesson.slug}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Position: {lesson.position}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {lesson.media_path ? (
                          lesson.media_type === 'video' ? (
                            <FileVideo className="h-3.5 w-3.5" />
                          ) : (
                            <ImageIcon className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <FolderOpen className="h-3.5 w-3.5" />
                        )}
                        {mediaLabel}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        lesson.is_published
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {lesson.is_published ? 'Published' : 'Draft'}
                    </span>

                    {lesson.media_path && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        <Lock className="h-3.5 w-3.5" />
                        Protected media
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
                  <Link
                    href={`/teacher/lessons/${lesson.id}/edit`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-amber-300 transition hover:bg-black"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>

                  <Link
                    href={`/teacher/lessons/${lesson.id}/media`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
                  >
                    <FileVideo className="h-4 w-4" />
                    Media
                  </Link>

                  <Link
                    href={`/teacher/lessons/${lesson.id}/quiz`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 font-semibold text-black transition hover:bg-amber-300"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Quiz Builder
                  </Link>

                  <Link
                    href={`/teacher/lessons/${lesson.id}/submissions`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Submissions
                  </Link>

                  <Link
                    href={`/lessons/${lesson.slug}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900 transition hover:border-amber-400 hover:text-amber-700"
                  >
                    <Eye className="h-4 w-4" />
                    View lesson
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
