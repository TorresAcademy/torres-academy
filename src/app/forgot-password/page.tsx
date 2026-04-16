'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setErrorMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setErrorMessage(error.message)
    } else {
      setMessage('Password reset email sent. Check your inbox.')
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Torres Academy
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Forgot password
        </h1>
        <p className="mt-2 text-slate-600">
          Enter your email and we’ll send you a password reset link.
        </p>

        <form onSubmit={handleResetRequest} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        {message && (
          <p className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </p>
        )}

        {errorMessage && (
          <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <div className="mt-6">
          <Link href="/login" className="text-sm font-medium text-blue-600 underline">
            ← Back to login
          </Link>
        </div>
      </div>
    </main>
  )
}