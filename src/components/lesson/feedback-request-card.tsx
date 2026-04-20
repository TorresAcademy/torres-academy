'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type FeedbackRequest = {
  id: number
  status: string
  student_message: string
  teacher_feedback: string | null
  created_at: string | null
  reviewed_at: string | null
}

type FeedbackRequestCardProps = {
  userId: string
  lessonId: number
  initialRequest: FeedbackRequest | null
}

export default function FeedbackRequestCard({
  userId,
  lessonId,
  initialRequest,
}: FeedbackRequestCardProps) {
  const supabase = createClient()

  const [request, setRequest] = useState<FeedbackRequest | null>(initialRequest)
  const [message, setMessage] = useState(initialRequest?.student_message ?? '')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  async function submitRequest() {
    setLoading(true)
    setSuccessMessage('')
    setErrorMessage('')

    const cleanMessage = message.trim()

    if (!cleanMessage) {
      setErrorMessage('Write a short message for your teacher first.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('feedback_requests')
      .upsert(
        {
          user_id: userId,
          lesson_id: lessonId,
          student_message: cleanMessage,
          status: 'pending',
          teacher_feedback: null,
          reviewed_at: null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,lesson_id',
        }
      )
      .select(
        'id, status, student_message, teacher_feedback, created_at, reviewed_at'
      )
      .single()

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    setRequest(data as FeedbackRequest)
    setSuccessMessage('Feedback request sent to your teacher.')
    setLoading(false)

    setTimeout(() => setSuccessMessage(''), 2500)
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
        Human feedback
      </p>

      <h2 className="mt-2 text-xl font-bold text-slate-900">
        Request teacher review
      </h2>

      <p className="mt-3 text-sm leading-7 text-slate-700">
        Ask your teacher for feedback about this lesson, your reflection, or
        anything you found difficult.
      </p>

      {request && (
        <div
          className={`mt-4 rounded-2xl border p-4 ${
            request.status === 'reviewed'
              ? 'border-green-200 bg-green-50'
              : request.status === 'closed'
              ? 'border-slate-200 bg-slate-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">
            Status: {request.status}
          </p>

          {request.teacher_feedback ? (
            <div className="mt-3">
              <p className="text-sm font-semibold text-green-800">
                Teacher feedback
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {request.teacher_feedback}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-700">
              Your request is waiting for teacher feedback.
            </p>
          )}
        </div>
      )}

      <div className="mt-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Message to teacher
        </label>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
          placeholder="Example: I understood most of the lesson, but I am still confused about..."
        />
      </div>

      {successMessage && (
        <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </p>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <button
        type="button"
        onClick={submitRequest}
        disabled={loading}
        className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {loading
          ? 'Sending...'
          : request?.status === 'reviewed'
          ? 'Ask for another review'
          : 'Request teacher feedback'}
      </button>
    </div>
  )
}