'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type CertificateRequirements = {
  totalLessons: number
  completedLessons: number
  reflectionsSubmitted: number
  totalFinalQuizzes: number
  passedFinalQuizzes: number
}

type CertificateClaimCardProps = {
  courseId: number
  existingCertificateId: number | null
  requirements: CertificateRequirements
  eligible: boolean
}

type ClaimResponse = {
  ok: boolean
  message: string
  certificateId?: number
  requirements?: CertificateRequirements
}

export default function CertificateClaimCard({
  courseId,
  existingCertificateId,
  requirements,
  eligible,
}: CertificateClaimCardProps) {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  async function claimCertificate() {
    setLoading(true)
    setMessage('')
    setErrorMessage('')

    const response = await fetch('/api/certificates/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courseId,
      }),
    })

    const data = (await response.json()) as ClaimResponse & { error?: string }

    if (!response.ok || !data.ok) {
      setErrorMessage(data.error || data.message || 'Certificate not ready yet.')
      setLoading(false)
      return
    }

    setMessage(data.message || 'Certificate issued.')

    if (data.certificateId) {
      router.push(`/certificates/${data.certificateId}`)
      router.refresh()
      return
    }

    setLoading(false)
  }

  if (existingCertificateId) {
    return (
      <Link
        href={`/certificates/${existingCertificateId}`}
        className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
      >
        View certificate
      </Link>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={claimCertificate}
        disabled={loading || !eligible}
        className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? 'Checking...' : 'Claim certificate'}
      </button>

      {!eligible && (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Certificate not ready yet</p>

          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Lessons completed: {requirements.completedLessons}/
              {requirements.totalLessons}
            </li>
            <li>
              Reflections submitted: {requirements.reflectionsSubmitted}/
              {requirements.totalLessons}
            </li>
            <li>
              Final quizzes passed: {requirements.passedFinalQuizzes}/
              {requirements.totalFinalQuizzes}
            </li>
          </ul>
        </div>
      )}

      {message && (
        <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}
    </div>
  )
}