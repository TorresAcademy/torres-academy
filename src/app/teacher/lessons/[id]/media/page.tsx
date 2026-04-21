import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireTeacherOrAdmin } from '@/lib/teacher/require-teacher-or-admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import LessonMediaManager from '@/components/teacher/lesson-media-manager'

type TeacherLessonMediaPageProps = {
  params: Promise<{ id: string }>
}

export default async function TeacherLessonMediaPage({
  params,
}: TeacherLessonMediaPageProps) {
  const { id } = await params
  const lessonId = Number(id)

  if (!lessonId || Number.isNaN(lessonId)) {
    notFound()
  }

  const { user, profile } = await requireTeacherOrAdmin()
  const serviceSupabase = createServiceRoleClient()

  const { data: lesson } = await serviceSupabase
    .from('lessons')
    .select(
      'id, title, slug, course_id, media_path, media_type, media_original_name, media_mime_type'
    )
    .eq('id', lessonId)
    .maybeSingle()

  if (!lesson) {
    notFound()
  }

  const { data: course } = await serviceSupabase
    .from('courses')
    .select('id, title, teacher_id')
    .eq('id', lesson.course_id)
    .maybeSingle()

  if (!course) {
    notFound()
  }

  const isAdmin = profile.role === 'admin'
  const canManage = isAdmin || course.teacher_id === user.id

  if (!canManage) {
    notFound()
  }

  let signedUrl: string | null = null

  if (lesson.media_path) {
    const { data } = await serviceSupabase.storage
      .from('lesson-media')
      .createSignedUrl(lesson.media_path, 60 * 20)

    signedUrl = data?.signedUrl ?? null
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
          Lesson Media
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          {lesson.title}
        </h2>

        <p className="mt-2 text-slate-600">
          Upload protected image or video content for this lesson.
        </p>
      </div>

      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm leading-7 text-slate-700">
        <p className="font-semibold text-slate-900">Protected media note</p>
        <p className="mt-1">
          Students do not receive the public storage path. The lesson page
          creates a temporary signed URL only after login, enrollment, and lesson
          access checks.
        </p>
      </div>

      <LessonMediaManager
        userId={user.id}
        lessonId={lesson.id}
        currentMedia={{
          signedUrl,
          mediaType: lesson.media_type,
          mimeType: lesson.media_mime_type,
          originalName: lesson.media_original_name,
        }}
      />
    </div>
  )
}