'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LessonQuizCard from '@/components/lesson/lesson-quiz-card'
import FeedbackRequestCard from '@/components/lesson/feedback-request-card'
import ProtectedLessonMedia from '@/components/lesson/protected-lesson-media'

type LessonNavigationItem = {
  id: number
  title: string
  slug: string
  position: number
  completed: boolean
  current: boolean
}

type ReflectionState = {
  learned: string
  difficult: string
  nextStep: string
  confidence: string
}

type QuizOption = {
  id: number
  option_text: string
  position: number
}

type QuizQuestion = {
  id: number
  question: string
  position: number
  options: QuizOption[]
}

type Quiz = {
  id: number
  title: string
  quiz_type: string
  pass_percentage: number
  position: number
  questions: QuizQuestion[]
}

type QuizAttempt = {
  quiz_id: number
  score_percentage: number
  correct_count: number
  total_questions: number
  passed: boolean
  created_at: string
}

type FeedbackRequest = {
  id: number
  status: string
  student_message: string
  teacher_feedback: string | null
  created_at: string | null
  reviewed_at: string | null
}

type LessonMedia = {
  url: string | null
  type: string | null
  mimeType: string | null
  originalName: string | null
}

type StudentLessonExperienceProps = {
  userId: string
  course: {
    id: number
    title: string
    slug: string
  }
  lesson: {
    id: number
    title: string
    slug: string
    content: string | null
    position: number
  }
  lessons: LessonNavigationItem[]
  previousLesson: {
    slug: string
    title: string
  } | null
  nextLesson: {
    slug: string
    title: string
  } | null
  isCompleted: boolean
  initialNote: string
  initialReaction: string
  initialReflection: ReflectionState
  initialFeedbackRequest: FeedbackRequest | null
  quizzes: Quiz[]
  quizAttempts: QuizAttempt[]
  finalQuizPassed: boolean
  media: LessonMedia
  completeAction: () => Promise<void>
}

function contentToParagraphs(content: string | null) {
  if (!content) return []

  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export default function StudentLessonExperience({
  userId,
  course,
  lesson,
  lessons,
  previousLesson,
  nextLesson,
  isCompleted,
  initialNote,
  initialReaction,
  initialReflection,
  initialFeedbackRequest,
  quizzes,
  quizAttempts,
  finalQuizPassed,
  media,
  completeAction,
}: StudentLessonExperienceProps) {
  const supabase = createClient()

  const [notes, setNotes] = useState(initialNote)
  const [reaction, setReaction] = useState(initialReaction)
  const [reflection, setReflection] =
    useState<ReflectionState>(initialReflection)

  const [notesSaving, setNotesSaving] = useState(false)
  const [reflectionSaving, setReflectionSaving] = useState(false)
  const [reactionSaving, setReactionSaving] = useState(false)

  const [notesMessage, setNotesMessage] = useState('')
  const [reflectionMessage, setReflectionMessage] = useState('')
  const [reactionMessage, setReactionMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const paragraphs = useMemo(
    () => contentToParagraphs(lesson.content),
    [lesson.content]
  )

  const completedCount = lessons.filter((item) => item.completed).length
  const totalLessons = lessons.length
  const progressPercentage =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  const middleQuizzes = quizzes.filter((quiz) => quiz.quiz_type === 'middle')
  const finalQuizzes = quizzes.filter((quiz) => quiz.quiz_type === 'final')
  const hasFinalQuiz = finalQuizzes.length > 0

  function getBestAttempt(quizId: number) {
    const attempts = quizAttempts.filter((attempt) => attempt.quiz_id === quizId)

    if (attempts.length === 0) return null

    return attempts.sort((a, b) => {
      if (Number(b.passed) !== Number(a.passed)) {
        return Number(b.passed) - Number(a.passed)
      }

      return b.score_percentage - a.score_percentage
    })[0]
  }

  async function saveNotes() {
    setNotesSaving(true)
    setNotesMessage('')
    setErrorMessage('')

    const { error } = await supabase.from('lesson_notes').upsert(
      {
        user_id: userId,
        lesson_id: lesson.id,
        content: notes,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,lesson_id',
      }
    )

    if (error) {
      setErrorMessage(error.message)
      setNotesSaving(false)
      return
    }

    setNotesMessage('Notes saved')
    setNotesSaving(false)
    setTimeout(() => setNotesMessage(''), 1800)
  }

  async function saveReaction(value: string) {
    setReactionSaving(true)
    setReactionMessage('')
    setErrorMessage('')

    const { error } = await supabase.from('lesson_reactions').upsert(
      {
        user_id: userId,
        lesson_id: lesson.id,
        reaction: value,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,lesson_id',
      }
    )

    if (error) {
      setErrorMessage(error.message)
      setReactionSaving(false)
      return
    }

    setReaction(value)
    setReactionMessage('Reaction saved')
    setReactionSaving(false)
    setTimeout(() => setReactionMessage(''), 1800)
  }

  async function saveReflection() {
    setReflectionSaving(true)
    setReflectionMessage('')
    setErrorMessage('')

    const confidenceNumber = reflection.confidence
      ? Number(reflection.confidence)
      : null

    const { error } = await supabase.from('lesson_reflections').upsert(
      {
        user_id: userId,
        lesson_id: lesson.id,
        learned: reflection.learned.trim() || null,
        difficult: reflection.difficult.trim() || null,
        next_step: reflection.nextStep.trim() || null,
        confidence_level: confidenceNumber,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,lesson_id',
      }
    )

    if (error) {
      setErrorMessage(error.message)
      setReflectionSaving(false)
      return
    }

    setReflectionMessage('Reflection saved')
    setReflectionSaving(false)
    setTimeout(() => setReflectionMessage(''), 1800)
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {course.title}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {lesson.title}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Lesson {lesson.position} of {totalLessons}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/courses/${course.slug}`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
            >
              Back to course
            </Link>

            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <aside className="xl:sticky xl:top-6 xl:h-fit">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Course navigation
              </p>

              <h2 className="mt-3 text-xl font-bold text-slate-900">
                {course.title}
              </h2>

              <div className="mt-5">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Progress</span>
                  <span>{progressPercentage}%</span>
                </div>

                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  {completedCount} of {totalLessons} lessons completed
                </p>
              </div>

              <div className="mt-6 space-y-2">
                {lessons.map((item) => (
                  <Link
                    key={item.id}
                    href={`/lessons/${item.slug}`}
                    className={`block rounded-2xl border px-4 py-3 transition ${
                      item.current
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          item.completed
                            ? 'bg-green-100 text-green-700'
                            : item.current
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.completed ? '✓' : item.position}
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                          Lesson {item.position}
                        </p>
                        <p className="mt-1 font-medium text-slate-900">
                          {item.title}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                    Learning screen
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">
                    {lesson.title}
                  </h2>
                </div>

                {isCompleted ? (
                  <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                    Completed
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
                    In progress
                  </span>
                )}
              </div>

              <ProtectedLessonMedia media={media} />

              <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                <h3 className="text-lg font-bold text-slate-900">
                  Lesson content
                </h3>

                {paragraphs.length === 0 ? (
                  <p className="mt-4 leading-7 text-slate-700">
                    No lesson content yet.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4 leading-7 text-slate-700">
                    {paragraphs.map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Quick reaction
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Tell your teacher how this lesson feels.
                    </p>
                  </div>

                  {reactionMessage && (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      {reactionMessage}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {[
                    { value: 'like', label: '👍 Helpful' },
                    { value: 'dislike', label: '👎 Not clear' },
                    { value: 'confused', label: '😕 Confusing' },
                    { value: 'useful', label: '⭐ Useful' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      disabled={reactionSaving}
                      onClick={() => saveReaction(item.value)}
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                        reaction === item.value
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white text-slate-800 hover:border-blue-300 hover:text-blue-600'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-lg font-bold text-slate-900">
                  Mid-lesson quizzes
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Check your understanding before continuing.
                </p>

                {middleQuizzes.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    No mid-lesson quiz added yet.
                  </p>
                ) : (
                  <div className="mt-5 space-y-5">
                    {middleQuizzes.map((quiz) => (
                      <LessonQuizCard
                        key={quiz.id}
                        quiz={quiz}
                        bestAttempt={getBestAttempt(quiz.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-lg font-bold text-slate-900">
                  Teacher explanation
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  Use this area for extra explanation, common mistakes,
                  reminders, examples, or guidance from the teacher.
                </p>

                <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-7 text-slate-700">
                  <p className="font-semibold text-slate-900">Teaching note</p>
                  <p className="mt-2">
                    Encourage students to reflect, review key vocabulary, and
                    revisit the lesson if they feel unsure before moving on.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Reflection / metacognition
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Think about your learning before moving on.
                    </p>
                  </div>

                  {reflectionMessage && (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      {reflectionMessage}
                    </span>
                  )}
                </div>

                <div className="mt-4 grid gap-4">
                  <textarea
                    value={reflection.learned}
                    onChange={(e) =>
                      setReflection((prev) => ({
                        ...prev,
                        learned: e.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="What did you learn?"
                  />

                  <textarea
                    value={reflection.difficult}
                    onChange={(e) =>
                      setReflection((prev) => ({
                        ...prev,
                        difficult: e.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="What was difficult or unclear?"
                  />

                  <textarea
                    value={reflection.nextStep}
                    onChange={(e) =>
                      setReflection((prev) => ({
                        ...prev,
                        nextStep: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="What will you do next?"
                  />

                  <select
                    value={reflection.confidence}
                    onChange={(e) =>
                      setReflection((prev) => ({
                        ...prev,
                        confidence: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="">Select confidence</option>
                    <option value="1">1 - I need a lot more help</option>
                    <option value="2">2 - I still feel unsure</option>
                    <option value="3">3 - I understand some of it</option>
                    <option value="4">4 - I feel confident</option>
                    <option value="5">5 - I can explain it clearly</option>
                  </select>

                  <button
                    type="button"
                    onClick={saveReflection}
                    disabled={reflectionSaving}
                    className="w-fit rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {reflectionSaving
                      ? 'Saving reflection...'
                      : 'Save reflection'}
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-lg font-bold text-slate-900">
                  Final lesson quiz
                </h3>

                <p className="mt-2 text-sm text-slate-600">
                  You must pass the final quiz before completing this lesson.
                </p>

                {finalQuizzes.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    No final quiz has been published yet. You can still mark the
                    lesson complete for now.
                  </p>
                ) : (
                  <div className="mt-5 space-y-5">
                    {finalQuizzes.map((quiz) => (
                      <LessonQuizCard
                        key={quiz.id}
                        quiz={quiz}
                        bestAttempt={getBestAttempt(quiz.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Lesson actions
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Save your progress and continue your learning journey.
                    </p>
                  </div>

                  {isCompleted && (
                    <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                      Lesson completed
                    </span>
                  )}
                </div>

                {hasFinalQuiz && !finalQuizPassed && (
                  <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    Pass the final quiz first. Required score is usually 90%.
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <form action={completeAction}>
                    <button
                      type="submit"
                      disabled={hasFinalQuiz && !finalQuizPassed}
                      className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      {isCompleted
                        ? 'Save and continue'
                        : 'Mark lesson complete'}
                    </button>
                  </form>

                  {previousLesson && (
                    <Link
                      href={`/lessons/${previousLesson.slug}`}
                      className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                    >
                      Previous lesson
                    </Link>
                  )}

                  {nextLesson && (
                    <Link
                      href={`/lessons/${nextLesson.slug}`}
                      className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                    >
                      Next lesson
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>

          <aside className="xl:sticky xl:top-6 xl:h-fit">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                      My notes
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">
                      Private lesson notes
                    </h2>
                  </div>

                  {notesMessage && (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      {notesMessage}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm text-slate-600">
                  These notes are private and saved to your account.
                </p>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={16}
                  className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  placeholder="Write key ideas, new vocabulary, questions, reminders..."
                />

                <button
                  type="button"
                  onClick={saveNotes}
                  disabled={notesSaving}
                  className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {notesSaving ? 'Saving notes...' : 'Save notes'}
                </button>
              </div>

              <FeedbackRequestCard
                userId={userId}
                lessonId={lesson.id}
                initialRequest={initialFeedbackRequest}
              />
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}