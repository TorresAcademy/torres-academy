'use client'

import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Sparkles,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function isSafeNextPath(value: string | null) {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'))
}

function PortalCard({
  title,
  description,
  icon,
  tone = 'blue',
}: {
  title: string
  description: string
  icon: React.ReactNode
  tone?: 'blue' | 'amber' | 'emerald' | 'slate'
}) {
  const tones = {
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-800',
    emerald: 'bg-emerald-100 text-emerald-700',
    slate: 'bg-slate-900 text-amber-300',
  } as const

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>
        {icon}
      </div>
      <p className="mt-4 text-xl font-extrabold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
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
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error(error)
      return '/dashboard'
    }

    if (safeNext && safeNext !== '/dashboard') {
      return safeNext
    }

    if (profile?.role === 'admin') {
      return '/admin'
    }

    if (profile?.role === 'teacher') {
      return '/teacher'
    }

    if (profile?.role === 'parent') {
      return '/parent'
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
        guardian_email: cleanEmail,
      })

      router.push('/dashboard')
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe_0,_#f8fafc_35%,_#f8fafc_100%)] text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-[1.05fr_470px]">
        <section>
          <Link href="/" className="text-2xl font-extrabold tracking-tight text-slate-900">
            Flex <span className="text-blue-600">Scholar</span>
          </Link>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm">
            <Sparkles className="h-4 w-4" />
            One academy · Four secure workspaces
          </div>

          <p className="mt-8 text-sm font-black uppercase tracking-[0.22em] text-blue-700">
            Academy Portal
          </p>

          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
            Continue your academic progress with Flex Scholar.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            One secure portal for expert-guided learning, teacher feedback,
            portfolio evidence, parent reports, and academy management.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <PortalCard
              title="Student Portfolio"
              description="Complete lessons, submit evidence, track feedback, and build your learning portfolio."
              icon={<BookOpen className="h-5 w-5" />}
              tone="blue"
            />

            <PortalCard
              title="Teacher Hub"
              description="Manage lessons, review submissions, give rubric feedback, and monitor progress."
              icon={<GraduationCap className="h-5 w-5" />}
              tone="amber"
            />

            <PortalCard
              title="Parent Report"
              description="View linked student progress, evidence, teacher feedback, and certificates."
              icon={<Users className="h-5 w-5" />}
              tone="emerald"
            />

          </div>

          <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-extrabold text-slate-950">
                  Built for expert teaching and meaningful feedback
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Students, teachers, parents, and admins are redirected to the
                  correct workspace after login based on their account role.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2.2rem] border border-slate-200 bg-white p-8 shadow-xl">
          <div className="flex rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setMessage('')
                setErrorMessage('')
              }}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${
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
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${
                mode === 'register'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-blue-600'
              }`}
            >
              Register
            </button>
          </div>

          <div className="mt-8">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-700">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-950">
              {mode === 'login'
                ? 'Sign in to Flex Scholar'
                : 'Join Flex Scholar'}
            </h2>

            <p className="mt-3 leading-7 text-slate-600">
              {mode === 'login'
                ? 'Use your academy account to continue learning, teaching, reviewing, or supporting a linked student.'
                : 'Create a student account to start learning. Parent and teacher access can be connected by the academy administrator.'}
            </p>
          </div>

          <form
            onSubmit={mode === 'login' ? handlePasswordLogin : handleRegister}
            className="mt-6 space-y-5"
          >
            {mode === 'register' && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Full name
                </label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              {mode === 'register' && (
                <p className="mt-2 text-xs text-slate-500">
                  Minimum 6 characters. Student accounts can later be connected
                  to guardian reports by an admin.
                </p>
              )}
            </div>

            {message && (
              <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </p>
            )}

            {errorMessage && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Login'
                  : 'Create account'}

              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          {mode === 'login' && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  or
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={handleMagicLink}
                disabled={magicLoading}
                className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-900 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-60"
              >
                {magicLoading ? 'Sending...' : 'Send magic link'}
              </button>

              <div className="mt-5 text-center">
                <Link
                  href="/forgot-password"
                  className="text-sm font-bold text-blue-600 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
            </>
          )}

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-slate-700">
            <div className="flex items-start gap-3">
              <BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <p>
                Parent, guardian, or teacher access must be connected by the
                academy administrator. New public accounts start as students.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === 'login'
              ? 'New to Flex Scholar? '
              : 'Already have an account? '}

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setMessage('')
                setErrorMessage('')
              }}
              className="font-bold text-blue-600 hover:underline"
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
