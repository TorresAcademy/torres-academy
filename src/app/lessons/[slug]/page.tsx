import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import StudentLessonExperience from '@/components/lesson/student-lesson-experience'

type LessonPageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/lessons/${slug}`)
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
    .select('id, title, slug, content, position, course_id, is_published')
    .eq('slug', slug)

  if (!canBypassEnrollment) {
    lessonQuery = lessonQuery.eq('is_published', true)
  }

  const { data: lesson } = await lessonQuery.maybeSingle()

  if (!lesson) {
    notFound()
  }

  const { data: course } = await supabase
    .from('courses')
    .select('id, title, slug, is_published')
    .eq('id', lesson.course_id)
    .maybeSingle()

  if (!course) {
    notFound()
  }

  if (!canBypassEnrollment && !course.is_published) {
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
      redirect(`/courses/${course.slug}`)
    }
  }

  let courseLessonsQuery = supabase
    .from('lessons')
    .select('id, title, slug, position, is_published')
    .eq('course_id', course.id)
    .order('position', { ascending: true })

  if (!canBypassEnrollment) {
    courseLessonsQuery = courseLessonsQuery.eq('is_published', true)
  }

  const { data: courseLessonsData } = await courseLessonsQuery

  const courseLessons = courseLessonsData ?? []
  const lessonIds = courseLessons.map((item) => item.id)

  let progressRows: { lesson_id: number; completed: boolean }[] = []

  if (lessonIds.length > 0) {
    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', user.id)
      .in('lesson_id', lessonIds)

    progressRows = progressData ?? []
  }

  const completedLessonIds = new Set(
    progressRows.filter((row) => row.completed).map((row) => row.lesson_id)
  )

  const currentIndex = courseLessons.findIndex((item) => item.id === lesson.id)

  const previousLesson =
    currentIndex > 0
      ? {
          slug: courseLessons[currentIndex - 1].slug,
          title: courseLessons[currentIndex - 1].title,
        }
      : null

  const nextLesson =
    currentIndex >= 0 && currentIndex < courseLessons.length - 1
      ? {
          slug: courseLessons[currentIndex + 1].slug,
          title: courseLessons[currentIndex + 1].title,
        }
      : null

  const navigationLessons = courseLessons.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    position: item.position,
    completed: completedLessonIds.has(item.id),
    current: item.id === lesson.id,
  }))

  const isCompleted = completedLessonIds.has(lesson.id)

  const { data: noteData } = await supabase
    .from('lesson_notes')
    .select('content')
    .eq('user_id', user.id)
    .eq('lesson_id', lesson.id)
    .maybeSingle()

  const { data: reactionData } = await supabase
    .from('lesson_reactions')
    .select('reaction')
    .eq('user_id', user.id)
    .eq('lesson_id', lesson.id)
    .maybeSingle()

  const { data: reflectionData } = await supabase
    .from('lesson_reflections')
    .select('learned, difficult, next_step, confidence_level')
    .eq('user_id', user.id)
    .eq('lesson_id', lesson.id)
    .maybeSingle()

  async function completeAction() {
    'use server'

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect(`/login?next=/lessons/${slug}`)
    }

    await supabase.from('lesson_progress').upsert(
      {
        user_id: user.id,
        lesson_id: lesson.id,
        completed: true,
      },
      {
        onConflict: 'user_id,lesson_id',
      }
    )

    revalidatePath(`/lessons/${slug}`)
    revalidatePath(`/courses/${course.slug}`)
    revalidatePath('/dashboard')

    if (nextLesson) {
      redirect(`/lessons/${nextLesson.slug}`)
    }

    redirect(`/courses/${course.slug}`)
  }

  return (
    <StudentLessonExperience
      userId={user.id}
      course={{
        id: course.id,
        title: course.title,
        slug: course.slug,
      }}
      lesson={{
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        content: lesson.content,
        position: lesson.position,
      }}
      lessons={navigationLessons}
      previousLesson={previousLesson}
      nextLesson={nextLesson}
      isCompleted={isCompleted}
      initialNote={noteData?.content ?? ''}
      initialReaction={reactionData?.reaction ?? ''}
      initialReflection={{
        learned: reflectionData?.learned ?? '',
        difficult: reflectionData?.difficult ?? '',
        nextStep: reflectionData?.next_step ?? '',
        confidence: reflectionData?.confidence_level
          ? String(reflectionData.confidence_level)
          : '',
      }}
      completeAction={completeAction}
    />
  )
}