import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import StudentLessonExperience from '@/components/lesson/student-lesson-experience'

type LessonPageProps = {
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
    .select(
      'id, title, slug, content, position, course_id, module_id, is_published, media_path, media_type, media_original_name, media_mime_type, teacher_explanation, encouragement_title, encouragement_text'
    )
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
          console.error(enrollError)
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

  const { data: feedbackRequestData } = await supabase
    .from('feedback_requests')
    .select(
      'id, status, student_message, teacher_feedback, created_at, reviewed_at'
    )
    .eq('user_id', user.id)
    .eq('lesson_id', lesson.id)
    .maybeSingle()

  const { data: quizzesData } = await supabase.rpc(
    'get_lesson_quizzes_for_student',
    {
      input_lesson_id: lesson.id,
    }
  )

  const quizzes = Array.isArray(quizzesData) ? (quizzesData as Quiz[]) : []
  const quizIds = quizzes.map((quiz) => quiz.id)

  let quizAttempts: QuizAttempt[] = []

  if (quizIds.length > 0) {
    const { data: attemptsData } = await supabase
      .from('quiz_attempts')
      .select(
        'quiz_id, score_percentage, correct_count, total_questions, passed, created_at'
      )
      .eq('user_id', user.id)
      .in('quiz_id', quizIds)
      .order('created_at', { ascending: false })

    quizAttempts = (attemptsData ?? []) as QuizAttempt[]
  }

  const finalQuizzes = quizzes.filter((quiz) => quiz.quiz_type === 'final')
  const passedQuizIds = new Set(
    quizAttempts
      .filter((attempt) => attempt.passed)
      .map((attempt) => attempt.quiz_id)
  )

  const finalQuizPassed =
    finalQuizzes.length === 0 ||
    finalQuizzes.every((quiz) => passedQuizIds.has(quiz.id))

  let mediaSignedUrl: string | null = null

  if (lesson.media_path) {
    const serviceSupabase = createServiceRoleClient()

    const { data } = await serviceSupabase.storage
      .from('lesson-media')
      .createSignedUrl(lesson.media_path, 60 * 30)

    mediaSignedUrl = data?.signedUrl ?? null
  }

  const lessonId = lesson.id
  const courseSlug = course.slug
  const nextLessonSlug = nextLesson?.slug ?? null

  async function completeAction() {
    'use server'

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect(`/login?next=/lessons/${slug}`)
    }

    const { data: currentLesson } = await supabase
      .from('lessons')
      .select('id, module_id')
      .eq('id', lessonId)
      .maybeSingle()

      if (!currentLesson) {
      redirect(`/courses/${courseSlug}`)
    }

    if (currentLesson.module_id !== null) {
      const { data: currentModuleRow } = await supabase
        .from('course_modules')
        .select('id, is_published, release_at')
        .eq('id', currentLesson.module_id)
        .maybeSingle()

      if (
        currentModuleRow &&
        (!currentModuleRow.is_published ||
          (currentModuleRow.release_at &&
            new Date() < new Date(currentModuleRow.release_at)))
      ) {
        redirect(`/courses/${courseSlug}`)
      }
    }

    const { data: finalQuizzesData } = await supabase
      .from('quizzes')
      .select('id')
      .eq('lesson_id', lessonId)
      .eq('quiz_type', 'final')
      .eq('is_published', true)

    const finalQuizIds = (finalQuizzesData ?? []).map((quiz) => quiz.id)

    if (finalQuizIds.length > 0) {
      const { data: passedAttempts } = await supabase
        .from('quiz_attempts')
        .select('quiz_id')
        .eq('user_id', user.id)
        .in('quiz_id', finalQuizIds)
        .eq('passed', true)

      const passedIds = new Set(
        (passedAttempts ?? []).map((attempt) => attempt.quiz_id)
      )

      const passedEveryFinalQuiz = finalQuizIds.every((quizId) =>
        passedIds.has(quizId)
      )

      if (!passedEveryFinalQuiz) {
        redirect(`/lessons/${slug}`)
      }
    }

    await supabase.from('lesson_progress').upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        completed: true,
      },
      {
        onConflict: 'user_id,lesson_id',
      }
    )

    revalidatePath(`/lessons/${slug}`)
    revalidatePath(`/courses/${courseSlug}`)
    revalidatePath('/dashboard')

    if (nextLessonSlug) {
      redirect(`/lessons/${nextLessonSlug}`)
    }

    redirect(`/courses/${courseSlug}`)
  }

  return (
    <div>
      <div className="mx-auto max-w-7xl px-6 pt-6">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link
            href={`/lessons/${lesson.slug}/presentation`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
          >
            Presentation View
          </Link>
        </div>
      </div>

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
        initialFeedbackRequest={feedbackRequestData ?? null}
        quizzes={quizzes}
        quizAttempts={quizAttempts}
        finalQuizPassed={finalQuizPassed}
        media={{
          url: mediaSignedUrl,
          type: lesson.media_type,
          mimeType: lesson.media_mime_type,
          originalName: lesson.media_original_name,
        }}
        completeAction={completeAction}
      />
    </div>
  )
}