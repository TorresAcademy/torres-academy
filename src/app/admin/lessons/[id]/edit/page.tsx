import { notFound } from 'next/navigation'
import LessonForm from '@/components/admin/lesson-form'
import { requireAdmin } from '@/lib/admin/require-admin'

type EditLessonPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditLessonPage({
  params,
}: EditLessonPageProps) {
  const { id } = await params
  const { supabase } = await requireAdmin()

  const lessonId = Number(id)

  if (!lessonId || Number.isNaN(lessonId)) {
    notFound()
  }

  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select(
      'id, course_id, title, slug, content, video_url, position, is_published'
    )
    .eq('id', lessonId)
    .single()

  if (lessonError || !lesson) {
    notFound()
  }

  const { data: coursesData } = await supabase
    .from('courses')
    .select('id, title')
    .order('title', { ascending: true })

  const courses =
    (coursesData ?? []).map((course) => ({
      id: course.id,
      title: course.title,
    })) || []

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Lessons
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Edit lesson
        </h2>
        <p className="mt-2 text-slate-600">
          Update lesson content, order, and publishing status.
        </p>
      </div>

      <LessonForm
        mode="edit"
        lessonId={lesson.id}
        courses={courses}
        initialValues={{
          course_id: lesson.course_id,
          title: lesson.title ?? '',
          slug: lesson.slug ?? '',
          content: lesson.content ?? '',
          video_url: lesson.video_url ?? '',
          position: lesson.position ?? 1,
          is_published: lesson.is_published ?? false,
        }}
      />
    </div>
  )
}