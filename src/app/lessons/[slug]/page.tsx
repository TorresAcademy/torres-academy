// src/app/lessons/[slug]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import StudentLessonExperience from '@/components/lesson/student-lesson-experience'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

type LessonPageProps = {
  params: Promise<{ slug: string }>
}

type CourseStatus = 'draft' | 'published' | 'archived'

type Course = {
  id: number
  title: string
  slug: string
  is_published: boolean | null
  status: CourseStatus | null
  teacher_id: string | null
}

type Lesson = {
  id: number
  course_id: number
  module_id: number | null
  title: string
  slug: string
  content: string | null
  video_url: string | null
  position: number
  is_published: boolean | null
  teacher_explanation: string | null
  encouragement_title: string | null
  encouragement_text: string | null
  media_path: string | null
  media_type: string | null
  media_original_name: string | null
  media_mime_type: string | null
}

type LessonProgress = {
  lesson_id: number
  completed: boolean
  note: string | null
}

type LessonNote = {
  content: string | null
}

type LessonReaction = {
  reaction: string | null
}

type LessonReflection = {
  learned: string | null
  difficult: string | null
  next_step: string | null
  confidence_level: number | null
}

type FeedbackRequest = {
  id: number
  status: string
  student_message: string
  teacher_feedback: string | null
  created_at: string | null
  reviewed_at: string | null
}

type Quiz = {
  id: number
  title: string
  quiz_type: string
  pass_percentage: number
  position: number
  questions: {
    id: number
    question: string
    position: number
    options: {
      id: number
      option_text: string
      position: number
    }[]
  }[]
}

type QuizAttempt = {
  quiz_id: number
  score_percentage: number
  correct_count: number
  total_questions: number
  passed: boolean
  created_at: string
}

type MediaItemRow = {
  id: string
  title: string | null
  description: string | null
  media_path: string
  media_type: string
  mime_type: string | null
  original_name: string | null
  position: number
}

function normalizeStatus(
  status: CourseStatus | null,
  isPublished: boolean | null
): CourseStatus {
  if (status === 'draft' || status === 'published' || status === 'archived') {
    return status
  }

  return isPublished ? 'published' : 'draft'
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug } = await params

  if (!slug) {
    notFound()
  }

  const supabase = await createClient()
  const serviceSupabase = createServiceRoleClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isTeacherOrAdmin =
    profile?.role === 'teacher' || profile?.role === 'admin'

  const { data: lessonData } = await serviceSupabase
    .from('lessons')
    .select(
      'id, course_id, module_id, title, slug, content, video_url, position, is_published, teacher_explanation, encouragement_title, encouragement_text, media_path, media_type, media_original_name, media_mime_type'
    )
    .eq('slug', slug)
    .maybeSingle()

  if (!lessonData) {
    notFound()
  }

  const lesson = lessonData as Lesson

  const { data: courseData } = await serviceSupabase
    .from('courses')
    .select('id, title, slug, is_published, status, teacher_id')
    .eq('id', lesson.course_id)
    .maybeSingle()

  if (!courseData) {
    notFound()
  }

  const course = courseData as Course
  const courseStatus = normalizeStatus(course.status, course.is_published)
  const isCoursePublished = courseStatus === 'published'
  const isLessonPublished = Boolean(lesson.is_published)
  const ownsCourse = course.teacher_id === user.id

  const { data: enrollment } = await serviceSupabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .maybeSingle()

  const canAccess =
    Boolean(enrollment) ||
    (isTeacherOrAdmin && (profile?.role === 'admin' || ownsCourse))

  if (!canAccess) {
    redirect(`/courses/${course.slug}`)
  }

  if (!isTeacherOrAdmin && (!isCoursePublished || !isLessonPublished)) {
    notFound()
  }

  const { data: lessonRows } = await serviceSupabase
    .from('lessons')
    .select('id, title, slug, position, is_published')
    .eq('course_id', course.id)
    .order('position', { ascending: true })
    .order('id', { ascending: true })

  const courseLessons = ((lessonRows ?? []) as Array<{
    id: number
    title: string
    slug: string
    position: number
    is_published: boolean | null
  }>).filter((item) => isTeacherOrAdmin || item.is_published)

  const lessonIds = courseLessons.map((item) => item.id)

  const { data: progressRows } =
    lessonIds.length > 0
      ? await serviceSupabase
          .from('lesson_progress')
          .select('lesson_id, completed, note')
          .eq('user_id', user.id)
          .in('lesson_id', lessonIds)
      : { data: [] }

  const progress = (progressRows ?? []) as LessonProgress[]
  const progressMap = new Map(
    progress.map((item) => [item.lesson_id, Boolean(item.completed)])
  )

  const navigationItems = courseLessons.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    position: item.position,
    completed: progressMap.get(item.id) ?? false,
    current: item.id === lesson.id,
  }))

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

  const currentProgress = progress.find((item) => item.lesson_id === lesson.id)
  const isCompleted = Boolean(currentProgress?.completed)

  const { data: noteData } = await serviceSupabase
    .from('lesson_notes')
    .select('content')
    .eq('user_id', user.id)
    .eq('lesson_id', lesson.id)
    .maybeSingle()

  const { data: reactionData } = await serviceSupabase
    .from('lesson_reactions')
    .select('reaction')
    .eq('user_id', user.id)
    .eq('lesson_id', lesson.id)
    .maybeSingle()

  const { data: reflectionData } = await serviceSupabase
    .from('lesson_reflections')
    .select('learned, difficult, next_step, confidence_level')
    .eq('user_id', user.id)
    .eq('lesson_id', lesson.id)
    .maybeSingle()

  const { data: feedbackData } = await serviceSupabase
    .from('feedback_requests')
    .select(
      'id, status, student_message, teacher_feedback, created_at, reviewed_at'
    )
    .eq('user_id', user.id)
    .eq('lesson_id', lesson.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: quizRows } = await serviceSupabase
    .from('quizzes')
    .select('id, title, quiz_type, pass_percentage, position, is_published')
    .eq('lesson_id', lesson.id)
    .eq('is_published', true)
    .order('position', { ascending: true })

  const rawQuizzes = (quizRows ?? []) as Array<{
    id: number
    title: string
    quiz_type: string
    pass_percentage: number
    position: number
  }>

  const quizIds = rawQuizzes.map((quiz) => quiz.id)

  const { data: questionRows } =
    quizIds.length > 0
      ? await serviceSupabase
          .from('quiz_questions')
          .select('id, quiz_id, question, position')
          .in('quiz_id', quizIds)
          .order('position', { ascending: true })
      : { data: [] }

  const questions = (questionRows ?? []) as Array<{
    id: number
    quiz_id: number
    question: string
    position: number
  }>

  const questionIds = questions.map((question) => question.id)

  const { data: optionRows } =
    questionIds.length > 0
      ? await serviceSupabase
          .from('quiz_options')
          .select('id, question_id, option_text, position')
          .in('question_id', questionIds)
          .order('position', { ascending: true })
      : { data: [] }

  const options = (optionRows ?? []) as Array<{
    id: number
    question_id: number
    option_text: string
    position: number
  }>

  const quizzes: Quiz[] = rawQuizzes.map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    quiz_type: quiz.quiz_type,
    pass_percentage: quiz.pass_percentage,
    position: quiz.position,
    questions: questions
      .filter((question) => question.quiz_id === quiz.id)
      .map((question) => ({
        id: question.id,
        question: question.question,
        position: question.position,
        options: options
          .filter((option) => option.question_id === question.id)
          .map((option) => ({
            id: option.id,
            option_text: option.option_text,
            position: option.position,
          })),
      })),
  }))

  const { data: attemptRows } =
    quizIds.length > 0
      ? await serviceSupabase
          .from('quiz_attempts')
          .select(
            'quiz_id, score_percentage, correct_count, total_questions, passed, created_at'
          )
          .eq('user_id', user.id)
          .in('quiz_id', quizIds)
          .order('created_at', { ascending: false })
      : { data: [] }

  const quizAttempts = (attemptRows ?? []) as QuizAttempt[]

  const finalQuizIds = quizzes
    .filter((quiz) => quiz.quiz_type === 'final')
    .map((quiz) => quiz.id)

  const finalQuizPassed =
    finalQuizIds.length === 0 ||
    quizAttempts.some(
      (attempt) => finalQuizIds.includes(attempt.quiz_id) && attempt.passed
    )

  let signedUrl: string | null = null

  if (lesson.media_path) {
    const { data } = await serviceSupabase.storage
      .from('lesson-media')
      .createSignedUrl(lesson.media_path, 60 * 20)

    signedUrl = data?.signedUrl ?? null
  }

  const media = {
    url: signedUrl,
    type: lesson.media_type,
    mimeType: lesson.media_mime_type,
    originalName: lesson.media_original_name,
  }

  const { data: mediaItemRows } = await serviceSupabase
    .from('lesson_media_items')
    .select(
      'id, title, description, media_path, media_type, mime_type, original_name, position'
    )
    .eq('lesson_id', lesson.id)
    .eq('is_published', true)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  const mediaItems = await Promise.all(
    ((mediaItemRows ?? []) as MediaItemRow[]).map(async (item) => {
      const { data } = await serviceSupabase.storage
        .from('lesson-media')
        .createSignedUrl(item.media_path, 60 * 20)

      return {
        id: String(item.id),
        title: item.title,
        description: item.description,
        mediaType: item.media_type,
        mimeType: item.mime_type,
        originalName: item.original_name,
        position: item.position,
        signedUrl: data?.signedUrl ?? null,
      }
    })
  )

  async function completeLesson() {
    'use server'

    const supabase = await createClient()
    const serviceSupabase = createServiceRoleClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const { data: currentLesson } = await serviceSupabase
      .from('lessons')
      .select('id, slug')
      .eq('id', lesson.id)
      .maybeSingle()

    if (!currentLesson) {
      redirect('/dashboard')
    }

    await serviceSupabase.from('lesson_progress').upsert(
      {
        user_id: user.id,
        lesson_id: lesson.id,
        completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,lesson_id',
      }
    )

    revalidatePath(`/lessons/${currentLesson.slug}`)
    revalidatePath('/dashboard')
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
        teacher_explanation: lesson.teacher_explanation,
        encouragement_title: lesson.encouragement_title,
        encouragement_text: lesson.encouragement_text,
      }}
      lessons={navigationItems}
      previousLesson={previousLesson}
      nextLesson={nextLesson}
      isCompleted={isCompleted}
      initialNote={(noteData as LessonNote | null)?.content ?? ''}
      initialReaction={(reactionData as LessonReaction | null)?.reaction ?? ''}
      initialReflection={{
        learned: (reflectionData as LessonReflection | null)?.learned ?? '',
        difficult: (reflectionData as LessonReflection | null)?.difficult ?? '',
        nextStep: (reflectionData as LessonReflection | null)?.next_step ?? '',
        confidence:
          (reflectionData as LessonReflection | null)?.confidence_level?.toString() ??
          '',
      }}
      initialFeedbackRequest={(feedbackData as FeedbackRequest | null) ?? null}
      quizzes={quizzes}
      quizAttempts={quizAttempts}
      finalQuizPassed={finalQuizPassed}
      media={media}
      mediaItems={mediaItems}
      completeAction={completeLesson}
    />
  )
}
