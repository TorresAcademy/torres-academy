'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type MarkCompleteButtonProps = {
  lessonId: number
  initialCompleted: boolean
}

export default function MarkCompleteButton({
  lessonId,
  initialCompleted,
}: MarkCompleteButtonProps) {
  const [completed, setCompleted] = useState(initialCompleted)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()

  const handleComplete = async () => {
    if (completed) return

    setSaving(true)
    setErrorMessage('')

    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setErrorMessage('Please log in again.')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('lesson_progress').upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,lesson_id',
      }
    )

    if (error) {
      setErrorMessage(error.message)
      setSaving(false)
      return
    }

    setCompleted(true)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleComplete}
        disabled={saving || completed}
        className="rounded-lg border px-4 py-2 font-medium disabled:opacity-60"
      >
        {completed ? 'Completed' : saving ? 'Saving...' : 'Mark lesson complete'}
      </button>

      {errorMessage && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}
    </div>
  )
}