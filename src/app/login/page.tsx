'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')
  const next = nextParam && nextParam.startsWith('/') ? nextParam : null

  const supabase = createClient()

  const [mode, setMode] = useState<Mode>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)

  async function ensureProfile(userId: string, name?: string) {
    const normalizedEmail = email.trim().toLowerCase()

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle()

    if (existingProfile) {
      const updatePayload: {
        email: string
        full_name?: string
      } = {
        email: normalizedEmail,
      }

      if (name && name.trim()) {
        updatePayload.full_name = name.trim()
      }

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)

      if (error) throw error
      return existingProfile.role
    }

    const insertPayload: {
      id: string
      role: string
      email: string
      full_name?: string
    } = {
      id: userId,
      role: 'student',
      email: normalizedEmail,
    }

    if (name && name.trim()) {
      insertPayload.full_name = name.trim()
    }

    const { error } = await supabase.from('profiles').insert(insertPayload)

    if (error) throw error

    return 'student'
  }

  async function getTargetPath(userId: string) {
    if (next) return next

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
        await ensureProfile(data.user.id)
      } catch (profileError) {
        console.error(profileError)
      }

      const targetPath = await getTargetPath(data.user.id)
      router.push(targetPath)
      router.refresh()
    }

    setLoading(false)
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setErrorMessage('')

    const redirectTarget = next || '/dashboard'

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(redirectTarget)}`,
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
        await ensureProfile(data.user.id, fullName)
      } catch (profileError) {
        console.error(profileError)
      }

      const targetPath = await getTargetPath(data.user.id)
      router.push(targetPath)
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

    const redirectTarget = next || '/dashboard'

    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(redirectTarget)}`,
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

          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-blue-600 underline"
            >
              Forgot password?
            </Link>
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