'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)

  async function upsertProfile(userId: string, name?: string) {
    const payload: {
      id: string
      role: string
      full_name?: string
    } = {
      id: userId,
      role: 'student',
    }

    if (name && name.trim()) {
      payload.full_name = name.trim()
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })

    if (error) {
      throw error
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setErrorMessage('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      try {
        await upsertProfile(data.user.id)
      } catch (profileError) {
        console.error(profileError)
      }
    }

    router.push('/dashboard')
    router.refresh()
    setLoading(false)
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setErrorMessage('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/dashboard`,
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    if (data.session && data.user) {
      try {
        await upsertProfile(data.user.id, fullName)
      } catch (profileError) {
        console.error(profileError)
      }

      router.push('/dashboard')
      router.refresh()
      setLoading(false)
      return
    }

    setMessage('Account created. Check your email to confirm your signup.')
    setLoading(false)
  }

  async function handleMagicLink() {
    setMagicLoading(true)
    setMessage('')
    setErrorMessage('')

    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/dashboard`,
      },
    })

    if (error) {
      setErrorMessage(error.message)
    } else {
      setMessage('Check your email for the magic link.')
    }

    setMagicLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Torres Academy
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {mode === 'signin' ? 'Sign in' : 'Create your account'}
          </h1>
          <p className="mt-2 text-slate-600">
            {mode === 'signin'
              ? 'Access your student dashboard with your email and password.'
              : 'Register to start your free training and courses.'}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('signin')
              setMessage('')
              setErrorMessage('')
            }}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              mode === 'signin'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signup')
              setMessage('')
              setErrorMessage('')
            }}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              mode === 'signup'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            Register
          </button>
        </div>

        <form
          onSubmit={mode === 'signin' ? handleSignIn : handleSignUp}
          className="space-y-4"
        >
          {mode === 'signup' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>
          )}

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

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading
              ? 'Please wait...'
              : mode === 'signin'
              ? 'Sign in'
              : 'Create account'}
          </button>
        </form>

        <div className="my-6 h-px bg-slate-200" />

        <div>
          <p className="mb-3 text-sm font-medium text-slate-700">
            Prefer magic link?
          </p>
          <button
            type="button"
            onClick={handleMagicLink}
            disabled={!email || magicLoading}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-60"
          >
            {magicLoading ? 'Sending...' : 'Send magic link'}
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Use this only as a backup. It still depends on email sending.
          </p>
        </div>

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
      </div>
    </main>
  )
}