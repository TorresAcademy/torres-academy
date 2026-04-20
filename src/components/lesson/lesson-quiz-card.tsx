'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

type QuizResult = {
  scorePercentage: number
  correctCount: number
  totalQuestions: number
  passed: boolean
  passPercentage: number
}

type LessonQuizCardProps = {
  quiz: Quiz
  bestAttempt: QuizAttempt | null
}

export default function LessonQuizCard({
  quiz,
  bestAttempt,
}: LessonQuizCardProps) {
  const router = useRouter()

  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const allAnswered =
    quiz.questions.length > 0 &&
    quiz.questions.every((question) => answers[String(question.id)])

  async function handleSubmit() {
    setLoading(true)
    setErrorMessage('')
    setResult(null)

    try {
      const response = await fetch('/api/quizzes/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId: quiz.id,
          answers,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Could not submit quiz.')
      }

      setResult(data)

      if (data.passed) {
        router.refresh()
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong.'
      setErrorMessage(message)
    }

    setLoading(false)
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-bold text-slate-900">{quiz.title}</h4>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                quiz.quiz_type === 'final'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {quiz.quiz_type === 'final' ? 'Final quiz' : 'Checkpoint quiz'}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            Passing score: {quiz.pass_percentage}%
          </p>
        </div>

        {bestAttempt && (
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              bestAttempt.passed
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            Best: {bestAttempt.score_percentage}%
          </span>
        )}
      </div>

      {quiz.questions.length === 0 ? (
        <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          This quiz has no questions yet.
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          {quiz.questions.map((question) => (
            <div
              key={question.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="font-semibold text-slate-900">
                {question.position}. {question.question}
              </p>

              <div className="mt-4 space-y-2">
                {question.options.map((option) => {
                  const selected =
                    answers[String(question.id)] === option.id

                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                        selected
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        checked={selected}
                        onChange={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [String(question.id)]: option.id,
                          }))
                        }
                      />
                      <span>{option.option_text}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {errorMessage && (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      {result && (
        <div
          className={`mt-5 rounded-2xl border p-5 ${
            result.passed
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }`}
        >
          <p
            className={`font-bold ${
              result.passed ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {result.passed ? 'Quiz passed!' : 'Quiz not passed yet'}
          </p>

          <p className="mt-2 text-sm text-slate-700">
            You scored {result.scorePercentage}% — {result.correctCount} of{' '}
            {result.totalQuestions} correct. Required score:{' '}
            {result.passPercentage}%.
          </p>

          {!result.passed && (
            <p className="mt-2 text-sm text-slate-700">
              Review the lesson and try again.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !allAnswered || quiz.questions.length === 0}
        className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? 'Submitting...' : 'Submit quiz'}
      </button>

      {!allAnswered && quiz.questions.length > 0 && (
        <p className="mt-2 text-sm text-slate-500">
          Answer every question before submitting.
        </p>
      )}
    </div>
  )
}