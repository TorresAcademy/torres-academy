'use client'

import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function isSafeNextPath(value: string | null) {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'))
}

function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const next = searchParams.get('next')
  const safeNext = isSafeNextPath(next) ? next : null

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  async function getTargetPath(userId: string) {
    if (safeNext) {
      return safeNext
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error(error)
      return '/dashboard'
    }

    if (profile?.role === 'admin') {
      return '/admin'
    }

    if (profile?.role === 'teacher') {
      return '/teacher'
    }

    return '/dashboard'
  }

  async function handlePasswordLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setLoading(true)
    setMessage('')
    setErrorMessage('')

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail || !password) {
      setErrorMessage('Email and password are required.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setErrorMessage('Could not sign in. Please try again.')
      setLoading(false)
      return
    }

    const targetPath = await getTargetPath(data.user.id)

    router.push(targetPath)
    router.refresh()
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setLoading(true)
    setMessage('')
    setErrorMessage('')

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = fullName.trim()

    if (!cleanEmail || !password) {
      setErrorMessage('Email and password are required.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    const origin = window.location.origin

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(
          safeNext || '/dashboard'
        )}`,
        data: {
          full_name: cleanName,
        },
      },
    })

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    if (data.session && data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: cleanEmail,
        full_name: cleanName || null,
        role: 'student',
      })

      const targetPath = await getTargetPath(data.user.id)

      router.push(targetPath)
      router.refresh()
      return
    }

    setMessage(
      'Account created. Please check your email and confirm your account before logging in.'
    )
    setLoading(false)
  }

  async function handleMagicLink() {
    setMagicLoading(true)
    setMessage('')
    setErrorMessage('')

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail) {
      setErrorMessage('Enter your email first.')
      setMagicLoading(false)
      return
    }

    const origin = window.location.origin

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(
          safeNext || '/dashboard'
        )}`,
      },
    })

    if (error) {
      setErrorMessage(error.message)
      setMagicLoading(false)
      return
    }

    setMessage('Magic link sent. Please check your email.')
    setMagicLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-10 md:grid-cols-[1fr_460px]">
        <section>
          <Link href="/" className="text-2xl font-bold text-slate-900">
            Torres <span className="text-blue-600">Academy</span>
          </Link>

          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Student Portal
          </p>

          <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Sign in and continue your learning.
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Access your dashboard, courses, lessons, quizzes, notes, reflections,
            and teacher feedback from one place.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-2xl font-bold text-blue-600">Learn</p>
              <p className="mt-2 text-sm text-slate-600">
                Continue lessons and track progress.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-2xl font-bold text-blue-600">Reflect</p>
              <p className="mt-2 text-sm text-slate-600">
                Save notes and metacognition.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-2xl font-bold text-blue-600">Improve</p>
              <p className="mt-2 text-sm text-slate-600">
                Request teacher feedback.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setMessage('')
                setErrorMessage('')
              }}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                mode === 'login'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-blue-600'
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('register')
                setMessage('')
                setErrorMessage('')
              }}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                mode === 'register'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-blue-600'
              }`}
            >
              Register
            </button>
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </p>

            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              {mode === 'login' ? 'Login to your portal' : 'Join Torres Academy'}
            </h2>

            <p className="mt-2 text-slate-600">
              {mode === 'login'
                ? 'Use your email and password to continue.'
                : 'New accounts start as students. Admin can promote teachers later.'}
            </p>
          </div>

          <form
            onSubmit={mode === 'login' ? handlePasswordLogin : handleRegister}
            className="mt-6 space-y-5"
          >
            {mode === 'register' && (
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />

              {mode === 'register' && (
                <p className="mt-2 text-xs text-slate-500">
                  Minimum 6 characters.
                </p>
              )}
            </div>

            {message && (
              <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </p>
            )}

            {errorMessage && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Login'
                  : 'Create account'}
            </button>
          </form>

          {mode === 'login' && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                  or
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={handleMagicLink}
                disabled={magicLoading}
                className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-60"
              >
                {magicLoading ? 'Sending...' : 'Send magic link'}
              </button>

              <div className="mt-5 text-center">
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-blue-600 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
            </>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === 'login'
              ? 'New to Torres Academy? '
              : 'Already have an account? '}

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setMessage('')
                setErrorMessage('')
              }}
              className="font-semibold text-blue-600 hover:underline"
            >
              {mode === 'login' ? 'Create an account' : 'Login here'}
            </button>
          </p>
        </section>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="font-semibold text-slate-900">Loading login...</p>
          </div>
        </main>
      }
    >
      <LoginPageInner />
    </Suspense>
  )
}