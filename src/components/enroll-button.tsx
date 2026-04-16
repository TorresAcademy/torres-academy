'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type EnrollButtonProps = {
  courseId: number
  isEnrolled?: boolean
}

export default function EnrollButton({
  courseId,
  isEnrolled = false,
}: EnrollButtonProps) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleEnroll() {
    if (isEnrolled) return

    setLoading(true)
    setErrorMessage('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setErrorMessage('Please log in first.')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('enrollments').insert({
      user_id: user.id,
      course_id: courseId,
    })

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    router.refresh()
    setLoading(false)
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleEnroll}
        disabled={loading || isEnrolled}
        className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {isEnrolled ? 'Enrolled' : loading ? 'Enrolling...' : 'Enroll'}
      </button>

      {errorMessage && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}
    </div>
  )
}